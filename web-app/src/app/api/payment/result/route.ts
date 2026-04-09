import { NextRequest, NextResponse } from 'next/server'

/**
 * Robokassa Success/Fail URL redirect handler.
 * User is redirected here after payment. Redirects to /account page.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const invId = url.searchParams.get('InvId') || ''

  // Redirect to account page with payment status
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://airazum.com'
  return NextResponse.redirect(`${baseUrl}/account?payment=success&inv=${invId}`)
}
