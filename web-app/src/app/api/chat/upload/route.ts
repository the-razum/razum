import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIP } from '@/lib/rateLimit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BYTES = 10 * 1024 * 1024  // 10 MB
const MAX_TEXT_LEN = 60000          // ~60KB of text into context

export async function POST(req: NextRequest) {
  try {
    const _ip = getClientIP(req)
    const _rl = checkRateLimit({ store: 'chat-upload', key: _ip, maxAttempts: 20, windowMs: 3600000 })
    if (!_rl.allowed) return NextResponse.json({ error: 'Слишком много запросов. Подождите.' }, { status: 429, headers: { 'Retry-After': String(Math.ceil(_rl.retryAfterMs/1000)) } })
    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 })
    if (file.size > MAX_BYTES) return NextResponse.json({ error: 'file too large (max 10MB)' }, { status: 413 })

    const buf = Buffer.from(await file.arrayBuffer())
    const name = (file.name || '').toLowerCase()
    let text = ''

    if (name.endsWith('.pdf')) {
      const pdfParse: any = (await import('pdf-parse' as any) as any)
      const r = await pdfParse(buf)
      text = r.text || ''
    } else if (name.endsWith('.docx')) {
      const mammoth = await import('mammoth')
      const r = await mammoth.extractRawText({ buffer: buf })
      text = r.value || ''
    } else if (name.endsWith('.md') || name.endsWith('.txt') || name.endsWith('.csv') || name.endsWith('.json') || name.endsWith('.log')) {
      text = buf.toString('utf-8')
    } else {
      return NextResponse.json({ error: 'unsupported format. accepted: pdf, docx, md, txt, csv, json, log' }, { status: 415 })
    }

    if (!text.trim()) return NextResponse.json({ error: 'no text extracted' }, { status: 422 })

    const truncated = text.slice(0, MAX_TEXT_LEN)
    return NextResponse.json({
      ok: true,
      filename: file.name,
      bytes: file.size,
      textLength: truncated.length,
      truncated: text.length > MAX_TEXT_LEN,
      content: truncated,
    })
  } catch (e: any) {
    console.error('[Upload]', e)
    return NextResponse.json({ error: 'parse failed', message: process.env.NODE_ENV === 'production' ? undefined : String(e?.message || e).slice(0, 300) }, { status: 500 })
  }
}
