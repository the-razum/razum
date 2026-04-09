import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { verifyToken } from '@/lib/auth'
import { getUserById, createPayment, upgradePlan, PLANS } from '@/lib/db'

// Robokassa configuration
const ROBOKASSA_LOGIN = process.env.ROBOKASSA_LOGIN || ''
const ROBOKASSA_PASS1 = process.env.ROBOKASSA_PASS1 || '' // For generating payment URL
const ROBOKASSA_TEST = process.env.ROBOKASSA_TEST !== 'false' // default: test mode
const BASE_URL = process.env.NEXT_PUBLIC_URL || 'https://airazum.com'

function generateRobokassaURL(amount: number, invId: number, description: string, paymentId: string): string {
  // Robokassa signature v1: MerchantLogin:OutSum:InvId:Receipt:Password#1:Shp_paymentId=xxx
  const receipt = JSON.stringify({
    items: [{
      name: description,
      quantity: 1,
      sum: amount,
      payment_method: 'full_payment',
      payment_object: 'service',
      tax: 'none',
    }]
  })

  const receiptEncoded = encodeURIComponent(receipt)
  const shpParam = `Shp_paymentId=${paymentId}`

  // SignatureValue = MD5(MerchantLogin:OutSum:InvId:Receipt:Password#1:Shp_...)
  const signatureStr = `${ROBOKASSA_LOGIN}:${amount.toFixed(2)}:${invId}:${receiptEncoded}:${ROBOKASSA_PASS1}:${shpParam}`
  const signature = crypto.createHash('md5').update(signatureStr).digest('hex')

  const params = new URLSearchParams({
    MerchantLogin: ROBOKASSA_LOGIN,
    OutSum: amount.toFixed(2),
    InvId: invId.toString(),
    Description: description,
    SignatureValue: signature,
    Receipt: receiptEncoded,
    Culture: 'ru',
    Encoding: 'utf-8',
    Shp_paymentId: paymentId,
    ...(ROBOKASSA_TEST ? { IsTest: '1' } : {}),
  })

  return `https://auth.robokassa.ru/Merchant/Index.aspx?${params.toString()}`
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('razum_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Необходимо войти в аккаунт' }, { status: 401 })
    }

    const userId = verifyToken(token)
    if (!userId) {
      return NextResponse.json({ error: 'Сессия истекла' }, { status: 401 })
    }

    const user = getUserById(userId)
    if (!user) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    }

    const { plan } = await req.json()
    const planInfo = PLANS[plan as keyof typeof PLANS]
    if (!planInfo || plan === 'free') {
      return NextResponse.json({ error: 'Некорректный тариф' }, { status: 400 })
    }

    // Create payment record in DB
    const payment = createPayment(userId, planInfo.price, plan, 'robokassa')

    if (!ROBOKASSA_LOGIN || !ROBOKASSA_PASS1) {
      // Robokassa not configured — dev mode, auto-activate
      upgradePlan(userId, plan)
      console.log(`[Payment] DEV MODE: auto-activated plan=${plan} for user=${userId}`)
      return NextResponse.json({
        confirmation_url: `${BASE_URL}/account?payment=success`,
        payment_id: payment.id,
        dev_mode: true,
      })
    }

    // Generate InvId from payment record (sequential from DB or hash)
    const invId = Math.abs(
      payment.id.replace(/-/g, '').slice(0, 10).split('')
        .reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0)
    ) % 999999999 + 1

    const description = `Razum AI — тариф ${planInfo.name}`

    const confirmationUrl = generateRobokassaURL(
      planInfo.price,
      invId,
      description,
      payment.id
    )

    console.log(`[Payment] Created: user=${userId} plan=${plan} amount=${planInfo.price} paymentId=${payment.id}`)

    return NextResponse.json({
      confirmation_url: confirmationUrl,
      payment_id: payment.id,
    })
  } catch (err) {
    console.error('[Payment] Create error:', err)
    return NextResponse.json({ error: 'Ошибка создания платежа' }, { status: 500 })
  }
}
