import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIP } from '@/lib/rateLimit'
import { verifyEmailToken, setEmailVerified, getUserById } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const _ip = getClientIP(req)
    const _rl = checkRateLimit({ store: 'verify-email', key: _ip, maxAttempts: 30, windowMs: 3600000 })
    if (!_rl.allowed) return NextResponse.json({ error: 'Слишком много запросов. Подождите.' }, { status: 429, headers: { 'Retry-After': String(Math.ceil(_rl.retryAfterMs/1000)) } })
    const { token } = await req.json()
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Токен не указан' }, { status: 400 })
    }

    const result = verifyEmailToken(token, 'verify')
    if (!result) {
      return NextResponse.json(
        { error: 'Ссылка недействительна или истекла. Запросите новое письмо.' },
        { status: 400 }
      )
    }

    setEmailVerified(result.userId)
    const user = getUserById(result.userId)

    console.log(`[Auth] Email verified: ${user?.email}`)
    return NextResponse.json({
      success: true,
      message: 'Email подтверждён!',
      user: user ? { id: user.id, email: user.email, name: user.name } : null,
    })
  } catch (e) {
    console.error('[Auth] Verify email error:', e)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
