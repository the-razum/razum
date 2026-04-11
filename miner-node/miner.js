#!/usr/bin/env node
/*
 * Razum Miner — Node.js client
 * Connects to Razum coordinator (https://airazum.com), polls for tasks,
 * runs them on local Ollama, returns results. Outbound only — works behind NAT.
 *
 * Config via env or ~/.razum/config.json:
 *   COORDINATOR     default: https://airazum.com
 *   OLLAMA_URL      default: http://127.0.0.1:11434
 *   MINER_NAME      default: hostname
 *   WALLET_ADDRESS  required (Ethereum 0x...)
 *   MODELS          comma-separated, default: auto-detected from `ollama list`
 *   GPU_MODEL       default: auto-detected
 *   POLL_INTERVAL   ms, default: 2000
 *   HEARTBEAT_INTERVAL ms, default: 20000
 */

const fs = require('fs')
const os = require('os')
const path = require('path')
const { execSync } = require('child_process')

const HOME = os.homedir()
const CFG_DIR  = path.join(HOME, '.razum')
const CFG_FILE = path.join(CFG_DIR, 'config.json')
const STATE_FILE = path.join(CFG_DIR, 'state.json')

function loadFile(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')) } catch { return {} }
}
function saveFile(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true })
  fs.writeFileSync(p, JSON.stringify(obj, null, 2))
}

const fileCfg   = loadFile(CFG_FILE)
const state     = loadFile(STATE_FILE)

const CONFIG = {
  coordinator:   process.env.COORDINATOR     || fileCfg.coordinator   || 'https://airazum.com',
  ollamaUrl:     process.env.OLLAMA_URL      || fileCfg.ollamaUrl     || 'http://127.0.0.1:11434',
  minerName:     process.env.MINER_NAME      || fileCfg.minerName     || os.hostname(),
  walletAddress: process.env.WALLET_ADDRESS  || fileCfg.walletAddress || '',
  modelsCSV:     process.env.MODELS          || fileCfg.models        || '',
  gpuModel:      process.env.GPU_MODEL       || fileCfg.gpuModel      || '',
  pollInterval:  Number(process.env.POLL_INTERVAL || fileCfg.pollInterval || 2000),
  heartbeatInterval: Number(process.env.HEARTBEAT_INTERVAL || fileCfg.heartbeatInterval || 20000),
}

function log(...a) { console.log(`[${new Date().toISOString()}]`, ...a) }
function err(...a) { console.error(`[${new Date().toISOString()}] ERROR`, ...a) }

// ---------- Auto-detect ----------
async function detectModels() {
  if (CONFIG.modelsCSV) return CONFIG.modelsCSV.split(',').map(s => s.trim()).filter(Boolean)
  try {
    const r = await fetch(`${CONFIG.ollamaUrl}/api/tags`)
    const data = await r.json()
    return (data.models || []).map(m => m.name)
  } catch (e) {
    err('Cannot reach Ollama at', CONFIG.ollamaUrl, '—', e.message)
    return []
  }
}

function detectGPU() {
  if (CONFIG.gpuModel) return CONFIG.gpuModel
  try {
    if (process.platform === 'darwin') {
      const out = execSync('system_profiler SPDisplaysDataType 2>/dev/null', { encoding: 'utf-8' })
      const m = out.match(/Chipset Model:\s*(.+)/)
      return m ? m[1].trim() : 'Apple Silicon'
    }
    if (process.platform === 'linux') {
      try {
        const out = execSync('nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null', { encoding: 'utf-8' })
        if (out.trim()) return out.trim().split('\n')[0]
      } catch {}
      try {
        const out = execSync('lspci 2>/dev/null | grep -i vga', { encoding: 'utf-8' })
        return out.split(':').pop().trim().slice(0, 80) || 'Unknown GPU'
      } catch {}
    }
  } catch {}
  return 'Unknown GPU'
}

// ---------- API helpers ----------
async function api(method, path, body, headers = {}) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    signal: AbortSignal.timeout(15000),
  }
  if (body !== undefined) opts.body = JSON.stringify(body)
  const r = await fetch(CONFIG.coordinator + path, opts)
  const text = await r.text()
  let data; try { data = JSON.parse(text) } catch { data = { raw: text } }
  if (!r.ok) {
    const e = new Error(`HTTP ${r.status}: ${data.error || text.slice(0, 200)}`)
    e.status = r.status
    e.data = data
    throw e
  }
  return data
}

// ---------- Register or load existing apiKey ----------
async function ensureRegistered(models, gpu) {
  if (state.apiKey && state.minerId) {
    log(`Loaded existing miner: ${state.minerId.slice(0, 8)}... key=${state.apiKey.slice(0, 12)}...`)
    return state
  }
  if (!CONFIG.walletAddress) {
    err('WALLET_ADDRESS required for first registration. Set it in env or', CFG_FILE)
    process.exit(1)
  }
  if (!CONFIG.walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
    err('WALLET_ADDRESS must be Ethereum address (0x...40 hex chars)')
    process.exit(1)
  }
  log('Registering new miner with coordinator...')
  const data = await api('POST', '/api/miners/register', {
    name: CONFIG.minerName,
    walletAddress: CONFIG.walletAddress,
    gpuModel: gpu,
    vram: 0,
    models,
  })
  if (!data.success) throw new Error('Register failed: ' + JSON.stringify(data))
  state.minerId = data.miner.id
  state.apiKey  = data.miner.apiKey
  saveFile(STATE_FILE, state)
  log(`Registered: ${state.minerId.slice(0, 8)}... key saved to`, STATE_FILE)
  return state
}

