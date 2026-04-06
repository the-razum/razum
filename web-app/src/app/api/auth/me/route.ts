import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getUserById, PLANS } from '@/lib/db'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('razum_token')?.value

  if (!token) {
    return NextResponse.json({ user: null })
  }

  const userId = verifyToken(token)
  if (!userId) {
    return NextResponse.json({ user: null })
  }

  const user = getUserById(userId)
  if (!user) {
    return NextResponse.json({ user: null })
  }

  const plan = PLANS[user.plan]
  const today = new Date().toISOString().split('T')[0]
  const requestsToday = user.lastRequestDate === today ? user.requestsToday : 0

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
      planName: plan.name,
      requestsToday,
      requestsLimit: plan.requestsPerDay,
      remaining: plan.requestsPerDay - requestsToday,
    },
  })
}

// Logout
export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.delete('razum_token')
  return response
}
