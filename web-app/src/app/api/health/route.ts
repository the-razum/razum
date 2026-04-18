import { NextResponse } from 'next/server'
import { getNetworkStats } from '@/lib/db'
import { startVerificationSweeper } from '@/lib/nodeVerifier'

// Start node verification on first health check (app startup)
let verifierStarted = false

// GET /api/health — Health check endpoint for monitoring
export async function GET() {
  const startTime = Date.now()

  // Initialize verification sweeper (once)
  if (!verifierStarted) {
    try {
      startVerificationSweeper()
      verifierStarted = true
    } catch (e) {
      console.error('[Health] Failed to start verifier:', e)
    }
  }

  try {
    // Check database
    const stats = getNetworkStats()

    // Check if we have online miners (decentralized — no local Ollama on VPS)
    const hasMiners = stats.onlineMiners > 0
    const responseTime = Date.now() - startTime
    const healthy = hasMiners // need at least one miner

    return NextResponse.json({
      status: healthy ? 'healthy' : 'degraded',
      version: '0.2.0',
      uptime: process.uptime(),
      responseTimeMs: responseTime,
      checks: {
        database: 'ok',
        miners: hasMiners ? 'ok' : 'no miners online',
        nodeVerification: verifierStarted ? 'active' : 'inactive',
      },
      stats: {
        totalUsers: stats.totalUsers,
        onlineMiners: stats.onlineMiners,
      },
      features: {
        openaiApi: true,
        ecdsaSigning: true,
        nodeVerification: true,
      },
      env: {
        nodeEnv: process.env.NODE_ENV || 'development',
        hasAuthSecret: !!process.env.AUTH_SECRET,
        hasRobokassa: !!process.env.ROBOKASSA_LOGIN,
        hasResend: !!process.env.RESEND_API_KEY,
      },
    }, { status: healthy ? 200 : 503 })
  } catch (e) {
    return NextResponse.json({
      status: 'unhealthy',
      error: 'Database check failed',
    }, { status: 503 })
  }
}
