import { NextRequest, NextResponse } from 'next/server'
import { getNetworkStats, getOnlineMiners } from '@/lib/db'
import { getQueueStats } from '@/lib/taskQueue'

// GET /api/network — Public network statistics
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 100)
    const offset = Math.max(Number(url.searchParams.get('offset')) || 0, 0)

    const stats = getNetworkStats()
    const onlineMiners = getOnlineMiners(undefined, limit, offset)
    const queueStats = getQueueStats()

    return NextResponse.json({
      ...stats,
      queue: queueStats,
      miners: onlineMiners.map(m => ({
        id: m.id,
        name: m.name,
        gpuModel: m.gpuModel,
        vram: m.vram,
        status: m.status,
        reputation: m.reputation,
        totalTasks: m.totalTasks,
        models: m.models,
        lastSeen: m.lastSeen,
        // Don't expose: walletAddress, apiKey, ip, port
      })),
      pagination: { limit, offset },
    })
  } catch (e) {
    console.error('[Network] Stats error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
