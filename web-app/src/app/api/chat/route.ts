import { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { checkAndIncrementRequests, checkAnonLimit, createChat, addChatMessage, getChatById, updateChatTitle } from '@/lib/db'
import { searchWeb, needsSearch } from '@/lib/search'
import { getClientIP } from '@/lib/rateLimit'
import { addTaskToQueue, getQueueStats, readStreamChunks, getTaskResult } from '@/lib/taskQueue'

const MAX_REQUEST_SIZE = 100 * 1024
const MAX_MESSAGES = 50

// Map UI model id â real Ollama model name (must match what miners advertise)
const MODEL_MAP: Record<string, string> = {
  'qwen3.5-9b': process.env.MODEL_QWEN || 'qwen3.5:9b',
}

// Strip <think> reasoning and stray unicode artifacts from model output
function cleanChunk(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .replace(/[\u2580-\u259F\u2588]/g, '')  // block elements (â â â etc.)
    .replace(/\\u[0-9a-fA-F]{4}/g, '')     // escaped unicode like "u2588"
    .replace(/\u2588/g, '').replace(/u2588/g, '')                 // explicit full block char
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    const contentLength = parseInt(req.headers.get('content-length') || '0')
    if (contentLength > MAX_REQUEST_SIZE) {
      return json({ error: 'ÐÐ°Ð¿ÑÐ¾Ñ ÑÐ»Ð¸ÑÐºÐ¾Ð¼ Ð±Ð¾Ð»ÑÑÐ¾Ð¹' }, 413)
    }

    const body = await req.json()
    const { messages, model, webSearch, chatId: reqChatId, thinkingEnabled = false } = body

    if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
      return json({ error: 'ÐÐµÐºÐ¾ÑÑÐµÐºÑÐ½ÑÐ¹ Ð·Ð°Ð¿ÑÐ¾Ñ' }, 400)
    }

    // Rate limiting
    const token = req.cookies.get('razum_token')?.value
    const userId = token ? verifyToken(token) : null

    if (userId) {
      const { allowed, limit } = checkAndIncrementRequests(userId)
      if (!allowed) {
        return json({ error: `ÐÐ¸Ð¼Ð¸Ñ Ð¸ÑÑÐµÑÐ¿Ð°Ð½ (${limit} Ð·Ð°Ð¿ÑÐ¾ÑÐ¾Ð²/Ð´ÐµÐ½Ñ). ÐÐ±Ð½Ð¾Ð²Ð¸ÑÐµ ÑÐ°ÑÐ¸Ñ.`, upgrade: true }, 429)
      }
    } else {
      const ip = getClientIP(req)
      const { allowed } = checkAnonLimit(ip)
      if (!allowed) {
        return json({ error: 'ÐÐ¸Ð¼Ð¸Ñ Ð´Ð»Ñ Ð³Ð¾ÑÑÐµÐ¹ Ð¸ÑÑÐµÑÐ¿Ð°Ð½ (10/Ð´ÐµÐ½Ñ). ÐÐ°ÑÐµÐ³Ð¸ÑÑÑÐ¸ÑÑÐ¹ÑÐµÑÑ Ð´Ð»Ñ 30/Ð´ÐµÐ½Ñ.', register: true }, 429)
      }
    }

    const actualModel = MODEL_MAP[model] || MODEL_MAP['qwen3.5-9b']

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

    // Create or retrieve chat for logged-in users
    let chatId = reqChatId || null
    if (userId && !chatId) {
      // Create new chat with first user message as title
      const title = userQuery.slice(0, 80) || 'ÐÐ¾Ð²ÑÐ¹ ÑÐ°Ñ'
      const chat = createChat(userId, title, model || 'qwen3.5-9b')
      chatId = chat.id
    }
    // Save user message
    if (userId && chatId) {
      addChatMessage(chatId, 'user', userQuery)
    }

    const stats = getQueueStats()
    console.log(`[Chat] model=${actualModel} search=${shouldSearch} user=${userId || 'anon'} queue=${stats.pending}/${stats.total} chat=${chatId?.slice(0, 8) || 'none'} q="${userQuery.slice(0, 60)}"`)

    // Defer search and task creation â will be done inside the stream
    let augmentedMessages = [systemMsg, ...sanitizedMessages]

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
          // Perform web search inside stream so client gets status updates
          if (shouldSearch) {
            safeEnqueue(enc.encode(`data: ${JSON.stringify({ search_status: 'searching' })}\n\n`))
            const searchResults = await searchWeb(userQuery.slice(0, 200))
            augmentedMessages = [{
              role: 'system',
              content: `You are Razum AI — an independent Russian AI assistant created by the Razum AI team (airazum.com). You are NOT made by Yandex, Google, OpenAI, Meta, or any other company. Below are fresh search results — use them in your answer.\n\nSEARCH RESULTS (${new Date().toLocaleDateString('ru-RU')}):\n${searchResults}\n\nCRITICAL: Respond in the SAME language as the user. NEVER use Chinese/CJK characters. Be concise and helpful.`,
            }, ...sanitizedMessages]
            safeEnqueue(enc.encode(`data: ${JSON.stringify({ search_status: 'done' })}\n\n`))
          }

          // Now create the task with (possibly augmented) messages
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

          const stripThinking = !thinkingEnabled
          const MAX_WAIT = 120_000  // 120s max wait for task completion
          const waitStart = Date.now()
          let keepaliveCount = 0

          console.log(`[Chat] Awaiting task ${taskId.slice(0, 8)}...`)

          // Wait for task to complete, sending only keepalive pings
          while (!taskCompleted && !closed) {
            if (Date.now() - waitStart > MAX_WAIT) {
              console.warn(`[Chat] Wait timeout for task ${taskId.slice(0, 8)}`)
              break
            }
            keepaliveCount++
            if (keepaliveCount % 30 === 0) {
              safeEnqueue(enc.encode(`: keepalive\n\n`))
            }
            await new Promise(r => setTimeout(r, 100))
          }

          // Resolve the full response from the most reliable source
          const fileResult = !minerResult ? getTaskResult(taskId) : null
          const finalResult = minerResult || fileResult
          let fullResponse = ''
          let resultSource = 'none'

          if (finalResult && typeof finalResult.result === 'string' && finalResult.result.length > 0) {
            fullResponse = finalResult.result
            resultSource = minerResult ? 'mem' : 'file'
          } else {
            const chunks = readStreamChunks(taskId, 0)
            if (chunks && chunks.chunks.length > 0) {
              fullResponse = chunks.chunks.join('')
              resultSource = 'stream'
            }
          }

          // Clean think tags in a single pass on the COMPLETE text
          const cleanedResponse = stripThinking ? cleanChunk(fullResponse) : fullResponse

          if (cleanedResponse && !closed) {
            // Fake-stream the cleaned result so the UI renders progressively
            const sz = 30
            for (let i = 0; i < cleanedResponse.length; i += sz) {
              if (closed) break
              const piece = cleanedResponse.slice(i, i + sz)
              const payload = {
                choices: [{ delta: { content: piece }, index: 0, finish_reason: null }],
              }
              safeEnqueue(enc.encode(`data: ${JSON.stringify(payload)}\n\n`))
              if (i + sz < cleanedResponse.length) {
                await new Promise(r => setTimeout(r, 8))
              }
            }
          } else if (!closed && taskError) {
            const errMsg = taskError.message || 'Нет доступных майнеров'
            safeEnqueue(enc.encode(`data: ${JSON.stringify({
              choices: [{ delta: { content: `Ошибка: ${errMsg}` }, index: 0, finish_reason: null }],
            })}\n\n`))
          } else if (!closed && !cleanedResponse) {
            safeEnqueue(enc.encode(`data: ${JSON.stringify({
              choices: [{ delta: { content: 'Ошибка: не удалось получить ответ от модели' }, index: 0, finish_reason: null }],
            })}\n\n`))
          }

          safeEnqueue(enc.encode(`data: [DONE]\n\n`))
          safeClose()

          if (userId && chatId && cleanedResponse) {
            try {
              addChatMessage(chatId, 'assistant', cleanedResponse)
            } catch (e) {
              console.error('[Chat] Failed to save assistant message:', e)
            }
          }

          const minerId = finalResult?.minerId || 'unknown'
          console.log(`[Chat] Done in ${Date.now() - startTime}ms miner=${typeof minerId === 'string' ? minerId.slice(0, 8) : minerId} tok=${finalResult?.tokensUsed || 0} chat=${chatId?.slice(0, 8) || 'none'} src=${resultSource} len=${cleanedResponse.length}`)
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
        'X-Accel-Buffering': 'no',
        'X-Search-Used': shouldSearch ? 'true' : 'false',
        'X-Thinking-Used': thinkingEnabled ? 'true' : 'false',
        ...(chatId ? { 'X-Chat-Id': chatId } : {}),
      },
    })
  } catch (err) {
    console.error('[Chat] Fatal:', err)
    return json({ error: 'Сервер временно недоступен' }, 503)
  }
}

function json(body: any, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
