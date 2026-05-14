import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getAgentById, updateAgent, deleteAgent } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const a = getAgentById(params.id)
  if (!a) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json({ agent: a })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.cookies.get('razum_token')?.value
  const userId = token ? verifyToken(token) : null
  if (!userId) return NextResponse.json({ error: 'auth required' }, { status: 401 })
  const body = await req.json()
  const ok = updateAgent(params.id, userId, body)
  if (!ok) return NextResponse.json({ error: 'not found or forbidden' }, { status: 404 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.cookies.get('razum_token')?.value
  const userId = token ? verifyToken(token) : null
  if (!userId) return NextResponse.json({ error: 'auth required' }, { status: 401 })
  const ok = deleteAgent(params.id, userId)
  if (!ok) return NextResponse.json({ error: 'not found or forbidden' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
