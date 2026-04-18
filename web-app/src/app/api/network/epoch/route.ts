import { NextResponse } from 'next/server'
import { getEpochInfo } from '@/lib/rewards'

// GET /api/network/epoch — Current epoch info
export async function GET() {
  try {
    const info = getEpochInfo()
    return NextResponse.json(info)
  } catch (e) {
    console.error('[Epoch] Error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
