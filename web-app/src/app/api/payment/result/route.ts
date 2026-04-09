import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

/**
 * Robokassa Success URL redirect handler.
 * User is redirected here after successful payment.
 * Verifies signature using Password#1 before showing success.
 *
 * Robokassa sends: OutSum, InvId, SignatureValue, Shp_paymentId
 * Signature = MD5(OutSum:InvId:Password#1:Shp_paymentId=xxx)
 */

const ROBOKASSA_PASS1 = process.env.ROBOKASSA_PASS1 || ''
const BASE_URL = process.env.NEXT_PUBLIC_URL || 'https://airazum.com'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const outSum = url.searchParams.get('OutSum') || ''
  const invId = url.searchParams.get('InvId') || ''
  const signatureValue = (url.searchParams.get('SignatureValue') || '').toLowerCase()
  const paymentId = url.searchParams.get('Shp_paymentId') || ''

  // If no signature params — could be a direct visit or dev mode redirect
  if (!outSum || !invId || !signatureValue) {
    console.warn(`[Payment Result] Missing params, redirecting with unknown status`)
    return NextResponse.redirect(`${BASE_URL}/account?payment=unknown`)
  }

  // Verify signature with Password#1 (Success URL uses PASS1)
  const shpParam = `Shp_paymentId=${paymentId}`
  const expectedSig = crypto
    .createHash('md5')
    .update(`${outSum}:${invId}:${ROBOKASSA_PASS1}:${shpParam}`)
    .digest('hex')
    .toLowerCase()

  if (signatureValue !== expectedSig) {
    console.error(`[Payment Result] Invalid signature: got=${signatureValue} expected=${expectedSig}`)
    return NextResponse.redirect(`${BASE_URL}/account?payment=failed&reason=signature`)
  }

  console.log(`[Payment Result] Verified OK: InvId=${invId} paymentId=${paymentId} sum=${outSum}`)

  // Signature valid — redirect to success page
  return NextResponse.redirect(`${BASE_URL}/account?payment=success&inv=${invId}`)
}
