import * as crypto from 'crypto'

/**
 * SQLite-backed task queue for Razum AI.
 *
 * Tasks are persisted in the `tasks` table (survives PM2 restarts).
 * Active callbacks and stream chunks remain in globalThis (tied to
 * the current HTTP request lifecycle — if PM2 restarts, the connection
 * breaks anyway).
 *
 * On module load, stale tasks (PENDING/ASSIGNED older than 5 min)
 * are cleaned up.
 */

// ─── DB access ─────────────────────────────────────────────────────

function getDB() {
  // Reuse the same DB singleton from db.ts
  // We import lazily to avoid circular deps
  const { existsSync, mkdirSync } = require('fs')
  const { join } = require('path')

  if (!(globalThis as any).__razumTaskDB) {
    const DATA_DIR = process.env.DATA_DIR || join(process.cwd(), 'data')
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })

    const Database = require('better-sqlite3')
    const db = new Database(join(DATA_DIR, 'razum.db'))
    db.pragma('journal_mode = WAL')
    db.pragma('busy_timeout = 5000')

    // Ensure tasks table exists with stream support columns
    db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        userId TEXT,
        minerId TEXT,
        model TEXT NOT NULL,
        prompt TEXT NOT NULL,
        messages TEXT NOT NULL DEFAULT '[]',
        status TEXT DEFAULT 'pending',
        result TEXT DEFAULT '',
        createdAt TEXT NOT NULL,
        startedAt TEXT DEFAULT '',
        completedAt TEXT DEFAULT '',
        tokensUsed INTEGER DEFAULT 0,
        reward REAL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_minerId ON tasks(minerId);
    `)

    // Add messages column if missing (migration)
    try { db.exec(`ALTER TABLE tasks ADD COLUMN messages TEXT NOT NULL DEFAULT '[]'`) } catch {}

    // Clean up stale tasks on startup
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const cleaned = db.prepare(`
      UPDATE tasks SET status = 'failed'
      WHERE status IN ('pending', 'assigned') AND createdAt < ?
    `).run(fiveMinAgo)
    if (cleaned.changes > 0) {
      console.log(`[TaskQueue] Cleaned up ${cleaned.changes} stale tasks on startup`)
    }

    ;(globalThis as any).__razumTaskDB = db
  }
  return (globalThis as any).__razumTaskDB
}

// ─── types ──────────────────────────────────────────────────────────

interface TaskCallback {
  resolve: (value: any) => void
  reject: (error: any) => void
  timeout: NodeJS.Timeout
}

interface StreamState {
  chunks: string[]
  done: boolean
}

// ─── globalThis for callbacks & streams ─────────────────────────────

declare global {
  var __razumCallbacks: Map<string, TaskCallback> | undefined
  var __razumStreams: Map<string, StreamState> | undefined
}

function getCallbacks(): Map<string, TaskCallback> {
  if (!globalThis.__razumCallbacks) {
    globalThis.__razumCallbacks = new Map()
  }
  return globalThis.__razumCallbacks
}

function getStreams(): Map<string, StreamState> {
  if (!globalThis.__razumStreams) {
    globalThis.__razumStreams = new Map()
  }
  return globalThis.__razumStreams
}

// ─── public API ─────────────────────────────────────────────────────

export function addTaskToQueue(task: {
  model: string
  prompt: string
  messages: Array<{ role: string; content: string }>
}): { taskId: string; promise: Promise<any> } {
  const db = getDB()
  const taskId = crypto.randomUUID()
  const now = new Date().toISOString()

  // Persist task in SQLite
  db.prepare(`
    INSERT INTO tasks (id, model, prompt, messages, status, createdAt)
    VALUES (?, ?, ?, ?, 'pending', ?)
  `).run(taskId, task.model, task.prompt, JSON.stringify(task.messages), now)

  // Initialize stream state
  getStreams().set(taskId, { chunks: [], done: false })

  // Create callback for async resolution
  const callbacks = getCallbacks()
  const promise = new Promise<any>((resolve, reject) => {
    const timeout = setTimeout(() => {
      callbacks.delete(taskId)
      getStreams().delete(taskId)
      // Mark task as failed in DB
      db.prepare(`UPDATE tasks SET status = 'failed' WHERE id = ? AND status IN ('pending', 'assigned')`).run(taskId)
      reject(new Error('Task timeout — no miner available'))
    }, 180_000) // 3 minutes

    callbacks.set(taskId, { resolve, reject, timeout })
  })

  const stats = getQueueStats()
  console.log(`[TaskQueue] Added task ${taskId.slice(0, 8)} model=${task.model} pending=${stats.pending}`)
  return { taskId, promise }
}

export function getNextTask(minerModels: string[]): any | null {
  const db = getDB()
  // Get all pending tasks, check if miner supports the model
  const tasks = db.prepare(`
    SELECT id, model, prompt, messages, createdAt
    FROM tasks WHERE status = 'pending'
    ORDER BY createdAt ASC
  `).all() as any[]

  for (const task of tasks) {
    if (minerModels.includes(task.model)) {
      return {
        id: task.id,
        model: task.model,
        prompt: task.prompt,
        messages: JSON.parse(task.messages || '[]'),
        createdAt: task.createdAt,
        assignedTo: null,
      }
    }
  }
  return null
}

export function assignTask(taskId: string, minerId: string): boolean {
  const db = getDB()
  const now = new Date().toISOString()
  const result = db.prepare(`
    UPDATE tasks SET status = 'assigned', minerId = ?, startedAt = ?
    WHERE id = ? AND status = 'pending'
  `).run(minerId, now, taskId)
  return result.changes > 0
}

export function pushStreamChunk(taskId: string, _minerId: string, chunk: string): boolean {
  const stream = getStreams().get(taskId)
  if (!stream) return false
  stream.chunks.push(chunk)
  return true
}

export function readStreamChunks(taskId: string, fromIndex: number): { chunks: string[]; done: boolean } | null {
  const stream = getStreams().get(taskId)
  if (!stream) {
    // Check DB — maybe task completed before we started reading
    const db = getDB()
    const task = db.prepare(`SELECT status FROM tasks WHERE id = ?`).get(taskId) as any
    if (task && task.status === 'completed') {
      return { chunks: [], done: true }
    }
    return null
  }
  return {
    chunks: stream.chunks.slice(fromIndex),
    done: stream.done,
  }
}

export function completeTask(taskId: string, minerId: string, result: any): boolean {
  const db = getDB()
  const now = new Date().toISOString()

  // Update DB
  const dbResult = db.prepare(`
    UPDATE tasks SET status = 'completed', completedAt = ?, result = ?,
      tokensUsed = COALESCE(?, 0)
    WHERE id = ? AND minerId = ? AND status = 'assigned'
  `).run(now, JSON.stringify(result), result?.tokens || 0, taskId, minerId)

  if (dbResult.changes === 0) return false

  // Mark stream as done
  const stream = getStreams().get(taskId)
  if (stream) stream.done = true

  // Resolve the in-process promise (Chat route)
  const callbacks = getCallbacks()
  const cb = callbacks.get(taskId)
  if (cb) {
    clearTimeout(cb.timeout)
    cb.resolve(result)
    callbacks.delete(taskId)
  }

  // Clean up stream after 10s (let SSE readers drain)
  setTimeout(() => {
    getStreams().delete(taskId)
  }, 10_000)

  return true
}

export function getTaskResult(taskId: string): any | null {
  const db = getDB()
  const task = db.prepare(`SELECT result FROM tasks WHERE id = ?`).get(taskId) as any
  if (!task || !task.result) return null
  try { return JSON.parse(task.result) } catch { return null }
}

export function getTaskById(taskId: string): any | null {
  const db = getDB()
  const task = db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(taskId) as any
  if (!task) return null
  return {
    ...task,
    messages: JSON.parse(task.messages || '[]'),
    streamChunks: getStreams().get(taskId)?.chunks || [],
    streamDone: getStreams().get(taskId)?.done || task.status === 'completed',
    completedResult: task.result ? JSON.parse(task.result) : null,
  }
}

export function getQueueStats() {
  const db = getDB()
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'assigned' THEN 1 ELSE 0 END) as assigned
    FROM tasks
    WHERE status IN ('pending', 'assigned')
  `).get() as any
  return {
    total: stats.total || 0,
    pending: stats.pending || 0,
    assigned: stats.assigned || 0,
  }
}
