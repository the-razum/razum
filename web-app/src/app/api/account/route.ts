import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getUserById, getPaymentsByUser, PLANS } from '@/lib/db'

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
