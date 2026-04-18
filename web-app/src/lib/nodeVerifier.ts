/**
 * Node Verification System
 *
 * Periodically sends hidden test tasks to miners with known-good answers.
 * If a miner returns a wrong answer → reputation penalty + potential ban.
 * If a miner returns correct answer → reputation boost.
 *
 * This prevents miners from returning garbage or cached responses.
 *
 * Inspired by Gonka's Proof of Compute, simplified for launch.
 */

import * as crypto from 'crypto'

// Test challenges with expected answer patterns
// Each challenge has a question and regex patterns that a correct answer MUST match
const TEST_CHALLENGES = [
  {
    id: 'math_basic',
    messages: [
      { role: 'system', content: 'You are a helpful assistant. Answer concisely.' },
      { role: 'user', content: 'What is 15 * 17? Reply with just the number.' },
    ],
    // Must contain "255"
    expectedPatterns: [/255/],
    rejectPatterns: [/256|254|250|260/],
    model: 'any',
  },
  {
    id: 'math_add',
    messages: [
      { role: 'system', content: 'You are a helpful assistant. Answer concisely.' },
      { role: 'user', content: 'What is 123 + 456? Reply with just the number.' },
    ],
    expectedPatterns: [/579/],
    rejectPatterns: [/578|580|500/],
    model: 'any',
  },
  {
    id: 'capital_ru',
    messages: [
      { role: 'system', content: 'You are a helpful assistant. Answer in one word.' },
      { role: 'user', content: 'Столица Франции? Одно слово.' },
    ],
    expectedPatterns: [/[Пп]ариж|Paris/i],
    rejectPatterns: [],
    model: 'any',
  },
  {
    id: 'capital_en',
    messages: [
      { role: 'system', content: 'Answer in one word only.' },
      { role: 'user', content: 'Capital of Japan?' },
    ],
    expectedPatterns: [/[Тт]окио|Tokyo/i],
    rejectPatterns: [],
    model: 'any',
  },
  {
    id: 'logic_color',
    messages: [
      { role: 'system', content: 'Answer briefly.' },
      { role: 'user', content: 'Is the sky blue? Answer yes or no.' },
    ],
    expectedPatterns: [/[Дд]а|[Yy]es/],
    rejectPatterns: [/[Нн]ет|[Nn]o/],
    model: 'any',
  },
  {
    id: 'repeat_test',
    messages: [
      { role: 'system', content: 'Repeat exactly what the user says, nothing else.' },
      { role: 'user', content: 'razum-verify-7x3q' },
    ],
    expectedPatterns: [/razum-verify-7x3q/],
    rejectPatterns: [],
    model: 'any',
  },
]

interface VerificationResult {
  minerId: string
  challengeId: string
  passed: boolean
  response: string
  latencyMs: number
  timestamp: string
}

// In-memory log of recent verifications
const recentVerifications: VerificationResult[] = []
const MAX_LOG_SIZE = 500

// Track which miners are currently being tested (avoid double-testing)
const activeTests = new Set<string>()

// Pick a random challenge
function pickChallenge(): typeof TEST_CHALLENGES[0] {
  return TEST_CHALLENGES[Math.floor(Math.random() * TEST_CHALLENGES.length)]
}

// Verify a miner's response against expected patterns
function verifyResponse(challenge: typeof TEST_CHALLENGES[0], response: string): boolean {
  const text = response.trim()

  // Empty or very short response = fail
  if (text.length < 1) return false

  // Check reject patterns first
  for (const pattern of challenge.rejectPatterns) {
    if (pattern.test(text)) return false
  }

  // Check all expected patterns match
  for (const pattern of challenge.expectedPatterns) {
    if (!pattern.test(text)) return false
  }

  return true
}

/**
 * Send a verification task to a specific miner.
 * Called from the sweeper interval.
 *
 * Uses the task queue but marks the task so we can identify it.
 */
