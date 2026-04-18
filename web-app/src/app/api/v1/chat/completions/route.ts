import { NextRequest } from 'next/server'
import { addTaskToQueue, readStreamChunks, getTaskResult } from '@/lib/taskQueue'

/**
 * OpenAI-compatible Chat Completions API
 *
 * POST /api/v1/chat/completions
 *
 * Drop-in replacement for https://api.openai.com/v1/chat/completions
 * Developers can use any OpenAI SDK by changing base_url to https://airazum.com/api/v1
 *
 * Supports:
 * - stream: true/false
 * - model: 'qwen3.5-9b' | 'deepseek-r1-7b'
 * - messages: [{role, content}]
 * - max_tokens, temperature (passed through)
 *
 * Auth: Bearer token (API key from /account) or X-API-Key header
 */

const MODEL_MAP: Record<string, string> = {
  'qwen3.5-9b': process.env.MODEL_QWEN || 'qwen3.5:9b',
  'deepseek-r1-7b': process.env.MODEL_DEEPSEEK || 'deepseek-r1:7b',
  // Aliases for convenience
  'qwen': process.env.MODEL_QWEN || 'qwen3.5:9b',
  'deepseek': process.env.MODEL_DEEPSEEK || 'deepseek-r1:7b',
}

const AVAILABLE_MODELS = [
  { id: 'qwen3.5-9b', object: 'model', created: 1713400000, owned_by: 'razum' },
  { id: 'deepseek-r1-7b', object: 'model', created: 1713400000, owned_by: 'razum' },
]

// Validate API key and return user info
async function authenticateRequest(req: NextRequest): Promise<{ userId: string; plan: string } | null> {
  // Check Bearer token
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const key = authHeader.slice(7)
    return validateApiKey(key)
  }
  // Check X-API-Key
  const xApiKey = req.headers.get('x-api-key')
  if (xApiKey) {
    return validateApiKey(xApiKey)
  }
  return null
}

function validateApiKey(key: string): { userId: string; plan: string } | null {
  const { getDB, getMinerByApiKey } = require('@/lib/db')
  const db = getDB()

  // Check user API keys (rzm_api_ prefix)
  if (key.startsWith('rzm_api_')) {
    const row = db.prepare(
      'SELECT id, plan FROM users WHERE apiKey = ?'
    ).get(key) as any
    if (row) return { userId: row.id, plan: row.plan || 'free' }
  }

  // Also accept miner API keys for testing
  if (key.startsWith('rzm_')) {
    const miner = getMinerByApiKey(key)
    if (miner) return { userId: `miner:${miner.id}`, plan: 'pro' }
  }

  return null
}

// Rate limit per user
const rateLimits = new Map<string, { count: number; resetAt: number }>()
const PLAN_LIMITS: Record<string, number> = {
  free: 30,
  start: 500,
  basic: 2000,
  pro: 99999,
}

function checkApiRateLimit(userId: string, plan: string): boolean {
  const now = Date.now()
  const dayMs = 24 * 60 * 60 * 1000
  const entry = rateLimits.get(userId)

  if (!entry || now > entry.resetAt) {
    rateLimits.set(userId, { count: 1, resetAt: now + dayMs })
    return true
  }

  const limit = PLAN_LIMITS[plan] || PLAN_LIMITS.free
  if (entry.count >= limit) return false

  entry.count++
  return true
}

