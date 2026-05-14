import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getDB } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/chats/export?id=<chatId>&format=md|txt
export async function GET(req: NextRequest) {
  const token = req.cookies.get('razum_token')?.value
  const userId = token ? verifyToken(token) : null
  if (!userId) return NextResponse.json({ error: 'auth required' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  const format = (req.nextUrl.searchParams.get('format') || 'md').toLowerCase()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const db = getDB()
  const chat = db.prepare('SELECT id, userId, title, createdAt FROM chats WHERE id = ? AND userId = ?').get(id, userId) as any
  if (!chat) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const msgs = db.prepare('SELECT role, content, createdAt FROM chat_messages WHERE chatId = ? ORDER BY createdAt ASC').all(id) as any[]

  let body: string
  let ct: string
  if (format === 'txt') {
    body = `Razum AI — ${chat.title}\n${chat.createdAt}\n\n` +
      msgs.map(m => `[${m.role.toUpperCase()} ${m.createdAt}]\n${m.content}\n`).join('\n')
    ct = 'text/plain; charset=utf-8'
  } else {
    body = `# ${chat.title}\n\n_Razum AI · ${chat.createdAt}_\n\n` +
      msgs.map(m => {
        const who = m.role === 'user' ? '🧑 Вы' : '🤖 Razum AI'
        return `### ${who}  \n_${m.createdAt}_\n\n${m.content}\n`
      }).join('\n---\n\n')
    ct = 'text/markdown; charset=utf-8'
  }
  const safeTitle = (chat.title || 'chat').replace(/[^a-zа-я0-9-_ ]/gi, '').slice(0, 50)
  return new Response(body, {
    headers: {
      'Content-Type': ct,
      'Content-Disposition': `attachment; filename="${safeTitle}.${format}"`,
    },
  })
}
