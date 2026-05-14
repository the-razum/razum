import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getDB } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('razum_token')?.value
  const userId = token ? verifyToken(token) : null
  if (!userId) return NextResponse.json({ error: 'auth required' }, { status: 401 })
  const db = getDB()
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId) as any
  if (user?.role !== 'admin') return NextResponse.json({ error: 'admin only' }, { status: 403 })

  const since = req.nextUrl.searchParams.get('since') || "datetime('now','-24 hours')"

  const counts = db.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) AS completed,
      SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) AS failed,
      SUM(CASE WHEN status IN ('pending','assigned') THEN 1 ELSE 0 END) AS active
    FROM tasks WHERE createdAt > ${since}
  `).get() as any

  const latencies = db.prepare(`
    SELECT (julianday(completedAt)-julianday(startedAt))*86400000 AS ms
    FROM tasks
    WHERE status='completed' AND createdAt > ${since}
      AND completedAt IS NOT NULL AND startedAt IS NOT NULL
    ORDER BY ms
  `).all() as Array<{ms: number}>
  const lat = latencies.map(r => r.ms).filter(x => x >= 0 && x < 600000)
  const p = (q: number) => lat.length ? Math.round(lat[Math.floor(lat.length * q)] || 0) : 0
  const stats = {
    count: lat.length,
    p50: p(0.5), p75: p(0.75), p90: p(0.9), p95: p(0.95), p99: p(0.99),
    avg: lat.length ? Math.round(lat.reduce((a, b) => a + b, 0) / lat.length) : 0,
  }

  const byModel = db.prepare(`
    SELECT model, COUNT(*) AS c FROM tasks WHERE createdAt > ${since} GROUP BY model ORDER BY c DESC
  `).all() as any[]

  const miners = db.prepare(`SELECT id, name, status, lastSeen, totalTasks, totalRewards, reputation FROM miners`).all() as any[]

  return NextResponse.json({
    counts, latencyMs: stats, byModel, miners,
    since: req.nextUrl.searchParams.get('since') || 'last 24h'
  })
}
