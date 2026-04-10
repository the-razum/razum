import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getUserChats, createChat, deleteChat } from '@/lib/db'

/**
 * GET /api/chats — list user's chats
 * POST /api/chats — create new chat
 * DELETE /api/chats?id=xxx — delete a chat
 */

export async function GET(req: NextRequest) {
  const token = req.cookies.get('razum_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = verifyToken(token)
  if (!userId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const chats = getUserChats(userId, 50)
  return NextResponse.json({ chats })
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('razum_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = verifyToken(token)
  if (!userId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { title, model } = await req.json()
  const chat = createChat(userId, title || 'Новый чат', model || '')
  return NextResponse.json({ chat })
}

export async function DELETE(req: NextRequest) {
  const token = req.cookies.get('razum_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = verifyToken(token)
  if (!userId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const url = new URL(req.url)
  const chatId = url.searchParams.get('id')
  if (!chatId) return NextResponse.json({ error: 'Missing chat id' }, { status: 400 })

  const deleted = deleteChat(chatId, userId)
  return NextResponse.json({ deleted })
}
