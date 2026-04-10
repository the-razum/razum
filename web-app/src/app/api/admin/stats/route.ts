import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { isAdmin, getAdminStats } from '@/lib/db'

export async function GET() {
  const token = cookies().get('razum_token')?.value
  if (!token) return NextResponse.json({ error: 'Необходимо войти' }, { status: 401 })

  const userId = verifyToken(token)
  if (!userId) return NextResponse.json({ error: 'Сессия истекла' }, { status: 401 })

  if (!isAdmin(userId)) {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 })
  }

  const stats = getAdminStats()
  return NextResponse.json(stats)
}
