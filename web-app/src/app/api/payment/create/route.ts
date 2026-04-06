import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getUserById, PLANS } from '@/lib/db'

// ЮKassa integration
// Docs: https://yookassa.ru/developers/api
// Set env vars: YUKASSA_SHOP_ID, YUKASSA_SECRET_KEY

const YUKASSA_API = 'https://api.yookassa.ru/v3'

const PLAN_PRICES: Record<string, number> = {
  start: 490,
  basic: 990,
  pro: 1990,
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('razum_token')?.value
  if (!token) {
    return NextResponse.json({ error: 'Необходимо войти в аккаунт' }, { status: 401 })
  }

  const userId = verifyToken(token)
  if (!userId) {
    return NextResponse.json({ error: 'Сессия истекла' }, { status: 401 })
  }

  const { plan } = await req.json()
  const price = PLAN_PRICES[plan]

  if (!price) {
    return NextResponse.json({ error: 'Некорректный тариф' }, { status: 400 })
  }

  const shopId = process.env.YUKASSA_SHOP_ID
  const secretKey = process.env.YUKASSA_SECRET_KEY

  if (!shopId || !secretKey) {
    // Dev mode: simulate payment
    return NextResponse.json({
      confirmation_url: `/api/payment/webhook?simulate=true&userId=${userId}&plan=${plan}`,
      dev_mode: true,
      message: 'Платёжная система не подключена. Тариф будет активирован в тестовом режиме.',
    })
  }

  try {
    // Create ЮKassa payment
    const idempotenceKey = `${userId}-${plan}-${Date.now()}`

    const response = await fetch(`${YUKASSA_API}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(`${shopId}:${secretKey}`).toString('base64'),
        'Idempotence-Key': idempotenceKey,
      },
      body: JSON.stringify({
        amount: {
          value: price.toFixed(2),
          currency: 'RUB',
        },
        capture: true,
        confirmation: {
          type: 'redirect',
          return_url: `${process.env.NEXT_PUBLIC_URL || 'https://airazum.com'}/chat?payment=success`,
        },
        description: `Razum AI: тариф ${PLANS[plan as keyof typeof PLANS]?.name || plan} (${price} ₽/мес)`,
        metadata: {
          userId,
          plan,
        },
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('YuKassa error:', data)
      return NextResponse.json({ error: 'Ошибка создания платежа' }, { status: 502 })
    }

    return NextResponse.json({
      confirmation_url: data.confirmation?.confirmation_url,
      payment_id: data.id,
    })
  } catch (e) {
    console.error('Payment error:', e)
    return NextResponse.json({ error: 'Ошибка платёжной системы' }, { status: 500 })
  }
}
