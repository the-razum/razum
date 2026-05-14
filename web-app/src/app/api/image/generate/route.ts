import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIP } from '@/lib/rateLimit'
import { verifyToken } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const FLUX_URL = process.env.FLUX_URL || ''  // mflux HTTP server on miner

export async function POST(req: NextRequest) {
  const _ip = getClientIP(req)
  const _rl = checkRateLimit({ store: 'image-gen', key: _ip, maxAttempts: 10, windowMs: 3600000 })
  if (!_rl.allowed) return NextResponse.json({ error: 'Слишком много запросов. Подождите.' }, { status: 429, headers: { 'Retry-After': String(Math.ceil(_rl.retryAfterMs/1000)) } })
  const token = req.cookies.get('razum_token')?.value
  const userId = token ? verifyToken(token) : null
  if (!userId) return NextResponse.json({ error: 'auth required' }, { status: 401 })

  if (!FLUX_URL) {
    return NextResponse.json({
      error: 'image-gen-not-configured',
      hint: 'Генерация картинок появится в ближайшем релизе. Сейчас работает только текст.',
    }, { status: 503 })
  }
  try {
    const { prompt, steps = 4, width = 1024, height = 1024 } = await req.json()
    if (!prompt || typeof prompt !== 'string' || prompt.length > 1000) {
      return NextResponse.json({ error: 'prompt required (1-1000 chars)' }, { status: 400 })
    }
    const r = await fetch(FLUX_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, steps, width, height }),
      signal: AbortSignal.timeout(120_000),
    })
    if (!r.ok) {
      return NextResponse.json({ error: 'flux-error', status: r.status }, { status: 502 })
    }
    const data = await r.json()
    return NextResponse.json({
      ok: true,
      imageUrl: data.url || null,
      imageBase64: data.image || null,
    })
  } catch (e: any) {
    return NextResponse.json({ error: 'gen failed', message: process.env.NODE_ENV === 'production' ? undefined : String(e?.message || e).slice(0, 300) }, { status: 500 })
  }
}
