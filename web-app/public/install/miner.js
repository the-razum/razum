#!/usr/bin/env node
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execSync } = require('child_process')
const cryptoModule = require('crypto')

const HOME = os.homedir()
const CFG_DIR  = path.join(HOME, '.razum')
const CFG_FILE = path.join(CFG_DIR, 'config.json')
const STATE_FILE = path.join(CFG_DIR, 'state.json')

function loadFile(p) { try { return JSON.parse(fs.readFileSync(p, 'utf-8')) } catch { return {} } }
function saveFile(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true })
  fs.writeFileSync(p, JSON.stringify(obj, null, 2))
}

const fileCfg = loadFile(CFG_FILE)
const state   = loadFile(STATE_FILE)

const CONFIG = {
  coordinator:   process.env.COORDINATOR     || fileCfg.coordinator   || 'https://airazum.com',
  ollamaUrl:     process.env.OLLAMA_URL      || fileCfg.ollamaUrl     || 'http://127.0.0.1:11434',
  minerName:     process.env.MINER_NAME      || fileCfg.minerName     || os.hostname(),
  walletAddress: process.env.WALLET_ADDRESS  || fileCfg.walletAddress || '',
  modelsCSV:     process.env.MODELS          || fileCfg.models        || '',
  gpuModel:      process.env.GPU_MODEL       || fileCfg.gpuModel      || '',
  pollInterval:  Number(process.env.POLL_INTERVAL || fileCfg.pollInterval || 500),
  heartbeatInterval: Number(process.env.HEARTBEAT_INTERVAL || fileCfg.heartbeatInterval || 20000),
}

function log() { console.log('[' + new Date().toISOString() + ']', ...arguments) }
function err() { console.error('[' + new Date().toISOString() + '] ERROR', ...arguments) }
const sleep = ms => new Promise(r => setTimeout(r, ms))

// =====================
// ECDSA SIGNING
// =====================

let ecdsaKeys = null

function loadOrCreateKeypair() {
  const keyPath = path.join(CFG_DIR, 'miner_key.pem')
  const pubPath = path.join(CFG_DIR, 'miner_pub.pem')

  try {
    if (fs.existsSync(keyPath) && fs.existsSync(pubPath)) {
      ecdsaKeys = {
        privateKey: fs.readFileSync(keyPath, 'utf-8'),
        publicKey: fs.readFileSync(pubPath, 'utf-8'),
      }
      log('Loaded ECDSA keypair')
      return ecdsaKeys
    }
  } catch {}

  const { publicKey, privateKey } = cryptoModule.generateKeyPairSync('ec', {
    namedCurve: 'secp256k1',
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  })

  fs.writeFileSync(keyPath, privateKey, { mode: 0o600 })
  fs.writeFileSync(pubPath, publicKey, { mode: 0o644 })
  ecdsaKeys = { publicKey, privateKey }
  log('Generated new ECDSA keypair')
  return ecdsaKeys
}

function signBody(body) {
  if (!ecdsaKeys) return {}
  const timestamp = new Date().toISOString()
  const nonce = cryptoModule.randomBytes(16).toString('hex')
  const payload = timestamp + nonce + body

  const sign = cryptoModule.createSign('SHA256')
  sign.update(payload)
  sign.end()
  const signature = sign.sign(ecdsaKeys.privateKey, 'hex')

  return {
    'X-Miner-Signature': signature,
    'X-Miner-Timestamp': timestamp,
    'X-Miner-Nonce': nonce,
  }
}

// =====================
// MODEL & GPU DETECTION
// =====================

async function detectModels() {
  if (CONFIG.modelsCSV) return CONFIG.modelsCSV.split(',').map(s => s.trim()).filter(Boolean)
  try {
    const r = await fetch(CONFIG.ollamaUrl + '/api/tags', { signal: AbortSignal.timeout(10000) })
    const data = await r.json()
    return (data.models || []).map(m => m.name)
  } catch (e) { err('Cannot reach Ollama:', e.message); return [] }
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
    }
  } catch {}
  return 'Unknown GPU'
}

// =====================
// API CALLS
// =====================

