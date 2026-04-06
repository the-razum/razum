import { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { checkAndIncrementRequests, checkAnonLimit } from '@/lib/db'

// --- Web Search via DuckDuckGo ---
async function searchWeb(query: string): Promise<string> {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    })
    const html = await res.text()

    // Extract snippets: get text content from result__snippet links
    const results: string[] = []
    const snippetRegex = /class="result__snippet"[^>]*>([^<]+(?:<[^>]*>[^<]*)*)/g
    let match
    while ((match = snippetRegex.exec(html)) !== null && results.length < 5) {
      const text = match[1].replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").trim()
      if (text.length > 20) {
        results.push(`${results.length + 1}. ${text}`)
      }
    }

    // If regex didn't work, try simpler approach - extract from result blocks
    if (results.length === 0) {
      const blockRegex = /result__snippet[^>]*>([\s\S]*?)<\/a>/g
      while ((match = blockRegex.exec(html)) !== null && results.length < 5) {
        const text = match[1].replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim()
        if (text.length > 20) {
          results.push(`${results.length + 1}. ${text}`)
        }
      }
    }

    console.log(`[Search] Query: "${query}", Results: ${results.length}`)
    if (results.length > 0) console.log(`[Search] First result: ${results[0].slice(0, 100)}...`)

    return results.length > 0
      ? results.join('\n\n')
      : 'Поиск не дал результатов.'
  } catch (e) {
    console.error('Search error:', e)
    return 'Ошибка при поиске в интернете.'
  }
}

// Determine if the user's message needs web search
function needsSearch(message: string): boolean {
  const searchTriggers = [
    // Direct search indicators
    /найди/i, /поищи/i, /загугли/i, /search/i, /погугли/i,
    // Current events / time-sensitive
    /сегодня/i, /сейчас/i, /последн/i, /новост/i, /актуальн/i,
    /курс/i, /погода/i, /цена/i, /стоимость/i,
    // Questions about specific things that need fresh data
    /кто такой/i, /кто такая/i, /что такое/i, /что случилось/i,
    /when did/i, /what is the latest/i, /current/i, /today/i, /news/i,
    /who is/i, /what happened/i, /price of/i,
  ]
  return searchTriggers.some(trigger => trigger.test(message))
}

// OpenAI-compatible streaming proxy with web search
export async function POST(req: NextRequest) {
  const { messages, model, webSearch } = await req.json()

  // --- Rate Limiting ---
  const token = req.cookies.get('razum_token')?.value
  const userId = token ? verifyToken(token) : null

  if (userId) {
    const { allowed, remaining, limit } = checkAndIncrementRequests(userId)
    if (!allowed) {
      return new Response(
        JSON.stringify({
          error: `Лимит исчерпан (${limit} запросов/день). Обновите тариф для увеличения лимита.`,
          upgrade: true,
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      )
    }
  } else {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const { allowed } = checkAnonLimit(ip)
    if (!allowed) {
      return new Response(
        JSON.stringify({
          error: 'Лимит для гостей исчерпан (10 запросов/день). Зарегистрируйтесь бесплатно для 30 запросов/день.',
          register: true,
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }

  const INFERENCE_URL = process.env.INFERENCE_URL || 'http://localhost:11434/v1'
  const API_KEY = process.env.INFERENCE_API_KEY || 'not-needed'

  const MODEL_MAP: Record<string, string> = {
    'deepseek-r1-14b': process.env.MODEL_DEEPSEEK || 'deepseek-r1:14b',
    'mistral-7b': process.env.MODEL_MISTRAL || 'mistral:7b',
  }

  const actualModel = MODEL_MAP[model] || model

  // Get the last user message
  const lastUserMsg = [...messages].reverse().find((m: { role: string }) => m.role === 'user')
  const userQuery = lastUserMsg?.content || ''

  // Decide if we should search
  const shouldSearch = webSearch !== false && needsSearch(userQuery)

  // Build messages with search context if needed
  let augmentedMessages = messages.map((m: { role: string; content: string }) => ({
    role: m.role,
    content: m.content,
  }))

  if (shouldSearch) {
    const searchResults = await searchWeb(userQuery)

    // Insert system message with search results before the conversation
    const systemMsg = {
      role: 'system',
      content: `Ты — Razum AI. ВАЖНО: Ниже приведены СВЕЖИЕ результаты поиска в интернете. Ты ОБЯЗАН использовать эти данные в своём ответе. Цитируй факты и цифры из результатов поиска. Не говори "у меня нет данных" — данные есть ниже.

РЕЗУЛЬТАТЫ ПОИСКА (свежие, от ${new Date().toLocaleDateString('ru-RU')}):
${searchResults}

Инструкции:
- Используй данные из поиска выше для ответа
- Указывай конкретные цифры и факты из результатов
- Отвечай на том языке, на котором спрашивает пользователь`
    }

    augmentedMessages = [systemMsg, ...augmentedMessages]
  }

  try {
    const response = await fetch(`${INFERENCE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: actualModel,
        messages: augmentedMessages,
        stream: true,
        max_tokens: 2048,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return new Response(
        JSON.stringify({ error: `Inference server error: ${response.status}`, details: err }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Stream the response through to the client (SSE passthrough)
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader()
        if (!reader) {
          controller.close()
          return
        }
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            controller.enqueue(value)
          }
        } catch (e) {
          // Client disconnected or stream error
        } finally {
          controller.close()
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
    return new Response(
      JSON.stringify({
        error: 'Cannot connect to inference server',
        hint: 'Make sure INFERENCE_URL is set in .env.local and the GPU server is running',
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
