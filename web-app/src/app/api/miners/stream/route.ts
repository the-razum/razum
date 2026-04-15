import { NextRequest, NextResponse } from 'next/server'
import { getMinerByApiKey } from '@/lib/db'
import { pushStreamChunk } from '@/lib/taskQueue'

// POST /api/miners/stream — miner pushes an incremental token chunk for an active task
// Body: { apiKey, taskId, chunk }
export async function POST(req: NextRequest) {
  try {
    const { apiKey, taskId, chunk } = await req.json()
    if (!apiKey || !taskId || typeof chunk !== 'string') {
      return NextResponse.json({ error: 'apiKey, taskId, chunk required' }, { status: 400 })
    }
    const miner = getMinerByApiKey(apiKey)
    if (!miner) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }
    // Cap per-chunk size to prevent abuse
    const capped = chunk.slice(0, 8000)
    const ok = pushStreamChunk(taskId, miner.id, capped)
    return NextResponse.json({ ok })
  } catch (e) {
    console.error('[Stream] error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
