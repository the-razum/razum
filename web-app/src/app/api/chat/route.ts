import { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { checkAndIncrementRequests, checkAnonLimit } from '@/lib/db'
import { searchWeb, needsSearch } from '@/lib/search'
import { getClientIP } from '@/lib/rateLimit'
import { addTaskToQueue, getQueueStats, readStreamChunks } from '@/lib/taskQueue'

const MAX_REQUEST_SIZE = 100 * 1024
const MAX_MESSAGES = 50

// Map UI model id → real Ollama model name (must match what miners advertise)
const MODEL_MAP: Record<string, string> = {
  'deepseek-r1-14b': process.env.MODEL_DEEPSEEK || 'deepseek-r1:14b',
  'mistral-7b':      process.env.MODEL_MISTRAL  || 'mistral:7b',
}

// Strip <think> reasoning and CJK artifacts from DeepSeek R1 output
function cleanChunk(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .replace(/[\u4e00-\u9fff\u3400-\u4dbf\u3000-\u303f\uff00-\uffef]+/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    const contentLength = parseInt(req.headers.get('content-length') || '0')
    if (contentLength > MAX_REQUEST_SIZE) {
      return json({ error: 'Запрос слишком большой' }, 413)
    }

    const body = await req.json()
    const { messages, model, webSearch } = body

    if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
      return json({ error: 'Некорректный запрос' }, 400)
    }

    // Rate limiting
    const token = req.cookies.get('razum_token')?.value
    const userId = token ? verifyToken(token) : null

    if (userId) {
      const { allowed, limit } = checkAndIncrementRequests(userId)
      if (!allowed) {
        return json({ error: `Лимит исчерпан (${limit} запросов/день). Обновите тариф.`, upgrade: true }, 429)
      }
    } else {
      const ip = getClientIP(req)
      const { allowed } = checkAnonLimit(ip)
      if (!allowed) {
        return json({ error: 'Лимит для гостей исчерпан (10/день). Зарегистрируйтесь для 30/день.', register: true }, 429)
      }
    }

    const actualModel = MODEL_MAP[model] || MODEL_MAP['deepseek-r1-14b']

    const lastUserMsg = [...messages].reverse().find((m: { role: string }) => m.role === 'user')
    const userQuery = lastUserMsg?.content || ''

    const sanitizedMessages = messages.slice(-MAX_MESSAGES).map((m: { role: string; content: string }) => ({
      role: m.role === 'user' || m.role === 'assistant' ? m.role : 'user',
      content: typeof m.content === 'string' ? m.content.slice(0, 8000) : '',
    }))

    // System prompt for all queries
    const systemMsg = {
      role: 'system',
      content: 'Ты — Razum AI, дружелюбный и полезный AI-ассистент. Отвечай на языке пользователя, естественно и по делу.',
    }

    const shouldSearch = webSearch !== false && needsSearch(userQuery)
    let augmentedMessages = [systemMsg, ...sanitizedMessages]
    if (shouldSearch) {
      const searchResults = await searchWeb(userQuery.slice(0, 200))
      augmentedMessages = [{
        role: 'system',
        content: `Ты — Razum AI. Ниже свежие результаты поиска. Используй их в ответе.\n\nРЕЗУЛЬТАТЫ ПОИСКА (${new Date().toLocaleDateString('ru-RU')}):\n${searchResults}\n\nОтвечай на языке пользователя.`,
      }, ...sanitizedMessages]
    }

    const stats = getQueueStats()
    console.log(`[Chat] model=${actualModel} search=${shouldSearch} user=${userId || 'anon'} queue=${stats.pending}/${stats.total} q="${userQuery.slice(0, 60)}"`)

    // Add task to queue — get taskId + promise
    const { taskId, promise: taskPromise } = addTaskToQueue({
      model: actualModel,
      prompt: userQuery,
      messages: augmentedMessages,
    })

    // Track task completion
    let taskCompleted = false
    let minerResult: any = null
    let taskError: any = null

    taskPromise
      .then(r => { minerResult = r; taskCompleted = true })
      .catch(e => { taskError = e; taskCompleted = true })

    const enc = new TextEncoder()

    // Create SSE stream that forwards chunks from miner in real-time
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let insideThink = false
          let chunkIndex = 0

          console.log(`[Chat] Streaming task ${taskId.slice(0, 8)}...`)

          // Poll for chunks until task is done
          while (!taskCompleted) {
            const data = readStreamChunks(taskId, chunkIndex)
            if (data && data.chunks.length > 0) {
              for (const chunk of data.chunks) {
                const cleaned = cleanStreamChunk(chunk, insideThink)
                insideThink = cleaned.insideThink
                if (cleaned.text) {
                  const payload = {
                    choices: [{ delta: { content: cleaned.text }, index: 0, finish_reason: null }],
                  }
                  controller.enqueue(enc.encode(`data: ${JSON.stringify(payload)}\n\n`))
                }
              }
              chunkIndex += data.chunks.length
              if (data.done) break
            }
            await new Promise(r => setTimeout(r, 80)) // poll every 80ms
          }

          // Drain any remaining chunks after completion
          const remaining = readStreamChunks(taskId, chunkIndex)
          if (remaining && remaining.chunks.length > 0) {
            for (const chunk of remaining.chunks) {
              const cleaned = cleanStreamChunk(chunk, insideThink)
              insideThink = cleaned.insideThink
              if (cleaned.text) {
                const payload = {
                  choices: [{ delta: { content: cleaned.text }, index: 0, finish_reason: null }],
                }
                controller.enqueue(enc.encode(`data: ${JSON.stringify(payload)}\n\n`))
              }
            }
          }

          // Fallback: if no streaming chunks arrived, use full result as fake-stream
          if (chunkIndex === 0 && minerResult && minerResult.result) {
            const text = cleanChunk(minerResult.result)
            const sz = 40
            for (let i = 0; i < text.length; i += sz) {
              const piece = text.slice(i, i + sz)
              const payload = {
                choices: [{ delta: { content: piece }, index: 0, finish_reason: null }],
              }
              controller.enqueue(enc.encode(`data: ${JSON.stringify(payload)}\n\n`))
            }
          }

          // Error fallback
          if (taskError && chunkIndex === 0 && !minerResult) {
            const errMsg = taskError.message || 'Нет доступных майнеров'
            const errPayload = {
              choices: [{ delta: { content: `Ошибка: ${errMsg}` }, index: 0, finish_reason: null }],
            }
            controller.enqueue(enc.encode(`data: ${JSON.stringify(errPayload)}\n\n`))
          }

          controller.enqueue(enc.encode(`data: [DONE]\n\n`))
          controller.close()

          const minerId = minerResult?.minerId || 'unknown'
          console.log(`[Chat] Done in ${Date.now() - startTime}ms via miner=${typeof minerId === 'string' ? minerId.slice(0, 8) : minerId} tokens=${minerResult?.tokensUsed || 0}`)
        } catch (e) {
          console.error('[Chat] Stream error:', e)
          try {
            controller.enqueue(enc.encode(`data: [DONE]\n\n`))
            controller.close()
          } catch {}
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Search-Used': shouldSearch ? 'true' : 'false',
      },
    })
  } catch (err) {
    console.error('[Chat] Fatal:', err)
    return json({ error: 'Сервер временно недоступен' }, 503)
  }
}

// Clean a streaming chunk, handling <think> blocks that may span multiple chunks
function cleanStreamChunk(chunk: string, insideThink: boolean): { text: string; insideThink: boolean } {
  let text = chunk
  let stillInThink = insideThink

  if (stillInThink) {
    const endIdx = text.indexOf('</think>')
    if (endIdx !== -1) {
      text = text.slice(endIdx + 8)
      stillInThink = false
    } else {
      return { text: '', insideThink: true }
    }
  }

  // Check for new <think> block start
  const startIdx = text.indexOf('<think>')
  if (startIdx !== -1) {
    const endIdx = text.indexOf('</think>', startIdx)
    if (endIdx !== -1) {
      text = text.slice(0, startIdx) + text.slice(endIdx + 8)
    } else {
      text = text.slice(0, startIdx)
      stillInThink = true
    }
  }

  // Strip CJK characters
  text = text.replace(/[\u4e00-\u9fff\u3400-\u4dbf\u3000-\u303f\uff00-\uffef]+/g, '')

  return { text, insideThink: stillInThink }
}

function json(body: any, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
