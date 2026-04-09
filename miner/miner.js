#!/usr/bin/env node
/**
 * Razum AI Miner Agent
 *
 * Connects to the Razum network, receives AI tasks,
 * processes them via local Ollama, and earns RZM tokens.
 */

const http = require('http')
const https = require('https')
const { execSync } = require('child_process')

// ─── Configuration ───────────────────────────────────────────
const CONFIG = {
  coordinatorUrl: process.env.COORDINATOR_URL || 'https://airazum.com',
  walletAddress: process.env.WALLET_ADDRESS || '',
  nodeName: process.env.NODE_NAME || `razum-node-${Math.random().toString(36).slice(2, 8)}`,
  models: (process.env.MODELS || 'deepseek-r1:14b').split(',').map(s => s.trim()),
  maxConcurrent: parseInt(process.env.MAX_CONCURRENT_TASKS || '3'),
  minReward: parseFloat(process.env.MIN_REWARD || '0.05'),
  ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
  pollInterval: parseInt(process.env.POLL_INTERVAL || '5000'),
  heartbeatInterval: parseInt(process.env.HEARTBEAT_INTERVAL || '30000'),
  port: parseInt(process.env.PORT || '8080'),
}

// ─── State ───────────────────────────────────────────────────
let state = {
  apiKey: null,
  minerId: null,
  tasksCompleted: 0,
  tasksFailed: 0,
  totalReward: 0,
  activeTasks: 0,
  gpuInfo: 'Unknown GPU',
  vram: 0,
  startedAt: Date.now(),
  lastTaskAt: null,
}

// ─── Logging ─────────────────────────────────────────────────
function log(msg) {
  const ts = new Date().toISOString().slice(11, 19)
  console.log(`[${ts}] [Razum] ${msg}`)
}

function logError(msg) {
  const ts = new Date().toISOString().slice(11, 19)
  console.error(`[${ts}] [Razum] ERROR: ${msg}`)
}

// ─── HTTP helpers ────────────────────────────────────────────
function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const lib = parsed.protocol === 'https:' ? https : http

    const opts = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'RazumMiner/1.0',
        ...options.headers,
      },
      timeout: options.timeout || 30000,
    }

    const req = lib.request(opts, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) })
        } catch {
          resolve({ status: res.statusCode, data: data })
        }
      })
    })

    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')) })

    if (options.body) {
      req.write(JSON.stringify(options.body))
    }
    req.end()
  })
}

// ─── GPU Detection ───────────────────────────────────────────
function detectGPU() {
  try {
    const output = execSync('nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits', {
      encoding: 'utf-8', timeout: 5000
    }).trim()

    if (output) {
      const lines = output.split('\n')
      const [name, vram] = lines[0].split(',').map(s => s.trim())
      state.gpuInfo = name
      state.vram = Math.round(parseInt(vram) / 1024) // GB
      log(`GPU detected: ${name} (${state.vram} GB VRAM)`)
      return
    }
  } catch {}

  // Fallback: check Ollama
  try {
    const output = execSync('ollama list', { encoding: 'utf-8', timeout: 5000 }).trim()
    log(`Ollama models available: ${output || 'none yet'}`)
  } catch {}

  state.gpuInfo = process.env.GPU_MODEL || 'Unknown GPU'
  state.vram = parseInt(process.env.GPU_VRAM || '8')
  log(`GPU info from env: ${state.gpuInfo} (${state.vram} GB)`)
}

// ─── Register with coordinator ───────────────────────────────
async function registerMiner() {
  log(`Registering with coordinator: ${CONFIG.coordinatorUrl}`)

  const res = await request(`${CONFIG.coordinatorUrl}/api/miners/register`, {
    method: 'POST',
    body: {
      name: CONFIG.nodeName,
      walletAddress: CONFIG.walletAddress,
      gpuModel: state.gpuInfo,
      vram: state.vram,
      models: CONFIG.models,
    }
  })

  if (res.status === 200 || res.status === 201) {
    state.apiKey = res.data.apiKey
    state.minerId = res.data.minerId
    log(`Registered! Miner ID: ${state.minerId}`)
    log(`API Key: ${state.apiKey.slice(0, 8)}...`)
    return true
  }

  logError(`Registration failed (${res.status}): ${JSON.stringify(res.data)}`)
  return false
}

// ─── Send heartbeat ──────────────────────────────────────────
async function sendHeartbeat() {
  if (!state.apiKey) return

  try {
    await request(`${CONFIG.coordinatorUrl}/api/miners/heartbeat`, {
      method: 'POST',
      body: {
        apiKey: state.apiKey,
        status: state.activeTasks > 0 ? 'busy' : 'idle',
        tasksCompleted: state.tasksCompleted,
        gpuUtilization: state.activeTasks > 0 ? 80 : 5,
      }
    })
  } catch (err) {
    logError(`Heartbeat failed: ${err.message}`)
  }
}

// ─── Poll for tasks ──────────────────────────────────────────
async function pollForTask() {
  if (!state.apiKey) return null
  if (state.activeTasks >= CONFIG.maxConcurrent) return null

  try {
    const res = await request(`${CONFIG.coordinatorUrl}/api/miners/task`, {
      method: 'POST',
      body: {
        apiKey: state.apiKey,
        action: 'poll',
      }
    })

    if (res.status === 200 && res.data.task) {
      return res.data.task
    }
  } catch (err) {
    // Silence poll errors to avoid spam
  }

  return null
}

