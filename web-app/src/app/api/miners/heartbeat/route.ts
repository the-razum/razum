import { NextRequest, NextResponse } from 'next/server'
import { getMinerByApiKey, updateMinerStatus, getNetworkStats } from '@/lib/db'

// POST /api/miners/heartbeat — Miner sends heartbeat to stay online
export async function POST(req: NextRequest) {
  try {
    const { apiKey, status, models, publicKey } = await req.json()

    if (!apiKey) {
      return NextResponse.json({ error: 'apiKey required' }, { status: 400 })
    }

    const miner = getMinerByApiKey(apiKey)
    if (!miner) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || ''
    updateMinerStatus(miner.id, status || 'online', ip, undefined, Array.isArray(models) ? models : undefined)

    // Save ECDSA public key if provided and not yet stored
    if (publicKey && typeof publicKey === 'string' && publicKey.includes('BEGIN PUBLIC KEY')) {
      try {
        const { updateMinerPublicKey, getMinerPublicKey } = await import('@/lib/db')
        const existing = getMinerPublicKey(miner.id)
        if (!existing) {
          updateMinerPublicKey(miner.id, publicKey)
          console.log('[Miner] Public key registered via heartbeat for ' + miner.id.slice(0, 8))
        }
      } catch (e) {
        console.error('[Miner] Failed to save public key:', e)
      }
    }

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
