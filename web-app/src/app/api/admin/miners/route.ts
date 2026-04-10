import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { isAdmin, getAllMiners } from '@/lib/db'

// GET /api/admin/miners — list all miners
export async function GET(req: NextRequest) {
  const token = cookies().get('razum_token')?.value
  if (!token) return NextResponse.json({ error: 'Необходимо войти' }, { status: 401 })

  const userId = verifyToken(token)
  if (!userId) return NextResponse.json({ error: 'Сессия истекла' }, { status: 401 })

  if (!isAdmin(userId)) {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 })
  }

  const url = new URL(req.url)
  const limit = parseInt(url.searchParams.get('limit') || '100')
  const offset = parseInt(url.searchParams.get('offset') || '0')

  const result = getAllMiners(limit, offset)
  return NextResponse.json(result)
}
