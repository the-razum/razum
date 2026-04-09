import { NextRequest, NextResponse } from 'next/server'
import { getMinerByApiKey, recordTaskCompletion } from '@/lib/db'
import { getNextTask, assignTask, completeTask, getQueueStats } from '@/lib/taskQueue'
import { checkRateLimit } from '@/lib/rateLimit'

// Max reward per task to prevent manipulation
const MAX_TOKENS_PER_TASK = 4096
const REWARD_PER_TOKEN = 0.001

// GET /api/miners/task — Miner polls for available tasks
export async function GET(req: NextRequest) {
  try {
    const apiKey = req.headers.get('x-api-key')
    if (!apiKey) {
      return NextResponse.json({ error: 'X-API-Key header required' }, { status: 401 })
    }

    const miner = getMinerByApiKey(apiKey)
    if (!miner) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }

    // Rate limit polling: 60 requests per minute per miner
    const limit = checkRateLimit({
      store: 'miner-poll', key: miner.id, maxAttempts: 60, windowMs: 60 * 1000,
    })
    if (!limit.allowed) {
      return NextResponse.json({ task: null, message: 'Polling too fast' }, { status: 429 })
    }

    const stats = getQueueStats()
    console.log(`[MinerPoll] queue=${stats.total} pending=${stats.pending} minerModels=${JSON.stringify(miner.models)}`)
    console.log(`[MinerPoll] miner=${miner.id.slice(0, 8)} models=${JSON.stringify(miner.models)} queue=${stats.pending}/${stats.total}`)

    const task = getNextTask(miner.models)
    console.log(`[MinerPoll] task=${task ? task.id.slice(0, 8) : 'null'}`)

    if (!task) {
      return NextResponse.json({ task: null, message: 'No tasks available' })
    }

    // Atomic assign — returns false if already assigned (race condition protection)
    const assigned = assignTask(task.id, miner.id)
    if (!assigned) {
      return NextResponse.json({ task: null, message: 'Task already taken' })
    }

    return NextResponse.json({
      task: {
        id: task.id,
        model: task.model,
        messages: task.messages,
        createdAt: task.createdAt,
      },
    })
  } catch (e) {
    console.error('[Miner] Task fetch error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST /api/miners/task — Miner submits task result
export async function POST(req: NextRequest) {
  try {
    const text = await req.text()
    if (text.length > 500 * 1024) { // 500KB max result
      return NextResponse.json({ error: 'Result too large' }, { status: 413 })
    }

    const { apiKey, taskId, result, success, tokensUsed } = JSON.parse(text)

    if (!apiKey || !taskId) {
      return NextResponse.json({ error: 'apiKey and taskId required' }, { status: 400 })
    }

    const miner = getMinerByApiKey(apiKey)
    if (!miner) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }

    // Cap tokens to prevent reward manipulation
    const cappedTokens = Math.min(Math.max(0, Number(tokensUsed) || 0), MAX_TOKENS_PER_TASK)
    const baseReward = cappedTokens * REWARD_PER_TOKEN
    const reputationMultiplier = Math.min(miner.reputation / 100, 2)
    const reward = success !== false ? baseReward * reputationMultiplier : 0

    // Record in database
    recordTaskCompletion(miner.id, taskId, success !== false, reward)

    // Complete task and resolve waiting promise
    const completed = completeTask(taskId, miner.id, {
      result: typeof result === 'string' ? result.slice(0, 100000) : '', // 100KB max
      success: success !== false,
      minerId: miner.id,
      tokensUsed: cappedTokens,
    })

    if (!completed) {
      return NextResponse.json({ error: 'Task not found or not assigned to you' }, { status: 404 })
    }

    return NextResponse.json({
      ok: true,
      reward,
      miner: {
        totalRewards: miner.totalRewards + reward,
        reputation: miner.reputation + (success !== false ? 1 : -5),
      },
    })
  } catch (e) {
    console.error('[Miner] Task submit error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
