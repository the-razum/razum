import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { getChainStatus, getTotalSupply, getValidatorCount } from '@/lib/chain'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const db = getDB()
  const users = (db.prepare('SELECT COUNT(*) AS c FROM users').get() as any).c
  const usersToday = (db.prepare("SELECT COUNT(*) AS c FROM users WHERE createdAt > datetime('now','-1 day')").get() as any).c
  const miners = db.prepare("SELECT name, status, totalTasks, totalRewards, reputation, lastSeen FROM miners ORDER BY totalRewards DESC").all() as any[]
  const minersOnline = miners.filter(m => m.status === 'online').length
  const tasks = (db.prepare("SELECT COUNT(*) AS c FROM tasks").get() as any).c
  const tasksToday = (db.prepare("SELECT COUNT(*) AS c FROM tasks WHERE createdAt > datetime('now','-1 day')").get() as any).c
  const tasksDone = (db.prepare("SELECT COUNT(*) AS c FROM tasks WHERE status='completed'").get() as any).c
  const totalRewards = (db.prepare("SELECT COALESCE(SUM(totalRewards),0) AS s FROM miners").get() as any).s
  const totalTokens = (db.prepare("SELECT COALESCE(SUM(tokensUsed),0) AS s FROM tasks WHERE status='completed'").get() as any).s
  const agents = (db.prepare('SELECT COUNT(*) AS c FROM agents').get() as any).c
  const publicAgents = (db.prepare("SELECT COUNT(*) AS c FROM agents WHERE isPublic=1").get() as any).c

  // Daily task counts (last 7 days)
  const dailyTasks = db.prepare(`
    SELECT DATE(completedAt) AS day, COUNT(*) AS c
    FROM tasks
    WHERE status='completed' AND completedAt > datetime('now','-7 days')
    GROUP BY day ORDER BY day
  `).all() as any[]

  const [chain, supply, validators] = await Promise.all([
    getChainStatus(), getTotalSupply(), getValidatorCount(),
  ])

  return NextResponse.json({
    users: { total: users, today: usersToday },
    miners: {
      total: miners.length,
      online: minersOnline,
      leaderboard: miners.slice(0, 10).map(m => ({
        name: m.name,
        status: m.status,
        tasks: m.totalTasks,
        rewards: Math.round(m.totalRewards * 100) / 100,
        reputation: m.reputation,
      })),
    },
    tasks: { total: tasks, today: tasksToday, completed: tasksDone, daily: dailyTasks },
    tokens: {
      rewardedRZM: Math.round(totalRewards * 100) / 100,
      processedByMiners: totalTokens,
    },
    agents: { total: agents, public: publicAgents },
    chain: chain ? {
      chainId: chain.chainId,
      height: chain.height,
      validators,
      supplyRZM: supply ? Math.round(supply.rzm) : 0,
    } : null,
  }, { headers: { 'Cache-Control': 'public, max-age=15' } })
}
