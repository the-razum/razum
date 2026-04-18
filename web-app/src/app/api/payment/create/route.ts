import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { getUserById, createPayment, upgradePlan, PLANS } from "@/lib/db"

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY || ""
const BASE_URL = process.env.NEXT_PUBLIC_URL || "https://airazum.com"

// Stripe Price IDs (set in env or create on-the-fly)
const STRIPE_PRICES: Record<string, string> = {
  start: process.env.STRIPE_PRICE_START || "",
  basic: process.env.STRIPE_PRICE_BASIC || "",
  pro: process.env.STRIPE_PRICE_PRO || "",
}

async function createStripeCheckout(userId: string, email: string, plan: string, paymentId: string) {
  const planInfo = PLANS[plan as keyof typeof PLANS]
  if (!planInfo) throw new Error("Invalid plan")

  // If no Stripe price ID configured, create a one-time payment session
  const body: any = {
    mode: "payment",
    success_url: `${BASE_URL}/account?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${BASE_URL}/pricing?payment=cancelled`,
    customer_email: email,
    metadata: { userId, plan, paymentId },
    line_items: [{
      price_data: {
        currency: "rub",
        product_data: {
          name: `Razum AI — ${planInfo.name}`,
          description: `${planInfo.requestsPerDay} запросов/день, 30 дней`,
        },
        unit_amount: planInfo.price * 100, // kopecks
      },
      quantity: 1,
    }],
    payment_method_types: ["card"],
  }

  // If Stripe Price ID exists, use it for recurring subscription
  if (STRIPE_PRICES[plan]) {
    body.mode = "subscription"
    body.line_items = [{ price: STRIPE_PRICES[plan], quantity: 1 }]
    delete body.payment_method_types
  }

  const resp = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${STRIPE_SECRET}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(flattenObject(body)).toString(),
  })

  const session = await resp.json()
  if (!resp.ok) throw new Error(session.error?.message || "Stripe error")
  return session
}

// Flatten nested object for x-www-form-urlencoded
function flattenObject(obj: any, prefix = ""): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, val] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}[${key}]` : key
    if (val === undefined || val === null) continue
    if (Array.isArray(val)) {
      val.forEach((item, i) => {
        if (typeof item === "object") {
          Object.assign(result, flattenObject(item, `${fullKey}[${i}]`))
        } else {
          result[`${fullKey}[${i}]`] = String(item)
        }
      })
    } else if (typeof val === "object") {
      Object.assign(result, flattenObject(val, fullKey))
    } else {
      result[fullKey] = String(val)
    }
  }
  return result
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("razum_token")?.value
    if (!token) return NextResponse.json({ error: "Необходимо войти" }, { status: 401 })

    const userId = verifyToken(token)
    if (!userId) return NextResponse.json({ error: "Сессия истекла" }, { status: 401 })

    const user = getUserById(userId)
    if (!user) return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })

    const { plan } = await req.json()
    const planInfo = PLANS[plan as keyof typeof PLANS]
    if (!planInfo || plan === "free") {
      return NextResponse.json({ error: "Некорректный тариф" }, { status: 400 })
    }

    const payment = createPayment(userId, planInfo.price, plan, "stripe")

    if (!STRIPE_SECRET) {
      // Dev mode — auto-activate
      upgradePlan(userId, plan)
      console.log(`[Payment] DEV: auto-activated plan=${plan} user=${userId}`)
      return NextResponse.json({
        confirmation_url: `${BASE_URL}/account?payment=success`,
        payment_id: payment.id,
        dev_mode: true,
      })
    }

    const session = await createStripeCheckout(userId, user.email, plan, payment.id)
    console.log(`[Payment] Stripe session: user=${userId} plan=${plan} session=${session.id}`)

    return NextResponse.json({
      confirmation_url: session.url,
      payment_id: payment.id,
      session_id: session.id,
    })
  } catch (err: any) {
    console.error("[Payment] Error:", err.message)
    return NextResponse.json({ error: "Ошибка создания платежа" }, { status: 500 })
  }
}
