import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const DB_PATH = join(process.cwd(), 'data', 'users.json')

function upgradePlan(userId: string, plan: string) {
  try {
    const db = JSON.parse(readFileSync(DB_PATH, 'utf-8'))
    const user = db.users.find((u: any) => u.id === userId)
    if (user) {
      user.plan = plan
      writeFileSync(DB_PATH, JSON.stringify(db, null, 2))
      console.log(`[Payment] User ${userId} upgraded to ${plan}`)
      return true
    }
    return false
  } catch (e) {
    console.error('DB error:', e)
    return false
  }
}

// ЮKassa webhook handler
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // ЮKassa sends event notifications
    if (body.event === 'payment.succeeded') {
      const payment = body.object
      const { userId, plan } = payment.metadata || {}

      if (userId && plan) {
        upgradePlan(userId, plan)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Webhook error:', e)
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 })
  }
}

// Dev mode: simulate payment (GET request)
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const simulate = url.searchParams.get('simulate')
  const userId = url.searchParams.get('userId')
  const plan = url.searchParams.get('plan')

  if (simulate === 'true' && userId && plan) {
    upgradePlan(userId, plan)
    // Redirect to chat with success
    return NextResponse.redirect(new URL('/chat?payment=success', req.url))
  }

  return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
}
