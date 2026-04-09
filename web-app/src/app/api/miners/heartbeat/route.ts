import { NextRequest, NextResponse } from 'next/server'
import { getMinerByApiKey, updateMinerStatus, getNetworkStats } from '@/lib/db'

// POST /api/miners/heartbeat — Miner sends heartbeat to stay online
export async function POST(req: NextRequest) {
  try {
    const { apiKey, status, models } = await req.json()

    if (!apiKey) {
      return NextResponse.json({ error: 'apiKey required' }, { status: 400 })
    }

    const miner = getMinerByApiKey(apiKey)
    if (!miner) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || ''
    updateMinerStatus(miner.id, status || 'online', ip)

    return NextResponse.json({
      ok: true,
      miner: {
        id: miner.id,
        reputation: miner.reputation,
        totalTasks: miner.totalTasks,
        totalRewards: miner.totalRewards,
      },
      network: getNetworkStats(),
    })
  } catch (e) {
    console.error('Heartbeat error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
