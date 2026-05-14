import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIP } from '@/lib/rateLimit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const WHISPER_URL = process.env.WHISPER_URL || ''  // e.g. http://imac-via-tunnel:9011/v1/audio/transcriptions

export async function POST(req: NextRequest) {
  const _ip = getClientIP(req)
  const _rl = checkRateLimit({ store: 'voice-transcribe', key: _ip, maxAttempts: 60, windowMs: 3600000 })
  if (!_rl.allowed) return NextResponse.json({ error: 'Слишком много запросов. Подождите.' }, { status: 429, headers: { 'Retry-After': String(Math.ceil(_rl.retryAfterMs/1000)) } })
  if (!WHISPER_URL) {
    return NextResponse.json({
      error: 'voice-not-configured',
      hint: 'Voice transcription временно недоступен. Используйте текстовый ввод.',
    }, { status: 503 })
  }
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 })

    const upstream = new FormData()
    upstream.append('file', file)
    upstream.append('model', 'whisper-1')
    upstream.append('language', 'ru')

    const r = await fetch(WHISPER_URL, { method: 'POST', body: upstream as any, signal: AbortSignal.timeout(60_000) })
    if (!r.ok) {
      const t = await r.text().catch(() => '')
      return NextResponse.json({ error: 'whisper-error', detail: t.slice(0, 300) }, { status: 502 })
    }
    const data = await r.json()
    return NextResponse.json({ ok: true, text: data.text || '' })
  } catch (e: any) {
    return NextResponse.json({ error: 'transcribe failed', message: process.env.NODE_ENV === 'production' ? undefined : String(e?.message || e).slice(0, 300) }, { status: 500 })
  }
}
