import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { completePayment, failPayment } from '@/lib/db'

// Robokassa Password#2 (for verifying result callback)
const ROBOKASSA_PASS2 = process.env.ROBOKASSA_PASS2 || ''

/**
 * Robokassa Result URL callback
 * Called by Robokassa server after successful payment.
 * Must respond with "OK{InvId}" to confirm receipt.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const outSum = formData.get('OutSum') as string
    const invId = formData.get('InvId') as string
    const signatureValue = (formData.get('SignatureValue') as string || '').toLowerCase()
    const paymentId = formData.get('Shp_paymentId') as string

    console.log(`[Payment Callback] Received: OutSum=${outSum} InvId=${invId} paymentId=${paymentId}`)

    if (!outSum || !invId || !signatureValue || !paymentId) {
      console.error('[Payment Callback] Missing required fields')
      return new Response('bad request', { status: 400 })
    }

    // Verify signature: MD5(OutSum:InvId:Password#2:Shp_paymentId=xxx)
    const shpParam = `Shp_paymentId=${paymentId}`
    const expectedSig = crypto
      .createHash('md5')
      .update(`${outSum}:${invId}:${ROBOKASSA_PASS2}:${shpParam}`)
      .digest('hex')
      .toLowerCase()

    if (signatureValue !== expectedSig) {
      console.error(`[Payment Callback] Invalid signature: got=${signatureValue} expected=${expectedSig}`)
      failPayment(paymentId)
      return new Response('bad sign', { status: 400 })
    }

    // Payment verified — activate plan
    const payment = completePayment(paymentId, invId)
    if (!payment) {
      console.error(`[Payment Callback] Payment not found or already completed: ${paymentId}`)
      // Still return OK to prevent Robokassa from retrying
      return new Response(`OK${invId}`, { status: 200 })
    }

    console.log(`[Payment Callback] SUCCESS: paymentId=${paymentId} plan=${payment.plan} amount=${outSum}`)

    // Robokassa expects exactly "OK{InvId}" response
    return new Response(`OK${invId}`, { status: 200 })
  } catch (err) {
    console.error('[Payment Callback] Error:', err)
    return new Response('error', { status: 500 })
  }
}

// Robokassa may also send GET requests
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const outSum = url.searchParams.get('OutSum') || ''
  const invId = url.searchParams.get('InvId') || ''
  const signatureValue = (url.searchParams.get('SignatureValue') || '').toLowerCase()
  const paymentId = url.searchParams.get('Shp_paymentId') || ''

  if (!outSum || !invId || !signatureValue || !paymentId) {
    return new Response('bad request', { status: 400 })
  }

  const shpParam = `Shp_paymentId=${paymentId}`
  const expectedSig = crypto
    .createHash('md5')
    .update(`${outSum}:${invId}:${ROBOKASSA_PASS2}:${shpParam}`)
    .digest('hex')
    .toLowerCase()

  if (signatureValue !== expectedSig) {
    failPayment(paymentId)
    return new Response('bad sign', { status: 400 })
  }

  const payment = completePayment(paymentId, invId)
  if (payment) {
    console.log(`[Payment Callback GET] SUCCESS: paymentId=${paymentId}`)
  }

  return new Response(`OK${invId}`, { status: 200 })
}