export function createVerificationTask(minerId: string): {
  taskId: string
  challenge: typeof TEST_CHALLENGES[0]
} | null {
  if (activeTests.has(minerId)) return null
  activeTests.add(minerId)

  const challenge = pickChallenge()

  // We'll use the standard task queue but tag the task
  const { addTaskToQueue } = require('@/lib/taskQueue')
  const model = getPreferredModel(minerId)

  const { taskId, promise } = addTaskToQueue({
    model,
    prompt: challenge.messages.find((m: any) => m.role === 'user')?.content || '',
    messages: challenge.messages,
  })

  // Tag this task as a verification task in memory
  getVerificationTasks().set(taskId, {
    minerId,
    challenge,
    sentAt: Date.now(),
  })

  // Handle result
  const timeout = setTimeout(() => {
    // Timeout = fail
    const info = getVerificationTasks().get(taskId)
    if (info) {
      recordVerification(minerId, challenge.id, false, '(timeout)', Date.now() - info.sentAt)
      getVerificationTasks().delete(taskId)
      activeTests.delete(minerId)
    }
  }, 60_000) // 60 second timeout for verification

  promise
    .then((result: any) => {
      clearTimeout(timeout)
      const info = getVerificationTasks().get(taskId)
      if (!info) return

      const response = typeof result?.result === 'string' ? result.result : ''
      const passed = verifyResponse(challenge, response)
      const latency = Date.now() - info.sentAt

      recordVerification(minerId, challenge.id, passed, response.slice(0, 200), latency)
      getVerificationTasks().delete(taskId)
      activeTests.delete(minerId)

      // Apply reputation changes
      applyReputationChange(minerId, passed)
    })
    .catch(() => {
      clearTimeout(timeout)
      const info = getVerificationTasks().get(taskId)
      if (info) {
        recordVerification(minerId, info.challenge.id, false, '(error)', Date.now() - info.sentAt)
        getVerificationTasks().delete(taskId)
        activeTests.delete(minerId)
      }
    })

  return { taskId, challenge }
}

function getPreferredModel(minerId: string): string {
  try {
    const { getMinerByApiKey, getDB } = require('@/lib/db')
    const db = getDB()
    const miner = db.prepare('SELECT models FROM miners WHERE id = ?').get(minerId) as any
    if (miner) {
      const models = JSON.parse(miner.models || '[]')
      if (models.length > 0) return models[0]
    }
  } catch {}
  return process.env.MODEL_QWEN || 'qwen3.5:9b'
}

// Global map for verification tasks
function getVerificationTasks(): Map<string, { minerId: string; challenge: typeof TEST_CHALLENGES[0]; sentAt: number }> {
  if (!(globalThis as any).__razumVerifyTasks) {
    (globalThis as any).__razumVerifyTasks = new Map()
  }
  return (globalThis as any).__razumVerifyTasks
}

