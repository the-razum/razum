import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIP } from '@/lib/rateLimit'
import { verifyToken } from '@/lib/auth'
import { createAgent, getPublicAgents, getUserAgents } from '@/lib/db'
import { AgentCreateSchema, validateBody } from '@/lib/validators'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('razum_token')?.value
  const userId = token ? verifyToken(token) : null
  const mine = req.nextUrl.searchParams.get('mine') === '1'
  if (mine) {
    if (!userId) return NextResponse.json({ error: 'auth required' }, { status: 401 })
    return NextResponse.json({ agents: getUserAgents(userId) })
  }
  return NextResponse.json({ agents: getPublicAgents(50) })
}

export async function POST(req: NextRequest) {
  const _ip = getClientIP(req)
  const _rl = checkRateLimit({ store: 'agents-create', key: _ip, maxAttempts: 20, windowMs: 3600000 })
  if (!_rl.allowed) return NextResponse.json({ error: 'Слишком много запросов. Подождите.' }, { status: 429, headers: { 'Retry-After': String(Math.ceil(_rl.retryAfterMs/1000)) } })
  const token = req.cookies.get('razum_token')?.value
  const userId = token ? verifyToken(token) : null
  if (!userId) return NextResponse.json({ error: 'auth required' }, { status: 401 })
  const raw = await req.json()
  const v = validateBody(AgentCreateSchema, raw)
  if (!v.ok) return NextResponse.json({ error: 'Validation: ' + v.error }, { status: 400 })
  const agent = createAgent(userId, v.data as any)
  return NextResponse.json({ agent })
}
