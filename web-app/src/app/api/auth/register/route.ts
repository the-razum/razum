import { NextRequest, NextResponse } from 'next/server'
import { registerUser } from '@/lib/db'
import { createToken } from '@/lib/auth'
import { checkRateLimit, getClientIP } from '@/lib/rateLimit'

// Email validation (RFC 5322 simplified)
function isValidEmail(email: string): boolean {
  const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/
  return re.test(email) && email.length <= 254
}

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 5 registrations per IP per hour
    const ip = getClientIP(req)
    const limit = checkRateLimit({
      store: 'register', key: ip, maxAttempts: 5, windowMs: 60 * 60 * 1000
    })
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Слишком много попыток регистрации. Попробуйте позже.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(limit.retryAfterMs / 1000)) } }
      )
    }

    // Parse & validate body size
    const text = await req.text()
    if (text.length > 10000) {
      return NextResponse.json({ error: 'Запрос слишком большой' }, { status: 413 })
    }

    const { email, name, password } = JSON.parse(text)

    if (!email || !name || !password) {
      return NextResponse.json({ error: 'Заполните все поля' }, { status: 400 })
    }

    // Email validation
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Некорректный email' }, { status: 400 })
    }

    // Name validation
    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
      return NextResponse.json({ error: 'Имя от 2 до 100 символов' }, { status: 400 })
    }

    // Password validation
    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Пароль минимум 8 символов' }, { status: 400 })
    }
    if (password.length > 128) {
      return NextResponse.json({ error: 'Пароль максимум 128 символов' }, { status: 400 })
    }

    const user = registerUser(email.toLowerCase().trim(), name.trim(), password)

    if (!user) {
      // Don't reveal whether email exists (prevent enumeration)
      return NextResponse.json(
        { error: 'Не удалось создать аккаунт. Возможно, email уже используется.' },
        { status: 409 }
      )
    }

    const token = createToken(user.id)

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
      },
    })

    response.cookies.set('razum_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })

    console.log(`[Auth] Register: ${user.email} (${ip})`)
    return response
  } catch (e) {
    console.error('[Auth] Register error:', e)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
