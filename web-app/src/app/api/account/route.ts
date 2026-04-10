import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getUserById, getPaymentsByUser, PLANS, changePassword, updateUserName } from '@/lib/db'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('razum_token')?.value
  if (!token) {
    return NextResponse.json({ error: 'Необходимо войти' }, { status: 401 })
  }

  const userId = verifyToken(token)
  if (!userId) {
    return NextResponse.json({ error: 'Сессия истекла' }, { status: 401 })
  }

  const user = getUserById(userId)
  if (!user) {
    return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
  }

  const plan = PLANS[user.plan as keyof typeof PLANS] || PLANS.free
  const today = new Date().toISOString().split('T')[0]
  const requestsToday = user.lastRequestDate === today ? user.requestsToday : 0

  // Check if plan expired
  let activePlan = user.plan
  let planExpired = false
  if (user.plan !== 'free' && user.planExpiresAt) {
    const now = new Date()
    const expires = new Date(user.planExpiresAt)
    if (now > expires) {
      activePlan = 'free'
      planExpired = true
    }
  }

  const activePlanInfo = PLANS[activePlan as keyof typeof PLANS] || PLANS.free

  // Get payment history
  const payments = getPaymentsByUser(userId, 20)

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      plan: activePlan,
      planName: activePlanInfo.name,
      planExpired,
      planExpiresAt: user.planExpiresAt || null,
      requestsToday,
      requestsLimit: activePlanInfo.requestsPerDay,
      remaining: Math.max(0, activePlanInfo.requestsPerDay - requestsToday),
      createdAt: user.createdAt,
    },
    payments: payments.map(p => ({
      id: p.id,
      amount: p.amount,
      plan: p.plan,
      planName: PLANS[p.plan as keyof typeof PLANS]?.name || p.plan,
      status: p.status,
      createdAt: p.createdAt,
      completedAt: p.completedAt,
    })),
  })
}

// Update profile name
export async function PUT(req: NextRequest) {
  const token = req.cookies.get('razum_token')?.value
  if (!token) return NextResponse.json({ error: 'Необходимо войти' }, { status: 401 })
  const userId = verifyToken(token)
  if (!userId) return NextResponse.json({ error: 'Сессия истекла' }, { status: 401 })

  const { name } = await req.json()
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return NextResponse.json({ error: 'Имя должно содержать минимум 2 символа' }, { status: 400 })
  }

  const updated = updateUserName(userId, name.trim())
  if (!updated) return NextResponse.json({ error: 'Ошибка обновления' }, { status: 500 })

  return NextResponse.json({ success: true })
}

// Change password
export async function PATCH(req: NextRequest) {
  const token = req.cookies.get('razum_token')?.value
  if (!token) return NextResponse.json({ error: 'Необходимо войти' }, { status: 401 })
  const userId = verifyToken(token)
  if (!userId) return NextResponse.json({ error: 'Сессия истекла' }, { status: 401 })

  const { currentPassword, newPassword } = await req.json()
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Заполните все поля' }, { status: 400 })
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: 'Пароль должен содержать минимум 6 символов' }, { status: 400 })
  }

  const result = changePassword(userId, currentPassword, newPassword)
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
