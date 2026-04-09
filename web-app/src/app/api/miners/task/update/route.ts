import { NextRequest, NextResponse } from 'next/server'
import { getMinerByApiKey } from '@/lib/db'
import { pushStreamChunk } from '@/lib/taskQueue'

// POST /api/miners/task/update — Miner sends streaming chunks
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { apiKey, taskId, chunk } = body

    if (!apiKey || !taskId || typeof chunk !== 'string') {
      return NextResponse.json({ error: 'apiKey, taskId, and chunk required' }, { status: 400 })
    }

    const miner = getMinerByApiKey(apiKey)
    if (!miner) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }

    const ok = pushStreamChunk(taskId, miner.id, chunk)
    if (!ok) {
      return NextResponse.json({ error: 'Task not found or not assigned to you' }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[Miner] Stream update error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
