import { NextRequest, NextResponse } from 'next/server'
import { getUserByEmail, createEmailToken } from '@/lib/db'
import { sendPasswordResetEmail } from '@/lib/email'
import { checkRateLimit, getClientIP } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 3 reset requests per IP per hour
    const ip = getClientIP(req)
    const limit = checkRateLimit({
      store: 'reset', key: ip, maxAttempts: 3, windowMs: 60 * 60 * 1000
    })
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Слишком много попыток. Попробуйте позже.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(limit.retryAfterMs / 1000)) } }
      )
    }

    const { email } = await req.json()
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Укажите email' }, { status: 400 })
    }

    // ALWAYS return success to prevent email enumeration
    const successResponse = NextResponse.json({
      success: true,
      message: 'Если аккаунт с таким email существует, мы отправили ссылку для сброса пароля.',
    })

    const user = getUserByEmail(email.toLowerCase().trim())
    if (!user) {
      // Don't reveal that email doesn't exist
      return successResponse
    }

    const token = createEmailToken(user.id, 'reset')
    await sendPasswordResetEmail(user.email, user.name, token)

    console.log(`[Auth] Password reset requested: ${user.email} (${ip})`)
    return successResponse
  } catch (e) {
    console.error('[Auth] Forgot password error:', e)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
