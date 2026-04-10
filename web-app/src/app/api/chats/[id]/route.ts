import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getChatById, getChatMessages, addChatMessage } from '@/lib/db'

/**
 * GET /api/chats/[id] — get chat with messages
 * POST /api/chats/[id] — add message to chat
 */

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.cookies.get('razum_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = verifyToken(token)
  if (!userId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const chat = getChatById(params.id, userId)
  if (!chat) return NextResponse.json({ error: 'Chat not found' }, { status: 404 })

  const messages = getChatMessages(params.id)
  return NextResponse.json({ chat, messages })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.cookies.get('razum_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = verifyToken(token)
  if (!userId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const chat = getChatById(params.id, userId)
  if (!chat) return NextResponse.json({ error: 'Chat not found' }, { status: 404 })

  const { role, content } = await req.json()
  if (!role || !content) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  addChatMessage(params.id, role, content)
  return NextResponse.json({ ok: true })
}