async function api(method, p, body, headers, opts0) {
  opts0 = opts0 || {}
  const retries = opts0.retries != null ? opts0.retries : 0
  const timeoutMs = opts0.timeoutMs || 15000
  headers = headers || {}
  let lastErr
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const bodyStr = body !== undefined ? JSON.stringify(body) : undefined

      // Add ECDSA signature for POST requests
      let signHeaders = {}
      if (method === 'POST' && bodyStr && ecdsaKeys) {
        signHeaders = signBody(bodyStr)
      }

      const opts = {
        method: method,
        headers: Object.assign({ 'Content-Type': 'application/json' }, headers, signHeaders),
        signal: AbortSignal.timeout(timeoutMs),
      }
      if (bodyStr !== undefined) opts.body = bodyStr
      const r = await fetch(CONFIG.coordinator + p, opts)
      const text = await r.text()
      let data; try { data = JSON.parse(text) } catch { data = { raw: text } }
      if (!r.ok) {
        const e = new Error('HTTP ' + r.status + ': ' + (data.error || text.slice(0, 200)))
        e.status = r.status
        if (attempt < retries && (r.status >= 500 || r.status === 429)) {
          lastErr = e
          await sleep(500 * Math.pow(2, attempt))
          continue
        }
        throw e
      }
      return data
    } catch (e) {
      lastErr = e
      if (attempt < retries && (e.name === 'TimeoutError' || e.name === 'AbortError' || /fetch failed|ECONNRESET|ETIMEDOUT|ENETUNREACH|EAI_AGAIN/.test(String(e.message)))) {
        await sleep(500 * Math.pow(2, attempt))
        continue
      }
      throw e
    }
  }
  throw lastErr
}

// =====================
// REGISTRATION
// =====================

async function ensureRegistered(models, gpu) {
  if (state.apiKey && state.minerId) {
    log('Loaded existing miner: ' + state.minerId.slice(0, 8) + '... key=' + state.apiKey.slice(0, 12) + '...')

    // Send public key update if not registered yet
    if (ecdsaKeys && !state.publicKeySent) {
      try {
        await api('POST', '/api/miners/heartbeat', {
          apiKey: state.apiKey,
          status: 'online',
          models: models,
          publicKey: ecdsaKeys.publicKey,
        }, undefined, { retries: 2, timeoutMs: 10000 })
        state.publicKeySent = true
        saveFile(STATE_FILE, state)
        log('ECDSA public key sent to coordinator')
      } catch (e) {
        err('Failed to send public key:', e.message)
      }
    }

    return state
  }
  if (!CONFIG.walletAddress) { err('WALLET_ADDRESS required'); process.exit(1) }
  if (!CONFIG.walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) { err('WALLET_ADDRESS must be 0x...40 hex'); process.exit(1) }
  log('Registering new miner...')
  const regBody = {
    name: CONFIG.minerName,
    walletAddress: CONFIG.walletAddress,
    gpuModel: gpu,
    vram: 0,
    models: models,
  }
  // Include public key in registration
  if (ecdsaKeys) {
    regBody.publicKey = ecdsaKeys.publicKey
  }
  const data = await api('POST', '/api/miners/register', regBody)
  if (!data.success) throw new Error('Register failed')
  state.minerId = data.miner.id
  state.apiKey  = data.miner.apiKey
  state.publicKeySent = !!ecdsaKeys
  saveFile(STATE_FILE, state)
  log('Registered: ' + state.minerId.slice(0, 8) + '... (ECDSA=' + (!!ecdsaKeys) + ')')
  return state
}

// =====================
// HEARTBEAT
// =====================

async function heartbeatLoop(models) {
  while (true) {
    try {
      await api('POST', '/api/miners/heartbeat', {
        apiKey: state.apiKey,
        status: 'online',
        models: models,
      }, undefined, { retries: 2, timeoutMs: 10000 })
    } catch (e) { err('heartbeat:', e.message) }
    await sleep(CONFIG.heartbeatInterval)
  }
}

// =====================
// STREAMING
// =====================

// Per-task serialized push queue: guarantees chunks arrive on coordinator in send-order.
const _pushQueues = new Map()
function pushChunk(taskId, chunk) {
  const prev = _pushQueues.get(taskId) || Promise.resolve()
  const next = prev.then(async () => {
    const body = JSON.stringify({ apiKey: state.apiKey, taskId: taskId, chunk: chunk })
    const signHeaders = ecdsaKeys ? signBody(body) : {}
    try {
      await fetch(CONFIG.coordinator + '/api/miners/stream', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, signHeaders),
        signal: AbortSignal.timeout(5000),
        body: body,
      })
    } catch {}
  })
  _pushQueues.set(taskId, next)
  return next
}

// =====================
// TASK EXECUTION
// =====================

