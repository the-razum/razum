// Simple LRU cache for trivial common prompts.
// Hit rate not huge but eliminates load for the most repetitive queries.

const CACHE_SIZE = 200
const TTL_MS = 6 * 60 * 60 * 1000  // 6h

interface Entry { value: string; expires: number }
const store = new Map<string, Entry>()

function normalizeKey(model: string, message: string): string {
  return model + '|' + message.toLowerCase().replace(/[\s\W]+/g, '_').slice(0, 200)
}

export function chatCacheGet(model: string, message: string): string | null {
  const key = normalizeKey(model, message)
  const e = store.get(key)
  if (!e) return null
  if (Date.now() > e.expires) { store.delete(key); return null }
  // Touch (LRU)
  store.delete(key); store.set(key, e)
  return e.value
}

export function chatCacheSet(model: string, message: string, value: string): void {
  if (!value || value.length > 2000) return  // only cache short responses
  const key = normalizeKey(model, message)
  if (store.size >= CACHE_SIZE) {
    const first = store.keys().next().value
    if (first) store.delete(first)
  }
  store.set(key, { value, expires: Date.now() + TTL_MS })
}

// Only cache very short / common prompts to avoid storing user-specific stuff
const COMMON_PATTERNS = [
  /^(привет|hi|hello|hey|здравствуй|здравствуйте|ку|йо|хай)[!?.\s]*$/i,
  /^\d+\s*[+\-*/]\s*\d+\s*=?\s*$/,  // simple math
  /^(спасибо|thanks|thank you|пасиб|cool|круто)\s*[!?.]*$/i,
  /^(кто ты|who are you|представься)[?!.\s]*$/i,
  /^(что ты умеешь|what can you do)[?!.\s]*$/i,
]
export function isCommonPrompt(message: string): boolean {
  if (!message || message.length > 80) return false
  return COMMON_PATTERNS.some(p => p.test(message.trim()))
}
