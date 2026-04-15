import { assignTask, pushStreamChunk, completeTask, getNextTask } from './taskQueue'

const INFERENCE_URL = process.env.INFERENCE_URL || 'http://localhost:11434/v1'
const INFERENCE_API_KEY = process.env.INFERENCE_API_KEY || ''
const FALLBACK_DELAY_MS = 5_000
const POLL_INTERVAL_MS = 2_000
const INTERNAL_MINER_ID = '__internal__'

const SUPPORTED_MODELS = [
  process.env.MODEL_QWEN || 'qwen3.5:9b',
]

let running = false
let pollTimer: NodeJS.Timeout | null = null

export function startInternalInference() {
  if (running) return
  running = true
  console.log(`[InternalInference] Started fallback delay=${FALLBACK_DELAY_MS}ms URL=${INFERENCE_URL}`)
  pollTimer = setInterval(async () => {
    try { await processNextTask() } catch (e) { console.error('[InternalInference] Poll error:', e) }
  }, POLL_INTERVAL_MS)
}

export function stopInternalInference() {
  running = false
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
}

async function processNextTask() {
  const task = getNextTask(SUPPORTED_MODELS)
  if (!task) return
  const taskAge = Date.now() - new Date(task.createdAt).getTime()
  if (taskAge < FALLBACK_DELAY_MS) return
  const assigned = assignTask(task.id, INTERNAL_MINER_ID)
  if (!assigned) return
  console.log(`[InternalInference] Processing ${task.id.slice(0,8)} model=${task.model} age=${Math.round(taskAge/1000)}s`)
  try {
    await callInferenceAPI(task)
  } catch (e: any) {
    console.error(`[InternalInference] Failed ${task.id.slice(0,8)}:`, e.message)
    completeTask(task.id, INTERNAL_MINER_ID, { result: `Error: ${e.message}`, tokens: 0, minerId: INTERNAL_MINER_ID })
  }
}

async function callInferenceAPI(task: any) {
  const url = `${INFERENCE_URL.replace(/\/+$/, '')}/chat/completions`
  const body = { model: task.model, messages: task.messages || [{ role: 'user', content: task.prompt }], stream: true, temperature: 0.7, max_tokens: 4096 }
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (INFERENCE_API_KEY && INFERENCE_API_KEY !== 'not-needed') headers['Authorization'] = `Bearer ${INFERENCE_API_KEY}`
  const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
  if (!response.ok) { const text = await response.text().catch(() => ''); throw new Error(`API ${response.status}: ${text.slice(0,200)}`) }
  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')
  const decoder = new TextDecoder()
  let fullResult = '', tokensUsed = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const text = decoder.decode(value, { stream: true })
      for (const line of text.split('\n')) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') continue
        try {
          const parsed = JSON.parse(data)
          const content = parsed.choices?.[0]?.delta?.content
          if (content) { pushStreamChunk(task.id, INTERNAL_MINER_ID, content); fullResult += content }
          if (parsed.usage?.total_tokens) tokensUsed = parsed.usage.total_tokens
        } catch {}
      }
    }
  } finally { reader.releaseLock() }
  completeTask(task.id, INTERNAL_MINER_ID, { result: fullResult, tokens: tokensUsed, minerId: INTERNAL_MINER_ID })
  console.log(`[InternalInference] Done ${task.id.slice(0,8)} tokens=${tokensUsed} len=${fullResult.length}`)
}