async function runTask(task) {
  const url = CONFIG.ollamaUrl.replace(/\/$/, '') + '/api/chat'
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(180000),
    body: JSON.stringify({
      model: task.model,
      messages: task.messages,
      stream: true,
      think: false,
      keep_alive: '5m',
      options: { num_predict: 1024, temperature: 0.2, top_k: 30, top_p: 0.85, repeat_penalty: 1.15, mirostat: 2, mirostat_eta: 0.1, mirostat_tau: 3.0 },
    }),
  })
  if (!r.ok) { const t = await r.text().catch(() => ''); throw new Error('Ollama ' + r.status + ': ' + t.slice(0, 200)) }

  const reader = r.body.getReader()
  const decoder = new TextDecoder()
  let leftover = ''
  let content = ''
  let tokens = 0
  let buf = ''
  let lastFlush = Date.now()

  function flush() {
    if (!buf) return
    pushChunk(task.id, buf)
    buf = ''
    lastFlush = Date.now()
  }

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    leftover += decoder.decode(value, { stream: true })
    let nl
    while ((nl = leftover.indexOf('\n')) !== -1) {
      const line = leftover.slice(0, nl).trim()
      leftover = leftover.slice(nl + 1)
      if (!line) continue
      try {
        const obj = JSON.parse(line)
        if (obj.message && typeof obj.message.content === 'string') {
          content += obj.message.content
          buf += obj.message.content
        }
        if (obj.eval_count) tokens = obj.eval_count
        if (obj.done) { flush() }
      } catch {}
    }
    if (buf.length > 50 || Date.now() - lastFlush > 50) flush()
  }
  flush()

  content = content.replace(/<think>[\s\S]*?<\/think>\s*/g, '').trim()
  if (!tokens) tokens = Math.ceil(content.length / 4)
  return { content: content, tokens: tokens }
}

// =====================
// POLLING
// =====================

async function pollLoop() {
  let consecutiveErrors = 0
  while (true) {
    try {
      const data = await api('GET', '/api/miners/task', undefined, { 'X-API-Key': state.apiKey })
      if (data.task) {
        const t = data.task
        log('Task ' + t.id.slice(0, 8) + '... model=' + t.model)
        const t0 = Date.now()
        try {
          const res = await runTask(t)
          log('  -> done ' + res.tokens + 'tok ' + (Date.now() - t0) + 'ms, ' + res.content.length + ' chars')
          await api('POST', '/api/miners/task',
            { apiKey: state.apiKey, taskId: t.id, result: res.content, success: true, tokensUsed: res.tokens },
            undefined, { retries: 4, timeoutMs: 20000 })
        } catch (e) {
          err('  task failed:', e.message)
          await api('POST', '/api/miners/task',
            { apiKey: state.apiKey, taskId: t.id, result: 'Miner error: ' + e.message, success: false, tokensUsed: 0 },
            undefined, { retries: 2, timeoutMs: 15000 }).catch(() => {})
        }
        consecutiveErrors = 0
        continue
      }
      consecutiveErrors = 0
    } catch (e) {
      consecutiveErrors++
      if (e.status === 429) {
        if (consecutiveErrors === 1) err('poll: rate limited, backing off')
        await sleep(1000)
        continue
      }
      err('poll:', e.message)
      if (consecutiveErrors > 20) { err('Too many errors, sleeping 10s'); await sleep(10000); consecutiveErrors = 0; continue }
    }
    await sleep(CONFIG.pollInterval)
  }
}

// =====================
// MAIN
// =====================

;(async () => {
  log('Razum Miner v2.0 starting')
  log('Coordinator:', CONFIG.coordinator)
  log('Ollama:     ', CONFIG.ollamaUrl)
  log('Name:       ', CONFIG.minerName)

  // Generate/load ECDSA keys
  loadOrCreateKeypair()
  log('ECDSA:       secp256k1 ' + (ecdsaKeys ? 'OK' : 'DISABLED'))

  const models = await detectModels()
  if (!models.length) { err('No models in Ollama'); process.exit(1) }
  log('Models:     ', models.join(', '))
  const gpu = detectGPU()
  log('GPU:        ', gpu)

  await ensureRegistered(models, gpu)

  log('Starting heartbeat & poll loops...')
  heartbeatLoop(models).catch(e => err('heartbeat loop crashed:', e))
  pollLoop().catch(e => { err('poll loop crashed:', e); process.exit(1) })
})().catch(e => { err('Fatal:', e); process.exit(1) })
