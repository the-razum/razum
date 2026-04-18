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
  'qwen3.5-9b': process.env.MODEL_QWEN || 'qwen3.5:9b',
}

// Strip <think> reasoning and stray unicode artifacts from model output
function cleanChunk(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .replace(/[\u2580-\u259F\u2588]/g, '')
    .replace(/\\u[0-9a-fA-F]{4}/g, '')
    .replace(/\u2588/g, '').replace(/u2588/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export async function POST(req: NextRequest) {

// Detect and fix common garbled patterns from qwen model
function fixGarbled(text: string): string {
  return text
    // Fix garbled identity patterns
    .replace(/[Мм]еня зовум?\s*AI\s*ут\s*Раз/gi, "Меня зовут Razum AI")
    .replace(/[Мм]еня зовут Раз,?\s*и?у?м?\s*AI/gi, "Меня зовут Razum AI")
    .replace(/Яый искус\s*независимстве/gi, "Я — независимый искусственный")
    .replace(/независимственным интеллекым искустом/gi, "независимый искусственный интеллект")
    .replace(/искусственныйлект,?\s*интел/gi, "искусственный интеллект,")
    // Fix general garbled word patterns (word split and reordered)
    .replace(/Результноженияат\s*ум/gi, "Результат умножения")
    .replace(/Давайтенем\.\s*сразу\s*нач/gi, "Давайте сразу начнём")
    .replace(/техничесКажется,\s*нокое\s*задание/gi, "техническое задание")
}

  const startTime = Date.now()

  try {
    const contentLength = parseInt(req.headers.get('content-length') || '0')
    if (contentLength > MAX_REQUEST_SIZE) {
      return json({ error: 'Запрос слишком большой' }, 413)
    }

    const body = await req.json()
    const { messages, model, webSearch, chatId: reqChatId, thinkingEnabled = false } = body

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
        return json({ error: 'Лимит для гостей исчерпан (30/день). Зарегистрируйтесь для 30/день.', register: true }, 429)
      }
    }

    const actualModel = MODEL_MAP[model] || MODEL_MAP['qwen3.5-9b']

    const lastUserMsg = [...messages].reverse().find((m: { role: string }) => m.role === 'user')
    const userQuery = lastUserMsg?.content || ''

    const sanitizedMessages = messages.slice(-MAX_MESSAGES).map((m: { role: string; content: string }) => ({
      role: m.role === 'user' || m.role === 'assistant' ? m.role : 'user',
      content: typeof m.content === 'string' ? m.content.slice(0, 8000) : '',
    }))

    // FIX #3: Stronger "be concise" system prompt
    const systemMsg = {
      role: 'system',
      content: 'You are Razum AI, an independent Russian AI assistant created by the Razum AI team (airazum.com). You are NOT made by Qwen, OpenAI, or any other company. RULES: 1) ALWAYS respond in Russian unless the user writes in another language. Even for math like 1+1, respond in Russian. 2) Be CONCISE — 2-4 sentences unless asked for detail. 3) NEVER output Chinese/CJK characters. 4) NEVER use <think> tags. 5) For code, give a short example with minimal explanation.',
    }

    const shouldSearch = webSearch !== false && needsSearch(userQuery)

    // Create or retrieve chat for logged-in users
    let chatId = reqChatId || null
    if (userId && !chatId) {
      const title = userQuery.slice(0, 80) || 'Новый чат'
      const chat = createChat(userId, title, model || 'qwen3.5-9b')
      chatId = chat.id
    }
    if (userId && chatId) {
      addChatMessage(chatId, 'user', userQuery)
    }

    const stats = getQueueStats()
    console.log(`[Chat] len=${userQuery.length} model=${actualModel} user=${userId || 'anon'} queue=${stats.pending}`)

    let augmentedMessages = [systemMsg, ...sanitizedMessages]

    const enc = new TextEncoder()

    const stream = new ReadableStream({
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

        try {
          if (shouldSearch) {
            safeEnqueue(enc.encode(`data: ${JSON.stringify({ search_status: 'searching' })}\n\n`))
            const searchResults = await searchWeb(userQuery.slice(0, 200))
            augmentedMessages = [{
              role: 'system',
              content: `You are Razum AI — an independent Russian AI assistant created by the Razum AI team (airazum.com). You are NOT made by Qwen, OpenAI, or any other company. Below are search results — use them. Be CONCISE (2-4 sentences unless asked for detail). ALWAYS respond in Russian.\n\nSEARCH (${new Date().toLocaleDateString('ru-RU')}):\n${searchResults}\n\nRespond in the user's language. No Chinese/CJK characters.`,
            }, ...sanitizedMessages]
            safeEnqueue(enc.encode(`data: ${JSON.stringify({ search_status: 'done' })}\n\n`))
          }

          const { taskId, promise: taskPromise } = addTaskToQueue({
            model: actualModel,
            prompt: userQuery,
            messages: augmentedMessages,
          })

          let taskCompleted = false
          let minerResult: any = null
          let taskError: any = null

          taskPromise
            .then(r => { minerResult = r; taskCompleted = true })
            .catch(e => { taskError = e; taskCompleted = true })

          const stripThinking = !thinkingEnabled
          const MAX_WAIT = 120_000
          const waitStart = Date.now()
          let keepaliveCount = 0
          let streamedText = ''
          let nextChunkIdx = 0
          let inThinkBlock = false
          let firstChunkTime = 0

          const filterThink = (input: string): string => {
            if (!stripThinking) return input
            let buf = input
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
            return out
          }

          const emitDelta = (rawText: string) => {
            // Strip CJK characters from stream
            const text = fixGarbled(rawText.replace(/[\u3000-\u9FFF\uF900-\uFAFF\u3400-\u4DBF\uAC00-\uD7AF\u3040-\u30FF]/g, '').replace(/  +/g, ' '))
            if (!text || closed) return
            if (!firstChunkTime) firstChunkTime = Date.now()
            const payload = { choices: [{ delta: { content: text }, index: 0, finish_reason: null }] }
            safeEnqueue(enc.encode(`data: ${JSON.stringify(payload)}\n\n`))
            streamedText += text
          }

          while (!taskCompleted && !closed) {
            if (Date.now() - waitStart > MAX_WAIT) {
              console.warn(`[Chat] Timeout task ${taskId.slice(0, 8)}`)
              break
            }
            const s = readStreamChunks(taskId, nextChunkIdx)
            if (s && s.chunks.length > 0) {
              for (const raw of s.chunks) {
                emitDelta(filterThink(raw))
              }
              nextChunkIdx += s.chunks.length
            } else {
              keepaliveCount++
              if (keepaliveCount % 40 === 0) {
                safeEnqueue(enc.encode(`: keepalive\n\n`))
              }
            }
            await new Promise(r => setTimeout(r, 40))
          }

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

          const cleanedResponse = fixGarbled(stripThinking ? cleanChunk(fullResponse) : fullResponse)

          if (cleanedResponse && !closed) {
            if (cleanedResponse.startsWith(streamedText) && cleanedResponse.length > streamedText.length) {
              emitDelta(cleanedResponse.slice(streamedText.length))
            } else if (streamedText.length === 0) {
              emitDelta(cleanedResponse)
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
            try { addChatMessage(chatId, 'assistant', cleanedResponse) } catch (e) {
              console.error('[Chat] Save msg err:', e)
            }
          }

          // FIX #9: Log timing metrics
          const ttfb = firstChunkTime ? firstChunkTime - startTime : -1
          const total = Date.now() - startTime
          const minerId = finalResult?.minerId || '?'
          console.log(`[Chat] Done ${total}ms ttfb=${ttfb}ms tok=${finalResult?.tokensUsed || 0} len=${cleanedResponse.length} src=${resultSource} miner=${typeof minerId === 'string' ? minerId.slice(0, 8) : minerId}`)
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