// ---------- Heartbeat loop ----------
async function heartbeatLoop(models) {
  while (true) {
    try {
      await api('POST', '/api/miners/heartbeat', {
        apiKey: state.apiKey,
        status: 'online',
        models,
      })
    } catch (e) {
      err('heartbeat:', e.message)
    }
    await sleep(CONFIG.heartbeatInterval)
  }
}

// ---------- Run task on local Ollama (streaming) ----------
async function runTask(task) {
  // Use OpenAI-compatible /v1/chat/completions endpoint with streaming
  const url = CONFIG.ollamaUrl.replace(/\/$/, '') + '/v1/chat/completions'
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(120000),
    body: JSON.stringify({
      model: task.model,
      messages: task.messages,
      stream: true,
      max_tokens: 2048,
      temperature: 0.7,
    }),
  })
  if (!r.ok) {
    const t = await r.text().catch(() => '')
    throw new Error(`Ollama ${r.status}: ${t.slice(0, 200)}`)
  }

  const reader = r.body.getReader()
  const decoder = new TextDecoder()
  let content = ''
  let sseBuffer = ''
  let chunkBatch = ''  // batch small tokens before sending to coordinator
  let lastSendTime = Date.now()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const text = decoder.decode(value, { stream: true })
    sseBuffer += text

    const lines = sseBuffer.split('\n')
    sseBuffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6)
      if (data === '[DONE]') continue
      try {
        const json = JSON.parse(data)
        const token = json.choices?.[0]?.delta?.content || ''
        if (token) {
          content += token
          chunkBatch += token

          // Send batch to coordinator every 200ms or 80+ chars to reduce HTTP overhead
          const now = Date.now()
          if (chunkBatch.length >= 80 || now - lastSendTime > 200) {
            try {
              await api('POST', '/api/miners/task/update', {
                apiKey: state.apiKey,
                taskId: task.id,
                chunk: chunkBatch,
              })
            } catch (e) {
              // Non-fatal: stream chunk delivery failed, response still saved at end
              err('  stream chunk failed:', e.message)
            }
            chunkBatch = ''
            lastSendTime = now
          }
        }
      } catch {}
    }
  }

  // Send any remaining buffered chunk
  if (chunkBatch) {
    try {
      await api('POST', '/api/miners/task/update', {
        apiKey: state.apiKey,
        taskId: task.id,
        chunk: chunkBatch,
      })
    } catch {}
  }

  const tokens = Math.ceil(content.length / 4)
  return { content, tokens }
}

// ---------- Poll loop ----------
async function pollLoop() {
  let consecutiveErrors = 0
  while (true) {
    try {
      const data = await api('GET', '/api/miners/task', undefined, { 'X-API-Key': state.apiKey })
      if (data.task) {
        const t = data.task
        log(`Task ${t.id.slice(0, 8)}... model=${t.model}`)
        const t0 = Date.now()
        try {
          const { content, tokens } = await runTask(t)
          const elapsed = Date.now() - t0
          log(`  → done ${tokens}tok ${elapsed}ms, ${content.length} chars`)
          await api('POST', '/api/miners/task', {
            apiKey: state.apiKey,
            taskId: t.id,
            result: content,
            success: true,
            tokensUsed: tokens,
          })
        } catch (e) {
          err('  task failed:', e.message)
          await api('POST', '/api/miners/task', {
            apiKey: state.apiKey,
            taskId: t.id,
            result: 'Miner error: ' + e.message,
            success: false,
            tokensUsed: 0,
          }).catch(() => {})
        }
        consecutiveErrors = 0
        continue // сразу за следующей задачей
      }
      consecutiveErrors = 0
    } catch (e) {
      consecutiveErrors++
      err('poll:', e.message)
      if (consecutiveErrors > 10) {
        err('Too many errors, sleeping 30s')
        await sleep(30000)
        consecutiveErrors = 0
        continue
      }
    }
    await sleep(CONFIG.pollInterval)
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

// ---------- main ----------
;(async () => {
  log('Razum Miner starting')
  log('Coordinator:', CONFIG.coordinator)
  log('Ollama:     ', CONFIG.ollamaUrl)
  log('Name:       ', CONFIG.minerName)

  const models = await detectModels()
  if (!models.length) {
    err('No models found in Ollama. Run `ollama pull deepseek-r1:14b` first.')
    process.exit(1)
  }
  log('Models:     ', models.join(', '))

  const gpu = detectGPU()
  log('GPU:        ', gpu)

  await ensureRegistered(models, gpu)

  log('Starting heartbeat & poll loops...')
  heartbeatLoop(models).catch(e => err('heartbeat loop crashed:', e))
  pollLoop().catch(e => { err('poll loop crashed:', e); process.exit(1) })
})().catch(e => {
  err('Fatal:', e)
  process.exit(1)
})
