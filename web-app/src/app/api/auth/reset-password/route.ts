import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIP } from '@/lib/rateLimit'
import { verifyEmailToken, resetUserPassword, getUserById } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const _ip = getClientIP(req)
    const _rl = checkRateLimit({ store: 'reset-password', key: _ip, maxAttempts: 10, windowMs: 3600000 })
    if (!_rl.allowed) return NextResponse.json({ error: 'Слишком много запросов. Подождите.' }, { status: 429, headers: { 'Retry-After': String(Math.ceil(_rl.retryAfterMs/1000)) } })
    const { token, password } = await req.json()

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Токен не указан' }, { status: 400 })
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Пароль минимум 8 символов' }, { status: 400 })
    }
    if (password.length > 128) {
      return NextResponse.json({ error: 'Пароль максимум 128 символов' }, { status: 400 })
    }

    const result = verifyEmailToken(token, 'reset')
    if (!result) {
      return NextResponse.json(
        { error: 'Ссылка недействительна или истекла. Запросите новый сброс.' },
        { status: 400 }
      )
    }

    const success = resetUserPassword(result.userId, password)
    if (!success) {
      return NextResponse.json({ error: 'Не удалось обновить пароль' }, { status: 500 })
    }

    const user = getUserById(result.userId)
    console.log(`[Auth] Password reset completed: ${user?.email}`)

    return NextResponse.json({
      success: true,
      message: 'Пароль успешно изменён! Теперь вы можете войти.',
    })
  } catch (e) {
    console.error('[Auth] Reset password error:', e)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
