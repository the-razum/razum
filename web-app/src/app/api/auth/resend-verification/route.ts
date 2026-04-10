import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createEmailToken } from '@/lib/db'
import { sendVerificationEmail } from '@/lib/email'
import { checkRateLimit, getClientIP } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  try {
    const user = getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    if (user.emailVerified) {
      return NextResponse.json({ error: 'Email уже подтверждён' }, { status: 400 })
    }

    // Rate limit: 3 resend requests per user per hour
    const ip = getClientIP(req)
    const limit = checkRateLimit({
      store: 'resend', key: user.id, maxAttempts: 3, windowMs: 60 * 60 * 1000
    })
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Слишком много запросов. Попробуйте позже.' },
        { status: 429 }
      )
    }

    const token = createEmailToken(user.id, 'verify')
    await sendVerificationEmail(user.email, user.name, token)

    console.log(`[Auth] Resent verification email: ${user.email} (${ip})`)
    return NextResponse.json({
      success: true,
      message: 'Письмо отправлено! Проверьте почту.',
    })
  } catch (e) {
    console.error('[Auth] Resend verification error:', e)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
