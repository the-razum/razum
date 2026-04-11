import { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { checkAndIncrementRequests, checkAnonLimit, createChat, addChatMessage, getChatById, updateChatTitle } from '@/lib/db'
import { searchWeb, needsSearch } from '@/lib/search'
import { getClientIP } from '@/lib/rateLimit'
import { addTaskToQueue, getQueueStats, readStreamChunks, getTaskResult } from '@/lib/taskQueue'

const MAX_REQUEST_SIZE = 100 * 1024
const MAX_MESSAGES = 50

// Map UI model id → real Ollama model name (must match what miners advertise)
const MODEL_MAP: Record<string, string> = {
  'deepseek-r1-14b': process.env.MODEL_DEEPSEEK || 'deepseek-r1:14b',
  'deepseek-r1-7b':  process.env.MODEL_DEEPSEEK_7B || 'deepseek-r1:7b',
  'mistral-7b':      process.env.MODEL_MISTRAL  || 'mistral:7b',
}

// Strip <think> reasoning from DeepSeek R1 output
function cleanChunk(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/g, '')
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
    const { messages, model, webSearch, chatId: reqChatId } = body

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

    const actualModel = MODEL_MAP[model] || MODEL_MAP['mistral-7b']

    const lastUserMsg = [...messages].reverse().find((m: { role: string }) => m.role === 'user')
    const userQuery = lastUserMsg?.content || ''

    const sanitizedMessages = messages.slice(-MAX_MESSAGES).map((m: { role: string; content: string }) => ({
      role: m.role === 'user' || m.role === 'assistant' ? m.role : 'user',
      content: typeof m.content === 'string' ? m.content.slice(0, 8000) : '',
    }))

    // System prompt for all queries
    const systemMsg = {
      role: 'system',
      content: 'You are Razum AI, a friendly and helpful assistant. CRITICAL RULES: 1) Always respond in the SAME language the user writes in. If the user writes in Russian, respond in Russian. If in English, respond in English. 2) NEVER output Chinese characters, Japanese characters, or any CJK symbols. 3) NEVER use <think> tags in your visible response. 4) Be concise, natural, and helpful.',
    }

    const shouldSearch = webSearch !== false && needsSearch(userQuery)
    let augmentedMessages = [systemMsg, ...sanitizedMessages]
    if (shouldSearch) {
      const searchResults = await searchWeb(userQuery.slice(0, 200))
      augmentedMessages = [{
        role: 'system',
        content: `You are Razum AI. Below are fresh search results — use them in your answer.\n\nSEARCH RESULTS (${new Date().toLocaleDateString('ru-RU')}):\n${searchResults}\n\nCRITICAL: Respond in the SAME language as the user. NEVER use Chinese/CJK characters. Be concise and helpful.`,
      }, ...sanitizedMessages]
    }

    // Create or retrieve chat for logged-in users
    let chatId = reqChatId || null
    if (userId && !chatId) {
      // Create new chat with first user message as title
      const title = userQuery.slice(0, 80) || 'Новый чат'
      const chat = createChat(userId, title, model || 'mistral-7b')
      chatId = chat.id
    }
    // Save user message
    if (userId && chatId) {
      addChatMessage(chatId, 'user', userQuery)
    }

    const stats = getQueueStats()
    console.log(`[Chat] model=${actualModel} search=${shouldSearch} user=${userId || 'anon'} queue=${stats.pending}/${stats.total} chat=${chatId?.slice(0, 8) || 'none'} q="${userQuery.slice(0, 60)}"`)

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
        let closed = false

        function safeEnqueue(data: Uint8Array) {
          if (closed) return
          try { controller.enqueue(data) } catch { closed = true }
        }

        function safeClose() {
          if (closed) return
          try { controller.close() } catch {}
          closed = true
        }

        try {
          let insideThink = false
          let chunkIndex = 0
          let keepaliveCount = 0

          console.log(`[Chat] Streaming task ${taskId.slice(0, 8)}...`)

          // Poll for chunks until task is done
          while (!taskCompleted && !closed) {
            const data = readStreamChunks(taskId, chunkIndex)
            if (data) {
              if (data.chunks.length > 0) {
                keepaliveCount = 0 // reset keepalive counter on real data
                for (const chunk of data.chunks) {
                  const cleaned = cleanStreamChunk(chunk, insideThink)
                  insideThink = cleaned.insideThink
                  if (cleaned.text) {
                    const payload = {
                      choices: [{ delta: { content: cleaned.text }, index: 0, finish_reason: null }],
                    }
                    safeEnqueue(enc.encode(`data: ${JSON.stringify(payload)}\n\n`))
                  }
                }
                chunkIndex += data.chunks.length
              }
              // Check done OUTSIDE chunks check — miner may complete without streaming
              if (data.done) break
            }

            // Send SSE keepalive comment every ~5s to prevent nginx/browser timeout
            keepaliveCount++
            if (keepaliveCount % 62 === 0) { // 62 * 80ms ≈ 5s
              safeEnqueue(enc.encode(`: keepalive\n\n`))
            }

            await new Promise(r => setTimeout(r, 80)) // poll every 80ms
          }

          // Drain any remaining chunks after completion
          if (!closed) {
            const remaining = readStreamChunks(taskId, chunkIndex)
            if (remaining && remaining.chunks.length > 0) {
              for (const chunk of remaining.chunks) {
                const cleaned = cleanStreamChunk(chunk, insideThink)
                insideThink = cleaned.insideThink
                if (cleaned.text) {
                  const payload = {
                    choices: [{ delta: { content: cleaned.text }, index: 0, finish_reason: null }],
                  }
                  safeEnqueue(enc.encode(`data: ${JSON.stringify(payload)}\n\n`))
                }
              }
              chunkIndex += remaining.chunks.length
            }
          }

          // Fallback: if no streaming chunks arrived, use full result as fake-stream
          // Try in-process minerResult first, then file-based result (cross-module)
          const fileResult = !minerResult ? getTaskResult(taskId) : null
          const finalResult = minerResult || fileResult
          if (!closed && chunkIndex === 0 && finalResult && finalResult.result) {
            const text = cleanChunk(finalResult.result)
            const sz = 40
            for (let i = 0; i < text.length; i += sz) {
              const piece = text.slice(i, i + sz)
              const payload = {
                choices: [{ delta: { content: piece }, index: 0, finish_reason: null }],
              }
              safeEnqueue(enc.encode(`data: ${JSON.stringify(payload)}\n\n`))
            }
          }

          // Error fallback
          if (!closed && taskError && chunkIndex === 0 && !finalResult) {
            const errMsg = taskError.message || 'Нет доступных майнеров'
            const errPayload = {
              choices: [{ delta: { content: `Ошибка: ${errMsg}` }, index: 0, finish_reason: null }],
            }
            safeEnqueue(enc.encode(`data: ${JSON.stringify(errPayload)}\n\n`))
          }

          safeEnqueue(enc.encode(`data: [DONE]\n\n`))
          safeClose()

          // Save assistant response to chat history
          if (userId && chatId) {
            try {
              const saveResult = minerResult || fileResult
              const fullResult = saveResult?.result || ''
              if (fullResult) {
                const cleanedResult = cleanChunk(fullResult)
                addChatMessage(chatId, 'assistant', cleanedResult)
              }
            } catch (e) {
              console.error('[Chat] Failed to save assistant message:', e)
            }
          }

          const doneResult = minerResult || fileResult
          const minerId = doneResult?.minerId || 'unknown'
          console.log(`[Chat] Done in ${Date.now() - startTime}ms miner=${typeof minerId === 'string' ? minerId.slice(0, 8) : minerId} tok=${doneResult?.tokensUsed || 0} chat=${chatId?.slice(0, 8) || 'none'} src=${minerResult ? 'mem' : fileResult ? 'file' : 'none'}`)
        } catch (e) {
          console.error('[Chat] Stream error:', e)
          safeEnqueue(enc.encode(`data: [DONE]\n\n`))
          safeClose()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Search-Used': shouldSearch ? 'true' : 'false',
        ...(chatId ? { 'X-Chat-Id': chatId } : {}),
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

  return { text, insideThink: stillInThink }
}

function json(body: any, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
