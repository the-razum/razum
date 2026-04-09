import { NextRequest, NextResponse } from 'next/server'
import { loginUser } from '@/lib/db'
import { createToken } from '@/lib/auth'
import { checkRateLimit, recordFailure, getClientIP } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIP(req)

    // Rate limit: 10 login attempts per IP per 15 min, with exponential backoff
    const limit = checkRateLimit({
      store: 'login', key: ip, maxAttempts: 10, windowMs: 15 * 60 * 1000, backoff: true,
    })
    if (!limit.allowed) {
      const retryAfter = Math.ceil(limit.retryAfterMs / 1000)
      console.warn(`[Auth] Login blocked: ip=${ip} retry_after=${retryAfter}s`)
      return NextResponse.json(
        { error: `Слишком много попыток. Подождите ${retryAfter > 60 ? Math.ceil(retryAfter / 60) + ' мин' : retryAfter + ' сек'}.` },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      )
    }

    // Body size limit
    const text = await req.text()
    if (text.length > 5000) {
      return NextResponse.json({ error: 'Запрос слишком большой' }, { status: 413 })
    }

    const { email, password } = JSON.parse(text)

    if (!email || !password) {
      return NextResponse.json({ error: 'Введите email и пароль' }, { status: 400 })
    }

    const user = loginUser(email.toLowerCase().trim(), password)

    if (!user) {
      recordFailure('login', ip)
      // Generic message to prevent email enumeration
      return NextResponse.json({ error: 'Неверный email или пароль' }, { status: 401 })
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

    console.log(`[Auth] Login: ${user.email} (${ip})`)
    return response
  } catch (e) {
    console.error('[Auth] Login error:', e)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
