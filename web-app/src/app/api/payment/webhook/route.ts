import { NextRequest, NextResponse } from 'next/server'
import { upgradePlan } from '@/lib/db'
import crypto from 'crypto'
import { getClientIP } from '@/lib/rateLimit'

// ЮKassa IP whitelist for webhook verification
const YUKASSA_IP_PREFIXES = [
  '185.71.76.', '185.71.77.', '77.75.153.', '77.75.156.',
  '77.75.154.', '77.75.155.', '2a02:5180:0:'
]

function verifyYukassaIP(req: NextRequest): boolean {
  if (!process.env.YUKASSA_SECRET_KEY) return false // not in production mode
  const ip = getClientIP(req)
  return YUKASSA_IP_PREFIXES.some(prefix => ip.startsWith(prefix))
}

// ЮKassa webhook handler (production)
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIP(req)

    // In production, verify IP
    if (process.env.YUKASSA_SECRET_KEY && !verifyYukassaIP(req)) {
      console.warn(`[Webhook] Rejected from IP: ${ip}`)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()

    if (body.event === 'payment.succeeded') {
      const payment = body.object
      const { userId, plan } = payment.metadata || {}

      if (userId && plan) {
        const success = upgradePlan(userId, plan)
        console.log(`[Webhook] Payment ${payment.id}: user=${userId} plan=${plan} success=${success} ip=${ip}`)
      } else {
        console.warn(`[Webhook] Missing metadata in payment: ${payment.id}`)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[Webhook] Error:', e)
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 })
  }
}

// Dev mode: simulate payment via signed token
export async function GET(req: NextRequest) {
  // Block in production
  if (process.env.YUKASSA_SECRET_KEY) {
    return NextResponse.json({ error: 'Disabled in production' }, { status: 403 })
  }

  const url = new URL(req.url)
  const devToken = url.searchParams.get('dev_token')

  if (!devToken) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  try {
    // Verify signed dev token
    const [payloadB64, sig] = devToken.split('.')
    if (!payloadB64 || !sig) throw new Error('Invalid token format')

    const expectedSig = crypto.createHmac('sha256', 'dev-payment-secret').update(payloadB64).digest('hex')

    // Timing-safe comparison
    if (sig.length !== expectedSig.length ||
        !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
      throw new Error('Invalid signature')
    }

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString())
    const { userId, plan, ts } = payload

    // Token expires in 5 minutes
    if (Date.now() - ts > 5 * 60 * 1000) {
      return NextResponse.json({ error: 'Token expired' }, { status: 400 })
    }

    if (userId && plan) {
      upgradePlan(userId, plan)
      console.log(`[Payment-Dev] Simulated upgrade: user=${userId} plan=${plan}`)
      return NextResponse.redirect(new URL('/chat?payment=success', req.url))
    }
  } catch (e) {
    console.error('[Payment-Dev] Invalid token:', e)
  }

  return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
}
