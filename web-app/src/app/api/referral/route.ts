import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { ensureReferralCode, getReferralStats } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('razum_token')?.value
  const userId = token ? verifyToken(token) : null
  if (!userId) return NextResponse.json({ error: 'auth required' }, { status: 401 })
  const code = ensureReferralCode(userId)
  const stats = getReferralStats(userId)
  const url = (process.env.NEXT_PUBLIC_URL || 'https://airazum.com') + '/r/' + code
  return NextResponse.json({ url, ...stats })
}
