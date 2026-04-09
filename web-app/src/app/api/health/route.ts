import { NextResponse } from 'next/server'
import { getNetworkStats } from '@/lib/db'

// GET /api/health — Health check endpoint for monitoring
export async function GET() {
  const startTime = Date.now()

  try {
    // Check database
    const stats = getNetworkStats()

    // Check if we have online miners (decentralized — no local Ollama on VPS)
    const hasMiners = stats.onlineMiners > 0
    const responseTime = Date.now() - startTime
    const healthy = hasMiners // need at least one miner

    return NextResponse.json({
      status: healthy ? 'healthy' : 'degraded',
      version: '0.1.0',
      uptime: process.uptime(),
      responseTimeMs: responseTime,
      checks: {
        database: 'ok',
        miners: hasMiners ? 'ok' : 'no miners online',
      },
      stats: {
        totalUsers: stats.totalUsers,
        onlineMiners: stats.onlineMiners,
      },
      env: {
        nodeEnv: process.env.NODE_ENV || 'development',
        hasAuthSecret: !!process.env.AUTH_SECRET,
        hasYukassa: !!process.env.YUKASSA_SHOP_ID,
        hasBraveSearch: !!process.env.BRAVE_SEARCH_API_KEY,
      },
    }, { status: healthy ? 200 : 503 })
  } catch (e) {
    return NextResponse.json({
      status: 'unhealthy',
      error: 'Database check failed',
    }, { status: 503 })
  }
}
