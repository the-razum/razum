// In-memory rate limiter with sliding window
// TODO: Replace with Redis for multi-instance deployments

interface RateLimitEntry {
  count: number
  resetAt: number
  blockedUntil: number // for exponential backoff
  failCount: number    // consecutive failures
}

const stores = new Map<string, Map<string, RateLimitEntry>>()

function getStore(name: string): Map<string, RateLimitEntry> {
  if (!stores.has(name)) stores.set(name, new Map())
  return stores.get(name)!
}

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  stores.forEach((store) => {
    store.forEach((entry, key) => {
      if (now > entry.resetAt && now > entry.blockedUntil) {
        store.delete(key)
      }
    })
  })
}, 5 * 60 * 1000)

interface RateLimitOptions {
  store: string        // e.g. 'login', 'register', 'miner-register'
  key: string          // IP address or user ID
  maxAttempts: number  // max requests per window
  windowMs: number     // time window in ms
  backoff?: boolean    // enable exponential backoff on limit hit
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterMs: number
}

export function checkRateLimit(opts: RateLimitOptions): RateLimitResult {
  const store = getStore(opts.store)
  const now = Date.now()
  const entry = store.get(opts.key)

  // Check if blocked (exponential backoff)
  if (entry && entry.blockedUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: entry.blockedUntil - now,
    }
  }

  // Reset if window expired
  if (!entry || now > entry.resetAt) {
    store.set(opts.key, {
      count: 1,
      resetAt: now + opts.windowMs,
      blockedUntil: 0,
      failCount: 0,
    })
    return { allowed: true, remaining: opts.maxAttempts - 1, retryAfterMs: 0 }
  }

  // Increment
  entry.count++

  if (entry.count > opts.maxAttempts) {
    // Apply exponential backoff if enabled
    if (opts.backoff) {
      entry.failCount++
      // 30s, 60s, 120s, 240s, 480s (max ~8min)
      const backoffMs = Math.min(30000 * Math.pow(2, entry.failCount - 1), 480000)
      entry.blockedUntil = now + backoffMs
      return { allowed: false, remaining: 0, retryAfterMs: backoffMs }
    }
    return { allowed: false, remaining: 0, retryAfterMs: entry.resetAt - now }
  }

  return {
    allowed: true,
    remaining: opts.maxAttempts - entry.count,
    retryAfterMs: 0,
  }
}

// Record failed attempt (for login brute force)
export function recordFailure(store: string, key: string) {
  const s = getStore(store)
  const entry = s.get(key)
  if (entry) {
    entry.failCount++
    // After 5 failures, start blocking
    if (entry.failCount >= 5) {
      const backoffMs = Math.min(30000 * Math.pow(2, entry.failCount - 5), 480000)
      entry.blockedUntil = Date.now() + backoffMs
    }
  }
}

// Helper to get client IP from request
export function getClientIP(req: Request): string {
  const headers = req.headers
  // x-forwarded-for can be spoofed, but behind trusted proxy it's reliable
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) {
    // Take the LAST IP (closest proxy), not first (client-provided)
    // In trusted proxy setups, the rightmost is the one added by our proxy
    const ips = forwarded.split(',').map(s => s.trim())
    return ips[ips.length - 1] || 'unknown'
  }
  return headers.get('x-real-ip') || 'unknown'
}
