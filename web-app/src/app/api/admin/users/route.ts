import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { isAdmin, getAllUsers, setUserRole, deleteUser } from '@/lib/db'

// GET /api/admin/users — list all users
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

  const result = getAllUsers(limit, offset)
  return NextResponse.json(result)
}

// PATCH /api/admin/users — update user role
export async function PATCH(req: NextRequest) {
  const token = cookies().get('razum_token')?.value
  if (!token) return NextResponse.json({ error: 'Необходимо войти' }, { status: 401 })

  const adminId = verifyToken(token)
  if (!adminId) return NextResponse.json({ error: 'Сессия истекла' }, { status: 401 })

  if (!isAdmin(adminId)) {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 })
  }

  const { userId, role } = await req.json()
  if (!userId || !['user', 'admin'].includes(role)) {
    return NextResponse.json({ error: 'Неверные параметры' }, { status: 400 })
  }

  // Prevent removing own admin
  if (userId === adminId && role !== 'admin') {
    return NextResponse.json({ error: 'Нельзя убрать свои права администратора' }, { status: 400 })
  }

  const ok = setUserRole(userId, role)
  if (!ok) return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
  return NextResponse.json({ success: true })
}

// DELETE /api/admin/users — delete user
export async function DELETE(req: NextRequest) {
  const token = cookies().get('razum_token')?.value
  if (!token) return NextResponse.json({ error: 'Необходимо войти' }, { status: 401 })

  const adminId = verifyToken(token)
  if (!adminId) return NextResponse.json({ error: 'Сессия истекла' }, { status: 401 })

  if (!isAdmin(adminId)) {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 })
  }

  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'userId обязателен' }, { status: 400 })

  // Prevent self-delete
  if (userId === adminId) {
    return NextResponse.json({ error: 'Нельзя удалить себя' }, { status: 400 })
  }

  const ok = deleteUser(userId)
  if (!ok) return NextResponse.json({ error: 'Ошибка удаления' }, { status: 500 })
  return NextResponse.json({ success: true })
}
