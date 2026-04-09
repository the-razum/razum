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
      .map((r: any, i: number) => `${i + 1}. ${sanitize(r.title)}: ${sanitize(r.description)}`)

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
      .map((r: any, i: number) => `${i + 1}. ${sanitize(r.title)}: ${sanitize(r.content || '')}`)

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
  const searchTriggers = [
    /найди/i, /поищи/i, /загугли/i, /search/i, /погугли/i,
    /сегодня/i, /сейчас/i, /последн/i, /новост/i, /актуальн/i,
    /курс/i, /погода/i, /цена/i, /стоимость/i,
    /кто такой/i, /кто такая/i, /что такое/i, /что случилось/i,
    /when did/i, /what is the latest/i, /current/i, /today/i, /news/i,
    /who is/i, /what happened/i, /price of/i,
  ]
  return searchTriggers.some(trigger => trigger.test(message))
}
