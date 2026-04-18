import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { completePayment, upgradePlan, getPaymentById } from "@/lib/db"

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || ""
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY || ""

function verifyStripeSignature(payload: string, signature: string, secret: string): boolean {
  if (!secret) return false
  const parts = signature.split(",").reduce((acc, part) => {
    const [k, v] = part.split("=")
    acc[k] = v
    return acc
  }, {} as Record<string, string>)

  const timestamp = parts["t"]
  const sig = parts["v1"]
  if (!timestamp || !sig) return false

  // Check timestamp is within 5 minutes
  const age = Math.abs(Date.now() / 1000 - parseInt(timestamp))
  if (age > 300) return false

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex")

  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const signature = req.headers.get("stripe-signature") || ""

    // Verify signature (skip in dev)
    if (STRIPE_WEBHOOK_SECRET && !verifyStripeSignature(body, signature, STRIPE_WEBHOOK_SECRET)) {
      console.warn("[Webhook] Invalid Stripe signature")
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    const event = JSON.parse(body)
    console.log(`[Webhook] Stripe event: ${event.type}`)

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object
        const { userId, plan, paymentId } = session.metadata || {}

        if (userId && plan) {
          // Activate the plan
          upgradePlan(userId, plan)

          // Complete payment record
          if (paymentId) {
            completePayment(paymentId, session.id || session.payment_intent || "")
          }

          console.log(`[Webhook] Plan activated: user=${userId} plan=${plan} session=${session.id}`)
        }
        break
      }

      case "invoice.paid": {
        // Recurring subscription payment
        const invoice = event.data.object
        const customerId = invoice.customer

        // Get customer metadata via Stripe API
        if (STRIPE_SECRET && customerId) {
          try {
            const resp = await fetch(`https://api.stripe.com/v1/customers/${customerId}`, {
              headers: { "Authorization": `Bearer ${STRIPE_SECRET}` },
            })
            const customer = await resp.json()
            const userId = customer.metadata?.userId
            const plan = customer.metadata?.plan
            if (userId && plan) {
              upgradePlan(userId, plan)
              console.log(`[Webhook] Subscription renewed: user=${userId} plan=${plan}`)
            }
          } catch (e) {
            console.error("[Webhook] Customer fetch error:", e)
          }
        }
        break
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object
        // Downgrade to free (with 3-day grace)
        console.log(`[Webhook] Subscription cancelled: ${sub.id}`)
        // Grace period: planExpiresAt already set, user will be downgraded when it expires
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object
        console.warn(`[Webhook] Payment failed: invoice=${invoice.id} customer=${invoice.customer}`)
        // Stripe auto-retries, no action needed yet
        break
      }

      default:
        console.log(`[Webhook] Unhandled event: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error("[Webhook] Error:", err.message)
    return NextResponse.json({ error: "Webhook error" }, { status: 500 })
  }
}
