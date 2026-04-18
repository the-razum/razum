/**
 * Epoch-based Reward System (inspired by Gonka)
 *
 * Instead of linear reward = tokens * 0.001:
 * - Rewards are distributed per epoch (7 days)
 * - Each epoch has a max reward pool: 323,000 RZM
 * - Halving every ~4 years (208 epochs)
 * - Rewards are proportional to miner contribution within the epoch
 *
 * This creates deflationary pressure and incentivizes early adoption.
 */

const INITIAL_EPOCH_REWARD = 323_000  // RZM per epoch
const EPOCH_DURATION_MS = 7 * 24 * 60 * 60 * 1000  // 7 days
const HALVING_EPOCHS = 208  // ~4 years at 7-day epochs
const MAX_TOTAL_REWARDS = 500_000_000  // 500M RZM total cap

interface EpochState {
  epochNumber: number
  startedAt: number
  rewardsDistributed: number
  maxReward: number
  tasksCompleted: number
}

// Persistent epoch tracking
function getEpochState(): EpochState {
  try {
    const db = require('@/lib/db').getDB()

    // Create epoch_state table if not exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS epoch_state (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `)

    const row = db.prepare('SELECT value FROM epoch_state WHERE key = ?').get('current') as any
    if (row) {
      const state = JSON.parse(row.value) as EpochState
      // Check if we need to advance to a new epoch
      const now = Date.now()
      const epochsSinceStart = Math.floor((now - state.startedAt) / EPOCH_DURATION_MS)
      if (epochsSinceStart > 0) {
        // Advance epoch
        const newEpoch = state.epochNumber + epochsSinceStart
        const newState: EpochState = {
          epochNumber: newEpoch,
          startedAt: state.startedAt + epochsSinceStart * EPOCH_DURATION_MS,
          rewardsDistributed: 0,
          maxReward: calculateEpochReward(newEpoch),
          tasksCompleted: 0,
        }
        saveEpochState(newState)
        console.log(`[Rewards] Epoch advanced to ${newEpoch}, max reward: ${newState.maxReward.toFixed(2)} RZM`)
        return newState
      }
      return state
    }

    // First epoch
    const initial: EpochState = {
      epochNumber: 0,
      startedAt: Date.now(),
      rewardsDistributed: 0,
      maxReward: INITIAL_EPOCH_REWARD,
      tasksCompleted: 0,
    }
    saveEpochState(initial)
    return initial
  } catch (e) {
    console.error('[Rewards] getEpochState error:', e)
    return {
      epochNumber: 0,
      startedAt: Date.now(),
      rewardsDistributed: 0,
      maxReward: INITIAL_EPOCH_REWARD,
      tasksCompleted: 0,
    }
  }
}

function saveEpochState(state: EpochState) {
  try {
    const db = require('@/lib/db').getDB()
    db.prepare(`
      INSERT OR REPLACE INTO epoch_state (key, value) VALUES ('current', ?)
    `).run(JSON.stringify(state))
  } catch (e) {
    console.error('[Rewards] saveEpochState error:', e)
  }
}

/**
 * Calculate the max reward for a given epoch (with halving)
 */
function calculateEpochReward(epochNumber: number): number {
  const halvings = Math.floor(epochNumber / HALVING_EPOCHS)
  if (halvings >= 20) return 0  // negligible after 20 halvings (~80 years)
  return INITIAL_EPOCH_REWARD / Math.pow(2, halvings)
}

/**
 * Calculate reward for a single task completion.
 *
 * Factors:
 * - Tokens generated (capped at 4096)
 * - Miner reputation (0-200)
 * - Epoch budget remaining
 * - Response latency (faster = more reward)
 */
export function calculateTaskReward(
  tokensUsed: number,
  reputation: number,
  latencyMs: number,
  success: boolean
): { reward: number; epochNumber: number; epochRemaining: number } {
  if (!success) {
    return { reward: 0, epochNumber: 0, epochRemaining: 0 }
  }

  const state = getEpochState()

  // Base reward proportional to tokens (capped)
  const cappedTokens = Math.min(Math.max(0, tokensUsed), 4096)
  const baseReward = cappedTokens * 0.01  // 0.01 RZM per token

  // Reputation multiplier: 0.5x at rep=0, 1x at rep=100, 2x at rep=200
  const repMultiplier = Math.max(0.5, Math.min(2.0, reputation / 100))

  // Speed bonus: 20% bonus if < 5s, -20% penalty if > 30s
  let speedMultiplier = 1.0
  if (latencyMs < 5000) speedMultiplier = 1.2
  else if (latencyMs > 30000) speedMultiplier = 0.8

  let reward = baseReward * repMultiplier * speedMultiplier

  // Cap by epoch budget
  const remaining = state.maxReward - state.rewardsDistributed
  if (remaining <= 0) {
    return { reward: 0, epochNumber: state.epochNumber, epochRemaining: 0 }
  }
  reward = Math.min(reward, remaining)

  // Record
  state.rewardsDistributed += reward
  state.tasksCompleted += 1
  saveEpochState(state)

  return {
    reward,
    epochNumber: state.epochNumber,
    epochRemaining: remaining - reward,
  }
}

/**
 * Get current epoch info (for API/dashboard)
 */
export function getEpochInfo() {
  const state = getEpochState()
  const now = Date.now()
  const epochElapsed = now - state.startedAt
  const epochProgress = Math.min(1, epochElapsed / EPOCH_DURATION_MS)
  const nextEpochIn = EPOCH_DURATION_MS - epochElapsed

  // Get total rewards from DB
  let totalRewardsDistributed = 0
  try {
    const db = require('@/lib/db').getDB()
    const row = db.prepare('SELECT COALESCE(SUM(totalRewards), 0) as total FROM miners').get() as any
    totalRewardsDistributed = row?.total || 0
  } catch {}

  return {
    currentEpoch: state.epochNumber,
    epochProgress: Math.round(epochProgress * 100),
    epochRewardsDistributed: state.rewardsDistributed,
    epochMaxReward: state.maxReward,
    epochTasksCompleted: state.tasksCompleted,
    nextEpochIn: Math.max(0, nextEpochIn),
    nextHalvingEpoch: (Math.floor(state.epochNumber / HALVING_EPOCHS) + 1) * HALVING_EPOCHS,
    totalRewardsDistributed,
    maxTotalRewards: MAX_TOTAL_REWARDS,
    halvingSchedule: Array.from({ length: 5 }, (_, i) => ({
      epoch: (i + 1) * HALVING_EPOCHS,
      rewardPerEpoch: calculateEpochReward((i + 1) * HALVING_EPOCHS),
    })),
  }
}
