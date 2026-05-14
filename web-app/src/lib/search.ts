// Web search module — safe alternatives to scraping
// Priority: Brave Search API > SearXNG > Wikipedia fallback

// Sanitize text from HTML
function sanitize(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

// Option 1: Brave Search API (free tier: 2000 queries/month)
// Get key at: https://brave.com/search/api/
async function braveSearch(query: string): Promise<string | null> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY
  if (!apiKey) return null

  try {
    const res = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`,
      { headers: { 'X-Subscription-Token': apiKey, 'Accept': 'application/json' } }
    )
    if (!res.ok) return null

    const data = await res.json()
    const results = (data.web?.results || [])
      .slice(0, 5)
      .map((r: any, i: number) => `${i + 1}. [${sanitize(r.title)}](${r.url || ''}): ${sanitize(r.description).slice(0, 280)}`)

    return results.length > 0 ? results.join('\n\n') : null
  } catch (e) {
    console.error('[Search] Brave error:', e)
    return null
  }
}

// Option 2: SearXNG (self-hosted, free, no ToS issues)
// Set SEARXNG_URL=https://your-searxng-instance.com in .env
async function searxngSearch(query: string): Promise<string | null> {
  const baseUrl = process.env.SEARXNG_URL
  if (!baseUrl) return null

  try {
    const res = await fetch(
      `${baseUrl}/search?q=${encodeURIComponent(query)}&format=json&categories=general&engines=google,duckduckgo,brave&language=ru-RU`,
      { headers: { 'Accept': 'application/json' } }
    )
    if (!res.ok) return null

    const data = await res.json()
    const results = (data.results || [])
      .slice(0, 5)
      .map((r: any, i: number) => `${i + 1}. [${sanitize(r.title)}](${r.url || ''}): ${sanitize(r.content || '').slice(0, 280)}`)

    return results.length > 0 ? results.join('\n\n') : null
  } catch (e) {
    console.error('[Search] SearXNG error:', e)
    return null
  }
}

// Option 3: DuckDuckGo Instant Answer API (official, limited but legal)
async function ddgInstantAnswer(query: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1`,
      { headers: { 'User-Agent': 'RazumAI/1.0 (https://airazum.com)' } }
    )
    if (!res.ok) return null

    const data = await res.json()
    const results: string[] = []

    if (data.Abstract) results.push(`1. ${data.AbstractSource}: ${data.Abstract}`)
    if (data.Answer) results.push(`${results.length + 1}. ${data.Answer}`)

    // Related topics
    for (const topic of (data.RelatedTopics || []).slice(0, 4)) {
      if (topic.Text) {
        results.push(`${results.length + 1}. ${sanitize(topic.Text)}`)
      }
    }

    return results.length > 0 ? results.join('\n\n') : null
  } catch (e) {
    console.error('[Search] DDG Instant error:', e)
    return null
  }
}

// Option 4: Wikipedia API (always available, good for factual queries)
async function wikipediaSearch(query: string): Promise<string | null> {
  try {
    // Detect language
    const isRussian = /[а-яА-ЯёЁ]/.test(query)
    const lang = isRussian ? 'ru' : 'en'

    const res = await fetch(
      `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`,
      { headers: { 'User-Agent': 'RazumAI/1.0 (https://airazum.com; support@airazum.com)' } }
    )

    if (res.ok) {
      const data = await res.json()
      if (data.extract) return `1. Wikipedia: ${data.extract}`
    }

    // Fallback: search Wikipedia
    const searchRes = await fetch(
      `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=3`
    )
    if (!searchRes.ok) return null

    const searchData = await searchRes.json()
    const results = (searchData.query?.search || [])
      .map((r: any, i: number) => `${i + 1}. ${r.title}: ${sanitize(r.snippet)}`)

    return results.length > 0 ? results.join('\n\n') : null
  } catch (e) {
    console.error('[Search] Wikipedia error:', e)
    return null
  }
}

// Main search function — tries sources in priority order
export async function searchWeb(query: string): Promise<string> {
  // Try Brave Search first (best quality)
  const brave = await braveSearch(query)
  if (brave) {
    console.log(`[Search] Brave: "${query}" — found results`)
    return brave
  }

  // Try SearXNG
  const searxng = await searxngSearch(query)
  if (searxng) {
    console.log(`[Search] SearXNG: "${query}" — found results`)
    return searxng
  }

  // Try DDG Instant Answer API (official)
  const ddg = await ddgInstantAnswer(query)
  if (ddg) {
    console.log(`[Search] DDG API: "${query}" — found results`)
    return ddg
  }

  // Fallback to Wikipedia
  const wiki = await wikipediaSearch(query)
  if (wiki) {
    console.log(`[Search] Wikipedia: "${query}" — found results`)
    return wiki
  }

  console.log(`[Search] No results for: "${query}"`)
  return 'Поиск не дал результатов.'
}

// Determine if message needs web search
export function needsSearch(message: string): boolean {
  const msg = message.toLowerCase()

  // Skip search for short greetings and simple chat
  const skipPatterns = [
    /^(привет|здравствуй|хай|хей|йо|ку|добр|салам|hello|hi|hey|yo)\b/i,
    /^(да|нет|ок|ладно|хорошо|понял|спасибо|пасиб|ага|угу)\b/i,
    /^(расскажи|объясни|напиши|помоги|сделай)\b/i,
  ]
  if (skipPatterns.some(p => p.test(msg))) {
    // But still search if it also has a strong search trigger
    const hasStrongTrigger = [
      /найди/i, /поищи/i, /загугли/i, /погугли/i,
      /сегодня/i, /новост/i, /актуальн/i, /свежи/i,
      /курс доллар/i, /курс евро/i, /курс биткоин/i,
      /погода/i, /цена/i, /стоимость/i,
    ].some(t => t.test(msg))
    if (!hasStrongTrigger) return false
  }

  // General knowledge questions - model can handle without search
  const generalKnowledge = [
    /что такое (искусственный интеллект|ии|ai|машинное обучение|нейросет|программирование|интернет|компьютер)/i,
    /^что такое \w{1,15}[?]?$/i,  // short "что такое X" — likely general knowledge
    /как работает/i,
    /в чём разница/i,
    /чем отличается/i,
  ]
  if (generalKnowledge.some(p => p.test(msg))) return false

  // Strong triggers — always search
  const strongTriggers = [
    /найди/i, /поищи/i, /загугли/i, /search\b/i, /погугли/i,
    /новост/i, /актуальн/i, /свежи/i, /последни[еяхй]/i,
    /курс/i, /погода/i, /цена\b/i, /стоимость/i,
    /что случилось/i, /what happened/i,
    /when did/i, /what is the latest/i, /current\b/i, /today/i, /news\b/i,
    /who is/i, /price of/i,
  ]

  // Weak triggers — need more context
  const weakTriggers = [
    /сегодня/i, /сейчас/i,
    /кто такой/i, /кто такая/i,
  ]

  if (strongTriggers.some(t => t.test(msg))) return true

  // Weak triggers only fire for longer messages (likely asking about something specific)
  if (weakTriggers.some(t => t.test(msg)) && msg.length > 20) return true

  return false
}