function cleanChunk(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .replace(/[\u2580-\u259F\u2588]/g, '')
    .replace(/[\u3000-\u9FFF\uF900-\uFAFF\u3400-\u4DBF\uAC00-\uD7AF\u3040-\u30FF]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    // Auth
    const auth = await authenticateRequest(req)
    if (!auth) {
      return json({
        error: {
          message: 'Invalid API key. Get yours at https://airazum.com/account',
          type: 'authentication_error',
          code: 'invalid_api_key',
        }
      }, 401)
    }

    // Rate limit
    if (!checkApiRateLimit(auth.userId, auth.plan)) {
      return json({
        error: {
          message: 'Rate limit exceeded. Upgrade your plan at https://airazum.com/pricing',
          type: 'rate_limit_error',
          code: 'rate_limit_exceeded',
        }
      }, 429)
    }

    const body = await req.json()
    const {
      model = 'qwen3.5-9b',
      messages,
      stream = false,
      max_tokens,
      temperature,
    } = body

    // Validate messages
    if (!Array.isArray(messages) || messages.length === 0) {
      return json({
        error: {
          message: "'messages' is a required field and must be a non-empty array",
          type: 'invalid_request_error',
          code: 'invalid_messages',
        }
      }, 400)
    }

    // Resolve model
    const actualModel = MODEL_MAP[model]
    if (!actualModel) {
      return json({
        error: {
          message: `Model '${model}' not found. Available: ${Object.keys(MODEL_MAP).join(', ')}`,
          type: 'invalid_request_error',
          code: 'model_not_found',
        }
      }, 400)
    }

    // Sanitize messages
    const sanitizedMessages = messages.slice(-50).map((m: any) => ({
      role: ['system', 'user', 'assistant'].includes(m.role) ? m.role : 'user',
      content: typeof m.content === 'string' ? m.content.slice(0, 8000) : '',
    }))

    // Add system prompt if not provided
    const hasSystem = sanitizedMessages.some((m: any) => m.role === 'system')
    if (!hasSystem) {
      sanitizedMessages.unshift({
        role: 'system',
        content: 'You are Razum AI, a helpful assistant. Respond in the user\'s language. Be concise.',
      })
    }

    const lastUserMsg = [...sanitizedMessages].reverse().find((m: any) => m.role === 'user')
    const prompt = lastUserMsg?.content || ''

    // Queue task
    const { taskId, promise: taskPromise } = addTaskToQueue({
      model: actualModel,
      prompt,
      messages: sanitizedMessages,
    })

    const requestId = `chatcmpl-${taskId.slice(0, 20)}`

    console.log(`[API/v1] ${auth.userId.slice(0, 8)} model=${model} stream=${stream} len=${prompt.length}`)

    // === NON-STREAMING ===
    if (!stream) {
      let result: any = null
      let error: any = null

      try {
        result = await Promise.race([
          taskPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 120_000)),
        ])
      } catch (e: any) {
        error = e
      }

      if (error || !result?.result) {
        return json({
          error: {
            message: 'Model did not respond in time. Try again.',
            type: 'server_error',
            code: 'timeout',
          }
        }, 503)
      }

      const content = cleanChunk(result.result)
      const tokens = result.tokensUsed || Math.ceil(content.length / 4)
      const promptTokens = Math.ceil(prompt.length / 4)

      return json({
        id: requestId,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [{
          index: 0,
          message: { role: 'assistant', content },
          finish_reason: 'stop',
        }],
        usage: {
          prompt_tokens: promptTokens,
          completion_tokens: tokens,
          total_tokens: promptTokens + tokens,
        },
      }, 200)
    }

    // === STREAMING ===
    const enc = new TextEncoder()
    let taskCompleted = false
    let taskError: any = null

    taskPromise
      .then(() => { taskCompleted = true })
      .catch((e: any) => { taskError = e; taskCompleted = true })

    const sseStream = new ReadableStream({
      async start(controller) {
        let closed = false
        const safeEnqueue = (data: Uint8Array) => {
          if (closed) return
          try { controller.enqueue(data) } catch { closed = true }
        }
        const safeClose = () => {
          if (closed) return
          try { controller.close() } catch {}
          closed = true
        }

        const sendChunk = (content: string, finishReason: string | null = null) => {
          const chunk = {
            id: requestId,
            object: 'chat.completion.chunk',
            created: Math.floor(Date.now() / 1000),
            model,
            choices: [{
              index: 0,
              delta: content ? { content } : {},
              finish_reason: finishReason,
            }],
          }
          safeEnqueue(enc.encode(`data: ${JSON.stringify(chunk)}\n\n`))
        }

        try {
          let nextChunkIdx = 0
          let inThinkBlock = false
          let streamedText = ''
          const MAX_WAIT = 120_000
          const waitStart = Date.now()

          while (!taskCompleted && !closed) {
            if (Date.now() - waitStart > MAX_WAIT) break

            const s = readStreamChunks(taskId, nextChunkIdx)
            if (s && s.chunks.length > 0) {
              for (const raw of s.chunks) {
                // Filter <think> blocks
                let buf = raw
                let out = ''
                while (buf.length > 0) {
                  if (inThinkBlock) {
                    const end = buf.indexOf('</think>')
                    if (end === -1) { buf = ''; break }
                    buf = buf.slice(end + '</think>'.length)
                    inThinkBlock = false
                  } else {
                    const start = buf.indexOf('<think>')
                    if (start === -1) { out += buf; buf = ''; break }
                    out += buf.slice(0, start)
                    buf = buf.slice(start + '<think>'.length)
                    inThinkBlock = true
                  }
                }
                const cleaned = out.replace(/[\u3000-\u9FFF\uF900-\uFAFF\u3400-\u4DBF\uAC00-\uD7AF\u3040-\u30FF]/g, '').replace(/  +/g, ' ')
                if (cleaned) {
                  sendChunk(cleaned)
                  streamedText += cleaned
                }
              }
              nextChunkIdx += s.chunks.length
            } else {
              await new Promise(r => setTimeout(r, 40))
            }
          }

          // Final chunk with remaining content
          const finalResult = getTaskResult(taskId)
          if (finalResult?.result) {
            const fullClean = cleanChunk(finalResult.result)
            if (fullClean.length > streamedText.length && fullClean.startsWith(streamedText)) {
              sendChunk(fullClean.slice(streamedText.length))
            } else if (streamedText.length === 0 && fullClean) {
              sendChunk(fullClean)
            }
          }

          // Send finish
          sendChunk('', 'stop')
          safeEnqueue(enc.encode('data: [DONE]\n\n'))
          safeClose()

        } catch (e) {
          console.error('[API/v1] Stream error:', e)
          safeEnqueue(enc.encode('data: [DONE]\n\n'))
          safeClose()
        }
      },
    })

    return new Response(sseStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })

  } catch (err) {
    console.error('[API/v1] Fatal:', err)
    return json({
      error: {
        message: 'Internal server error',
        type: 'server_error',
        code: 'internal_error',
      }
    }, 500)
  }
}

// GET /api/v1/chat/completions — not supported, return helpful error
export async function GET() {
  return json({
    error: {
      message: 'Use POST method. See docs at https://airazum.com/api/docs',
      type: 'invalid_request_error',
    }
  }, 405)
}

function json(body: any, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