function recordVerification(minerId: string, challengeId: string, passed: boolean, response: string, latencyMs: number) {
  const result: VerificationResult = {
    minerId,
    challengeId,
    passed,
    response: response.slice(0, 200),
    latencyMs,
    timestamp: new Date().toISOString(),
  }

  recentVerifications.unshift(result)
  if (recentVerifications.length > MAX_LOG_SIZE) {
    recentVerifications.length = MAX_LOG_SIZE
  }

  const status = passed ? 'PASS' : 'FAIL'
  console.log(`[Verify] ${status} miner=${minerId.slice(0, 8)} challenge=${challengeId} latency=${latencyMs}ms`)

  // Store in DB for persistence
  try {
    const db = require('@/lib/db').getDB()
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS verifications (
          id TEXT PRIMARY KEY,
          minerId TEXT NOT NULL,
          challengeId TEXT NOT NULL,
          passed INTEGER NOT NULL,
          response TEXT DEFAULT '',
          latencyMs INTEGER DEFAULT 0,
          createdAt TEXT NOT NULL
        )
      `)
    } catch {} // table might exist

    db.prepare(`
      INSERT INTO verifications (id, minerId, challengeId, passed, response, latencyMs, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(crypto.randomUUID(), minerId, challengeId, passed ? 1 : 0, response.slice(0, 200), latencyMs, result.timestamp)
  } catch (e) {
    console.error('[Verify] DB write error:', e)
  }
}

function applyReputationChange(minerId: string, passed: boolean) {
  try {
    const db = require('@/lib/db').getDB()
    if (passed) {
      // Small boost for passing
      db.prepare('UPDATE miners SET reputation = MIN(reputation + 2, 200) WHERE id = ?').run(minerId)
    } else {
      // Larger penalty for failing
      db.prepare('UPDATE miners SET reputation = MAX(reputation - 15, 0) WHERE id = ?').run(minerId)

      // Check if reputation too low → mark offline (soft ban)
      const miner = db.prepare('SELECT reputation FROM miners WHERE id = ?').get(minerId) as any
      if (miner && miner.reputation <= 10) {
        db.prepare("UPDATE miners SET status = 'banned' WHERE id = ?").run(minerId)
        console.warn(`[Verify] BANNED miner ${minerId.slice(0, 8)} — reputation dropped to ${miner.reputation}`)
      }
    }
  } catch (e) {
    console.error('[Verify] Reputation update error:', e)
  }
}

/**
 * Check if a task is a verification task (used by task assignment to ensure
 * verification tasks go to the right miner)
 */
export function isVerificationTask(taskId: string): boolean {
  return getVerificationTasks().has(taskId)
}

/**
 * Get verification stats for a miner
 */
export function getMinerVerificationStats(minerId: string): {
  total: number
  passed: number
  failed: number
  passRate: number
  lastCheck: string | null
} {
  try {
    const db = require('@/lib/db').getDB()
    const stats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN passed = 1 THEN 1 ELSE 0 END) as passed,
        MAX(createdAt) as lastCheck
      FROM verifications WHERE minerId = ?
    `).get(minerId) as any

    return {
      total: stats?.total || 0,
      passed: stats?.passed || 0,
      failed: (stats?.total || 0) - (stats?.passed || 0),
      passRate: stats?.total > 0 ? (stats.passed / stats.total * 100) : 0,
      lastCheck: stats?.lastCheck || null,
    }
  } catch {
    return { total: 0, passed: 0, failed: 0, passRate: 0, lastCheck: null }
  }
}

/**
 * Get recent verification log (for admin dashboard)
 */
export function getRecentVerifications(limit: number = 20): VerificationResult[] {
  return recentVerifications.slice(0, limit)
}

/**
 * Start the verification sweeper.
 * Runs every N minutes, picks random online miners, sends test tasks.
 */
export function startVerificationSweeper() {
  if ((globalThis as any).__razumVerifySweeper) return

  const INTERVAL_MS = 5 * 60 * 1000 // Every 5 minutes
  const MAX_CONCURRENT_TESTS = 3

  console.log('[Verify] Starting verification sweeper (every 5 min)')

  ;(globalThis as any).__razumVerifySweeper = setInterval(() => {
    try {
      const { getOnlineMiners } = require('@/lib/db')
      const onlineMiners = getOnlineMiners()

      if (onlineMiners.length === 0) return

      // Pick up to MAX_CONCURRENT_TESTS random miners
      const shuffled = onlineMiners
        .filter((m: any) => m.status !== 'banned')
        .sort(() => Math.random() - 0.5)
        .slice(0, MAX_CONCURRENT_TESTS)

      for (const miner of shuffled) {
        createVerificationTask(miner.id)
      }
    } catch (e) {
      console.error('[Verify] Sweeper error:', e)
    }
  }, INTERVAL_MS)

  // Run first check after 30 seconds
  setTimeout(() => {
    try {
      const { getOnlineMiners } = require('@/lib/db')
      const onlineMiners = getOnlineMiners()
      if (onlineMiners.length > 0) {
        createVerificationTask(onlineMiners[0].id)
      }
    } catch {}
  }, 30_000)
}