// ─── Process task via Ollama ─────────────────────────────────
async function processTask(task) {
  state.activeTasks++
  const startTime = Date.now()

  log(`Task received: ${task.id} (model: ${task.model || 'default'})`)

  try {
    // Call Ollama
    const model = task.model || CONFIG.models[0]
    const messages = task.messages || [{ role: 'user', content: task.prompt || '' }]

    const ollamaRes = await request(`${CONFIG.ollamaUrl}/api/chat`, {
      method: 'POST',
      body: {
        model: model,
        messages: messages,
        stream: false,
        options: {
          num_predict: task.maxTokens || 2048,
          temperature: task.temperature || 0.7,
        }
      },
      timeout: 120000, // 2 min for generation
    })

    if (ollamaRes.status !== 200) {
      throw new Error(`Ollama error: ${ollamaRes.status}`)
    }

    const result = ollamaRes.data
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

    // Submit result
    const submitRes = await request(`${CONFIG.coordinatorUrl}/api/miners/task`, {
      method: 'POST',
      body: {
        apiKey: state.apiKey,
        action: 'complete',
        taskId: task.id,
        result: {
          content: result.message?.content || '',
          model: model,
          tokensGenerated: result.eval_count || 0,
          processingTime: parseFloat(elapsed),
        }
      }
    })

    const reward = submitRes.data?.reward || 0
    state.tasksCompleted++
    state.totalReward += reward
    state.lastTaskAt = Date.now()

    log(`Task ${task.id} completed in ${elapsed}s. Reward: ${reward} RZM (total: ${state.totalReward.toFixed(2)})`)

  } catch (err) {
    state.tasksFailed++
    logError(`Task ${task.id} failed: ${err.message}`)

    // Report failure
    try {
      await request(`${CONFIG.coordinatorUrl}/api/miners/task`, {
        method: 'POST',
        body: {
          apiKey: state.apiKey,
          action: 'fail',
          taskId: task.id,
          error: err.message,
        }
      })
    } catch {}
  } finally {
    state.activeTasks--
  }
}

// ─── Health server ───────────────────────────────────────────
function startHealthServer() {
  const server = http.createServer((req, res) => {
    if (req.url === '/health') {
      const uptime = Math.floor((Date.now() - state.startedAt) / 1000)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        status: 'ok',
        miner: CONFIG.nodeName,
        gpu: state.gpuInfo,
        vram: state.vram,
        models: CONFIG.models,
        tasksCompleted: state.tasksCompleted,
        tasksFailed: state.tasksFailed,
        totalReward: state.totalReward,
        activeTasks: state.activeTasks,
        uptime: uptime,
      }))
    } else if (req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/plain' })
      res.end(`Razum Miner v1.0 | ${CONFIG.nodeName} | ${state.gpuInfo}`)
    } else {
      res.writeHead(404)
      res.end('Not found')
    }
  })

  server.listen(CONFIG.port, () => {
    log(`Health server listening on port ${CONFIG.port}`)
  })
}

// ─── Main loop ───────────────────────────────────────────────
async function main() {
  console.log('')
  console.log('  ██████╗  █████╗ ███████╗██╗   ██╗███╗   ███╗')
  console.log('  ██╔══██╗██╔══██╗╚══███╔╝██║   ██║████╗ ████║')
  console.log('  ██████╔╝███████║  ███╔╝ ██║   ██║██╔████╔██║')
  console.log('  ██╔══██╗██╔══██║ ███╔╝  ██║   ██║██║╚██╔╝██║')
  console.log('  ██║  ██║██║  ██║███████╗╚██████╔╝██║ ╚═╝ ██║')
  console.log('  ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═╝     ╚═╝')
  console.log('  Miner v1.0 — Earn RZM with your GPU')
  console.log('')

  // Validate config
  if (!CONFIG.walletAddress) {
    logError('WALLET_ADDRESS is required! Set it in .env or docker-compose.yml')
    process.exit(1)
  }

  // Detect GPU
  detectGPU()

  // Start health server
  startHealthServer()

  // Register
  let registered = false
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      registered = await registerMiner()
      if (registered) break
    } catch (err) {
      logError(`Registration attempt ${attempt}/5 failed: ${err.message}`)
    }
    log(`Retrying in ${attempt * 5}s...`)
    await new Promise(r => setTimeout(r, attempt * 5000))
  }

  if (!registered) {
    logError('Failed to register after 5 attempts. Check COORDINATOR_URL and network.')
    process.exit(1)
  }

  // Heartbeat loop
  setInterval(sendHeartbeat, CONFIG.heartbeatInterval)

  // Task polling loop
  log(`Polling for tasks every ${CONFIG.pollInterval / 1000}s...`)
  log(`Max concurrent tasks: ${CONFIG.maxConcurrent}`)
  log(`Models: ${CONFIG.models.join(', ')}`)
  log('')
  log('Waiting for tasks...')

  while (true) {
    try {
      const task = await pollForTask()
      if (task) {
        // Don't await — process in background
        processTask(task).catch(err => logError(`Unhandled: ${err.message}`))
      }
    } catch (err) {
      logError(`Poll error: ${err.message}`)
    }

    await new Promise(r => setTimeout(r, CONFIG.pollInterval))
  }
}

// Handle shutdown gracefully
process.on('SIGTERM', () => {
  log('Shutting down...')
  sendHeartbeat().then(() => process.exit(0))
})

process.on('SIGINT', () => {
  log('Shutting down...')
  sendHeartbeat().then(() => process.exit(0))
})

main().catch(err => {
  logError(`Fatal: ${err.message}`)
  process.exit(1)
})
