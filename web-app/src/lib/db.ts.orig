import crypto from 'crypto'
import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'

// --- SQLite setup ---
const DATA_DIR = process.env.DATA_DIR || join(process.cwd(), 'data')
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })

// Dynamic import for better-sqlite3 (CommonJS module)
let _db: any = null
function getDB() {
  if (!_db) {
    const Database = require('better-sqlite3')
    _db = new Database(join(DATA_DIR, 'razum.db'))
    _db.pragma('journal_mode = WAL')
    _db.pragma('foreign_keys = ON')
    _db.pragma('busy_timeout = 5000')
    _db.pragma('synchronous = NORMAL')
    _db.pragma('cache_size = -20000') // 20MB cache

    // Create tables
    _db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        passwordHash TEXT NOT NULL,
        salt TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        plan TEXT DEFAULT 'free',
        planExpiresAt TEXT DEFAULT '',
        requestsToday INTEGER DEFAULT 0,
        lastRequestDate TEXT DEFAULT '',
        createdAt TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

      CREATE TABLE IF NOT EXISTS miners (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        walletAddress TEXT NOT NULL,
        apiKey TEXT UNIQUE NOT NULL,
        gpuModel TEXT DEFAULT '',
        vram INTEGER DEFAULT 0,
        status TEXT DEFAULT 'offline',
        totalTasks INTEGER DEFAULT 0,
        successfulTasks INTEGER DEFAULT 0,
        failedTasks INTEGER DEFAULT 0,
        totalRewards REAL DEFAULT 0,
        reputation INTEGER DEFAULT 100,
        lastSeen TEXT DEFAULT '',
        models TEXT DEFAULT '[]',
        ip TEXT DEFAULT '',
        port INTEGER DEFAULT 0,
        registeredAt TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_miners_status ON miners(status);
      CREATE INDEX IF NOT EXISTS idx_miners_apiKey ON miners(apiKey);

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        userId TEXT,
        minerId TEXT,
        model TEXT NOT NULL,
        prompt TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        result TEXT DEFAULT '',
        createdAt TEXT NOT NULL,
        startedAt TEXT DEFAULT '',
        completedAt TEXT DEFAULT '',
        tokensUsed INTEGER DEFAULT 0,
        reward REAL DEFAULT 0,
        FOREIGN KEY (minerId) REFERENCES miners(id)
      );
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_minerId ON tasks(minerId);

      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        amount REAL NOT NULL,
        plan TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        provider TEXT DEFAULT 'yukassa',
        externalId TEXT DEFAULT '',
        createdAt TEXT NOT NULL,
        completedAt TEXT DEFAULT ''
      );

      CREATE TABLE IF NOT EXISTS chats (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        title TEXT DEFAULT 'ÐÐ¾Ð²ÑÐ¹ ÑÐ°Ñ',
        model TEXT DEFAULT '',
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_chats_userId ON chats(userId);
      CREATE INDEX IF NOT EXISTS idx_chats_updatedAt ON chats(updatedAt);

      CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chatId TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (chatId) REFERENCES chats(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_chat_messages_chatId ON chat_messages(chatId);

      CREATE TABLE IF NOT EXISTS rate_limits (
        key TEXT NOT NULL,
        store TEXT NOT NULL,
        count INTEGER DEFAULT 1,
        resetAt INTEGER NOT NULL,
        blockedUntil INTEGER DEFAULT 0,
        failCount INTEGER DEFAULT 0,
        PRIMARY KEY (store, key)
      );
    `)

    // Migrate: add planExpiresAt column if missing
    try {
      _db.exec(`ALTER TABLE users ADD COLUMN planExpiresAt TEXT DEFAULT ''`)
    } catch {}

    // Migrate: add role column if missing
    try {
      _db.exec(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'`)
    } catch {}

    // Migrate: add emailVerified column if missing
    try {
      _db.exec(`ALTER TABLE users ADD COLUMN emailVerified INTEGER DEFAULT 0`)
    } catch {}

    // Create email_tokens table for verification & password reset
    _db.exec(`
      CREATE TABLE IF NOT EXISTS email_tokens (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        type TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expiresAt INTEGER NOT NULL,
        used INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_email_tokens_token ON email_tokens(token);
      CREATE INDEX IF NOT EXISTS idx_email_tokens_userId ON email_tokens(userId);
    `)

    // Auto-promote founder to admin
    const adminEmail = process.env.ADMIN_EMAIL
    if (adminEmail) {
      _db.exec(`UPDATE users SET role = 'admin' WHERE email = '${adminEmail.replace(/'/g, "\'\'")}'AND role != 'admin'`)
    }

    // Migrate from old JSON DB if exists
    const jsonPath = join(DATA_DIR, 'users.json')
    if (existsSync(jsonPath)) {
      try {
        const { readFileSync, renameSync } = require('fs')
        const old = JSON.parse(readFileSync(jsonPath, 'utf-8'))
        const insert = _db.prepare(`
          INSERT OR IGNORE INTO users (id, email, name, passwordHash, salt, plan, requestsToday, lastRequestDate, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        for (const u of old.users || []) {
          insert.run(u.id, u.email, u.name, u.passwordHash, u.salt, u.plan || 'free', u.requestsToday || 0, u.lastRequestDate || '', u.createdAt || new Date().toISOString())
        }
        renameSync(jsonPath, jsonPath + '.bak')
        console.log('[DB] Migrated users from JSON to SQLite')
      } catch (e) {
        console.error('[DB] Migration error:', e)
      }
    }

    // Ensure __internal__ miner exists (for fallback inference)
    try {
      const internalMiner = _db.prepare('SELECT id FROM miners WHERE id = ?').get('__internal__')
      if (!internalMiner) {
        _db.prepare(`
          INSERT INTO miners (id, name, walletAddress, apiKey, gpuModel, vram, status, reputation, models, registeredAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          '__internal__',
          'Internal Fallback Inference',
          'n/a',
          'internal-key-' + crypto.randomBytes(16).toString('hex'),
          'CPU',
          0,
          'online',
          1000,
          JSON.stringify([process.env.MODEL_QWEN || 'qwen3.5:9b']),
          new Date().toISOString()
        )
        console.log('[DB] Created __internal__ miner for fallback inference')
      } else {
        _db.prepare('UPDATE miners SET status = ? WHERE id = ?').run('online', '__internal__')
      }
    } catch (e) {
      console.error('[DB] Error initializing __internal__ miner:', e)
    }
  }
  return _db
}

// --- Types ---
export interface User {
  id: string
  email: string
  name: string
  passwordHash: string
  salt: string
  role: 'user' | 'admin'
  plan: 'free' | 'start' | 'basic' | 'pro'
  planExpiresAt: string
  emailVerified: number // 0 = false, 1 = true (SQLite boolean)
  requestsToday: number
  lastRequestDate: string
  createdAt: string
}

export interface Payment {
  id: string
  userId: string
  amount: number
  plan: string
  status: 'pending' | 'completed' | 'failed'
  provider: string
  externalId: string
  createdAt: string
  completedAt: string
}

export interface Miner {
  id: string
  name: string
  walletAddress: string
  apiKey: string
  gpuModel: string
  vram: number
  status: 'online' | 'offline' | 'busy'
  totalTasks: number
  successfulTasks: number
  failedTasks: number
  totalRewards: number
  reputation: number
  lastSeen: string
  models: string[]
  ip: string
  port: number
  registeredAt: string
}

export interface Task {
  id: string
  userId: string | null
  minerId: string | null
  model: string
  prompt: string
  status: 'pending' | 'assigned' | 'running' | 'completed' | 'failed'
  result: string
  createdAt: string
  startedAt: string
  completedAt: string
  tokensUsed: number
  reward: number
}

// --- Plans ---
export const PLANS = {
  free:  { name: 'Free',    requestsPerDay: 30,    price: 0 },
  start: { name: 'Ð¡ÑÐ°ÑÑ',   requestsPerDay: 500,   price: 490 },
  basic: { name: 'ÐÐ°Ð·Ð¾Ð²ÑÐ¹', requestsPerDay: 2000,  price: 990 },
  pro:   { name: 'ÐÑÐ¾',     requestsPerDay: 99999, price: 1990 },
}

// --- Password hashing ---
function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const s = salt || crypto.randomBytes(32).toString('hex')
  // 100,000 iterations per NIST SP 800-132 recommendation
  const hash = crypto.pbkdf2Sync(password, s, 100000, 64, 'sha512').toString('hex')
  return { hash, salt: s }
}

// =====================
// USER FUNCTIONS
// =====================

export function registerUser(email: string, name: string, password: string): User | null {
  const db = getDB()
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (existing) return null

  const { hash, salt } = hashPassword(password)
  const user: User = {
    id: crypto.randomUUID(),
    email,
    name,
    passwordHash: hash,
    salt,
    role: 'user',
    plan: 'free',
    planExpiresAt: '',
    emailVerified: 0,
    requestsToday: 0,
    lastRequestDate: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
  }

  db.prepare(`
    INSERT INTO users (id, email, name, passwordHash, salt, role, plan, planExpiresAt, emailVerified, requestsToday, lastRequestDate, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(user.id, user.email, user.name, user.passwordHash, user.salt, user.role, user.plan, user.planExpiresAt, user.emailVerified, user.requestsToday, user.lastRequestDate, user.createdAt)

  return user
}

export function loginUser(email: string, password: string): User | null {
  const db = getDB()
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined
  if (!user) {
    // Prevent timing attack: still hash the password even if user not found
    hashPassword(password, 'dummy-salt-for-timing')
    return null
  }

  const { hash } = hashPassword(password, user.salt)
  // Timing-safe comparison
  const hashBuf = Buffer.from(hash, 'utf-8')
  const storedBuf = Buffer.from(user.passwordHash, 'utf-8')
  if (hashBuf.length !== storedBuf.length || !crypto.timingSafeEqual(hashBuf, storedBuf)) {
    return null
  }
  return user
}

export function getUserById(id: string): User | null {
  const db = getDB()
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | null
}

export function changePassword(userId: string, currentPassword: string, newPassword: string): { success: boolean; error?: string } {
  const db = getDB()
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as User | undefined
  if (!user) return { success: false, error: 'ÐÐ¾Ð»ÑÐ·Ð¾Ð²Ð°ÑÐµÐ»Ñ Ð½Ðµ Ð½Ð°Ð¹Ð´ÐµÐ½' }

  // Verify current password
  const { hash } = hashPassword(currentPassword, user.salt)
  const hashBuf = Buffer.from(hash, 'utf-8')
  const storedBuf = Buffer.from(user.passwordHash, 'utf-8')
  if (hashBuf.length !== storedBuf.length || !crypto.timingSafeEqual(hashBuf, storedBuf)) {
    return { success: false, error: 'ÐÐµÐ²ÐµÑÐ½ÑÐ¹ ÑÐµÐºÑÑÐ¸Ð¹ Ð¿Ð°ÑÐ¾Ð»Ñ' }
  }

  // Hash new password
  const { hash: newHash, salt: newSalt } = hashPassword(newPassword)
  db.prepare('UPDATE users SET passwordHash = ?, salt = ? WHERE id = ?').run(newHash, newSalt, userId)
  return { success: true }
}

export function updateUserName(userId: string, name: string): boolean {
  const db = getDB()
  const result = db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, userId)
  return result.changes > 0
}

export function checkAndIncrementRequests(userId: string): { allowed: boolean; remaining: number; limit: number; plan: string } {
  const db = getDB()
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as User | undefined
  if (!user) return { allowed: false, remaining: 0, limit: 0, plan: 'free' }

  // Check if paid plan has expired
  let activePlan = user.plan
  if (activePlan !== 'free' && user.planExpiresAt) {
    const now = new Date()
    const expires = new Date(user.planExpiresAt)
    if (now > expires) {
      // Subscription expired â downgrade to free
      db.prepare("UPDATE users SET plan = 'free', planExpiresAt = '' WHERE id = ?").run(userId)
      activePlan = 'free'
      console.log(`[Plan] User ${userId} plan expired, downgraded to free`)
    }
  }

  const today = new Date().toISOString().split('T')[0]
  const plan = PLANS[activePlan as keyof typeof PLANS] || PLANS.free

  let requestsToday = user.requestsToday
  if (user.lastRequestDate !== today) {
    requestsToday = 0
  }

  if (requestsToday >= plan.requestsPerDay) {
    return { allowed: false, remaining: 0, limit: plan.requestsPerDay, plan: activePlan }
  }

  requestsToday++
  db.prepare('UPDATE users SET requestsToday = ?, lastRequestDate = ? WHERE id = ?').run(requestsToday, today, userId)

  return {
    allowed: true,
    remaining: plan.requestsPerDay - requestsToday,
    limit: plan.requestsPerDay,
    plan: activePlan,
  }
}

export function upgradePlan(userId: string, plan: string): boolean {
  const db = getDB()
  // Set expiration to 30 days from now
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  const result = db.prepare('UPDATE users SET plan = ?, planExpiresAt = ? WHERE id = ?').run(plan, expiresAt, userId)
  if (result.changes > 0) {
    console.log(`[Payment] User ${userId} upgraded to ${plan}, expires ${expiresAt}`)
    return true
  }
  return false
}

// =====================
// PAYMENT FUNCTIONS
// =====================

export function createPayment(userId: string, amount: number, plan: string, provider: string = 'robokassa'): Payment {
  const db = getDB()
  const payment: Payment = {
    id: crypto.randomUUID(),
    userId,
    amount,
    plan,
    status: 'pending',
    provider,
    externalId: '',
    createdAt: new Date().toISOString(),
    completedAt: '',
  }

  db.prepare(`
    INSERT INTO payments (id, userId, amount, plan, status, provider, externalId, createdAt, completedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(payment.id, payment.userId, payment.amount, payment.plan, payment.status, payment.provider, payment.externalId, payment.createdAt, payment.completedAt)

  return payment
}

export function completePayment(paymentId: string, externalId: string): Payment | null {
  const db = getDB()
  const now = new Date().toISOString()

  const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId) as Payment | undefined
  if (!payment || payment.status !== 'pending') return null

  db.prepare("UPDATE payments SET status = 'completed', externalId = ?, completedAt = ? WHERE id = ?").run(externalId, now, paymentId)

  // Activate the plan
  upgradePlan(payment.userId, payment.plan)

  return { ...payment, status: 'completed', externalId, completedAt: now }
}

export function failPayment(paymentId: string): void {
  const db = getDB()
  db.prepare("UPDATE payments SET status = 'failed' WHERE id = ?").run(paymentId)
}

export function getPaymentsByUser(userId: string, limit: number = 20): Payment[] {
  const db = getDB()
  return db.prepare('SELECT * FROM payments WHERE userId = ? ORDER BY createdAt DESC LIMIT ?').all(userId, limit) as Payment[]
}

export function getPaymentById(paymentId: string): Payment | null {
  const db = getDB()
  return db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId) as Payment | null
}

// Anonymous rate limiting â now SQLite-backed (survives restarts)
const ANON_LIMIT = 10

export function checkAnonLimit(ip: string): { allowed: boolean; remaining: number } {
  const db = getDB()
  const today = new Date().toISOString().split('T')[0]
  const key = `anon:${ip}`

  const entry = db.prepare("SELECT count, resetAt FROM rate_limits WHERE store = 'anon' AND key = ?").get(key) as any
  const todayTs = new Date(today).getTime() + 86400000 // end of day

  if (!entry || entry.resetAt < Date.now()) {
    db.prepare("INSERT OR REPLACE INTO rate_limits (store, key, count, resetAt, blockedUntil, failCount) VALUES ('anon', ?, 1, ?, 0, 0)").run(key, todayTs)
    return { allowed: true, remaining: ANON_LIMIT - 1 }
  }

  if (entry.count >= ANON_LIMIT) {
    return { allowed: false, remaining: 0 }
  }

  db.prepare("UPDATE rate_limits SET count = count + 1 WHERE store = 'anon' AND key = ?").run(key)
  return { allowed: true, remaining: ANON_LIMIT - entry.count - 1 }
}

// =====================
// MINER FUNCTIONS
// =====================

export function registerMiner(name: string, walletAddress: string, gpuModel: string, vram: number, models: string[]): Miner {
  const db = getDB()
  const miner: Miner = {
    id: crypto.randomUUID(),
    name,
    walletAddress,
    apiKey: 'rzm_' + crypto.randomBytes(32).toString('hex'),
    gpuModel,
    vram,
    status: 'offline',
    totalTasks: 0,
    successfulTasks: 0,
    failedTasks: 0,
    totalRewards: 0,
    reputation: 100,
    lastSeen: new Date().toISOString(),
    models,
    ip: '',
    port: 0,
    registeredAt: new Date().toISOString(),
  }

  db.prepare(`
    INSERT INTO miners (id, name, walletAddress, apiKey, gpuModel, vram, status, totalTasks, successfulTasks, failedTasks, totalRewards, reputation, lastSeen, models, ip, port, registeredAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(miner.id, miner.name, miner.walletAddress, miner.apiKey, miner.gpuModel, miner.vram, miner.status, 0, 0, 0, 0, 100, miner.lastSeen, JSON.stringify(models), '', 0, miner.registeredAt)

  return miner
}

export function getMinerByApiKey(apiKey: string): Miner | null {
  const db = getDB()
  const row = db.prepare('SELECT * FROM miners WHERE apiKey = ?').get(apiKey) as any
  if (!row) return null
  return { ...row, models: JSON.parse(row.models || '[]') }
}

export function updateMinerStatus(minerId: string, status: string, ip?: string, port?: number) {
  const db = getDB()
  const updates: string[] = ['status = ?', 'lastSeen = ?']
  const params: any[] = [status, new Date().toISOString()]
  if (ip) { updates.push('ip = ?'); params.push(ip) }
  if (port) { updates.push('port = ?'); params.push(port) }
  params.push(minerId)
  db.prepare(`UPDATE miners SET ${updates.join(', ')} WHERE id = ?`).run(...params)
}

export function getOnlineMiners(model?: string, limit: number = 100, offset: number = 0): Miner[] {
  const db = getDB()
  const rows = db.prepare("SELECT * FROM miners WHERE status IN ('online', 'busy') ORDER BY reputation DESC LIMIT ? OFFSET ?").all(limit, offset) as any[]
  return rows
    .map((r: any) => ({ ...r, models: JSON.parse(r.models || '[]') }))
    .filter((m: Miner) => !model || m.models.includes(model))
}

export function getNetworkStats() {
  const db = getDB()
  const totalMiners = db.prepare('SELECT COUNT(*) as count FROM miners').get() as any
  const onlineMiners = db.prepare("SELECT COUNT(*) as count FROM miners WHERE status IN ('online', 'busy')").get() as any
  const totalTasks = db.prepare('SELECT COUNT(*) as count FROM tasks').get() as any
  const completedTasks = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'completed'").get() as any
  const totalRewards = db.prepare('SELECT COALESCE(SUM(totalRewards), 0) as total FROM miners').get() as any
  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get() as any

  return {
    totalMiners: totalMiners.count,
    onlineMiners: onlineMiners.count,
    totalTasks: totalTasks.count,
    completedTasks: completedTasks.count,
    totalRewardsDistributed: totalRewards.total,
    totalUsers: totalUsers.count,
  }
}

// =====================
// CHAT HISTORY FUNCTIONS
// =====================

export interface Chat {
  id: string
  userId: string
  title: string
  model: string
  createdAt: string
  updatedAt: string
}

export interface ChatMessage {
  id: number
  chatId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: string
}

export function createChat(userId: string, title: string, model: string): Chat {
  const db = getDB()
  const now = new Date().toISOString()
  const chat: Chat = {
    id: crypto.randomUUID(),
    userId,
    title: title.slice(0, 100),
    model,
    createdAt: now,
    updatedAt: now,
  }
  db.prepare('INSERT INTO chats (id, userId, title, model, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)').run(
    chat.id, chat.userId, chat.title, chat.model, chat.createdAt, chat.updatedAt
  )
  return chat
}

export function getUserChats(userId: string, limit: number = 50): Chat[] {
  const db = getDB()
  return db.prepare('SELECT * FROM chats WHERE userId = ? ORDER BY updatedAt DESC LIMIT ?').all(userId, limit) as Chat[]
}

export function getChatById(chatId: string, userId: string): Chat | null {
  const db = getDB()
  return db.prepare('SELECT * FROM chats WHERE id = ? AND userId = ?').get(chatId, userId) as Chat | null
}

export function getChatMessages(chatId: string, limit: number = 200): ChatMessage[] {
  const db = getDB()
  return db.prepare('SELECT * FROM chat_messages WHERE chatId = ? ORDER BY id ASC LIMIT ?').all(chatId, limit) as ChatMessage[]
}

export function addChatMessage(chatId: string, role: string, content: string): void {
  const db = getDB()
  const now = new Date().toISOString()
  db.prepare('INSERT INTO chat_messages (chatId, role, content, createdAt) VALUES (?, ?, ?, ?)').run(chatId, role, content, now)
  db.prepare('UPDATE chats SET updatedAt = ? WHERE id = ?').run(now, chatId)
}

export function updateChatTitle(chatId: string, title: string): void {
  const db = getDB()
  db.prepare('UPDATE chats SET title = ? WHERE id = ?').run(title.slice(0, 100), chatId)
}

export function deleteChat(chatId: string, userId: string): boolean {
  const db = getDB()
  // Delete messages first, then chat
  const chat = db.prepare('SELECT id FROM chats WHERE id = ? AND userId = ?').get(chatId, userId)
  if (!chat) return false
  db.prepare('DELETE FROM chat_messages WHERE chatId = ?').run(chatId)
  db.prepare('DELETE FROM chats WHERE id = ?').run(chatId)
  return true
}

// =====================
// MINER FUNCTIONS
// =====================

// =====================
// ADMIN FUNCTIONS
// =====================

export function isAdmin(userId: string): boolean {
  const db = getDB()
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId) as { role: string } | undefined
  return user?.role === 'admin'
}

export function setUserRole(userId: string, role: 'user' | 'admin'): boolean {
  const db = getDB()
  const result = db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, userId)
  return result.changes > 0
}

export function getAllUsers(limit: number = 100, offset: number = 0): { users: Omit<User, 'passwordHash' | 'salt'>[]; total: number } {
  const db = getDB()
  const total = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any).count
  const users = db.prepare(
    'SELECT id, email, name, role, plan, planExpiresAt, requestsToday, lastRequestDate, createdAt FROM users ORDER BY createdAt DESC LIMIT ? OFFSET ?'
  ).all(limit, offset) as Omit<User, 'passwordHash' | 'salt'>[]
  return { users, total }
}

export function getAllMiners(limit: number = 100, offset: number = 0): { miners: Miner[]; total: number } {
  const db = getDB()
  const total = (db.prepare('SELECT COUNT(*) as count FROM miners').get() as any).count
  const rows = db.prepare('SELECT * FROM miners ORDER BY lastSeen DESC LIMIT ? OFFSET ?').all(limit, offset) as any[]
  const miners = rows.map((r: any) => ({ ...r, models: JSON.parse(r.models || '[]') }))
  return { miners, total }
}

export function getAdminStats() {
  const db = getDB()
  const totalUsers = (db.prepare('SELECT COUNT(*) as c FROM users').get() as any).c
  const totalMiners = (db.prepare('SELECT COUNT(*) as c FROM miners').get() as any).c
  const onlineMiners = (db.prepare("SELECT COUNT(*) as c FROM miners WHERE status IN ('online', 'busy')").get() as any).c
  const totalChats = (db.prepare('SELECT COUNT(*) as c FROM chats').get() as any).c
  const totalMessages = (db.prepare('SELECT COUNT(*) as c FROM chat_messages').get() as any).c
  const totalTasks = (db.prepare('SELECT COUNT(*) as c FROM tasks').get() as any).c
  const completedTasks = (db.prepare("SELECT COUNT(*) as c FROM tasks WHERE status = 'completed'").get() as any).c
  const totalPayments = (db.prepare("SELECT COUNT(*) as c FROM payments WHERE status = 'completed'").get() as any).c
  const revenue = (db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'completed'").get() as any).total

  // Users registered today
  const today = new Date().toISOString().split('T')[0]
  const usersToday = (db.prepare("SELECT COUNT(*) as c FROM users WHERE createdAt LIKE ?").get(`${today}%`) as any).c

  // Users by plan
  const planBreakdown = db.prepare('SELECT plan, COUNT(*) as count FROM users GROUP BY plan').all() as { plan: string; count: number }[]

  return {
    totalUsers,
    usersToday,
    totalMiners,
    onlineMiners,
    totalChats,
    totalMessages,
    totalTasks,
    completedTasks,
    totalPayments,
    revenue,
    planBreakdown,
  }
}

export function deleteUser(userId: string): boolean {
  const db = getDB()
  const transaction = db.transaction(() => {
    // Delete user's chats and messages
    const chats = db.prepare('SELECT id FROM chats WHERE userId = ?').all(userId) as { id: string }[]
    for (const chat of chats) {
      db.prepare('DELETE FROM chat_messages WHERE chatId = ?').run(chat.id)
    }
    db.prepare('DELETE FROM chats WHERE userId = ?').run(userId)
    db.prepare('DELETE FROM payments WHERE userId = ?').run(userId)
    db.prepare('DELETE FROM users WHERE id = ?').run(userId)
  })
  try {
    transaction()
    return true
  } catch {
    return false
  }
}

// =====================
// EMAIL VERIFICATION & PASSWORD RESET
// =====================

export function createEmailToken(userId: string, type: 'verify' | 'reset'): string {
  const db = getDB()
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = type === 'verify'
    ? Date.now() + 24 * 60 * 60 * 1000  // 24 hours for verification
    : Date.now() + 60 * 60 * 1000        // 1 hour for password reset

  // Invalidate previous unused tokens of same type for this user
  db.prepare("UPDATE email_tokens SET used = 1 WHERE userId = ? AND type = ? AND used = 0").run(userId, type)

  db.prepare(`
    INSERT INTO email_tokens (id, userId, type, token, expiresAt, used, createdAt)
    VALUES (?, ?, ?, ?, ?, 0, ?)
  `).run(crypto.randomUUID(), userId, type, token, expiresAt, new Date().toISOString())

  return token
}

export function verifyEmailToken(token: string, type: 'verify' | 'reset'): { userId: string } | null {
  const db = getDB()
  const row = db.prepare(
    'SELECT userId, expiresAt, used FROM email_tokens WHERE token = ? AND type = ?'
  ).get(token, type) as { userId: string; expiresAt: number; used: number } | undefined

  if (!row || row.used || row.expiresAt < Date.now()) return null

  // Mark token as used
  db.prepare("UPDATE email_tokens SET used = 1 WHERE token = ?").run(token)
  return { userId: row.userId }
}

export function setEmailVerified(userId: string): boolean {
  const db = getDB()
  const result = db.prepare('UPDATE users SET emailVerified = 1 WHERE id = ?').run(userId)
  return result.changes > 0
}

export function getUserByEmail(email: string): User | null {
  const db = getDB()
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | null
}

export function resetUserPassword(userId: string, newPassword: string): boolean {
  const db = getDB()
  const { hash, salt } = hashPassword(newPassword)
  const result = db.prepare('UPDATE users SET passwordHash = ?, salt = ? WHERE id = ?').run(hash, salt, userId)
  return result.changes > 0
}

// Cleanup expired tokens (run periodically)
export function cleanupExpiredTokens(): number {
  const db = getDB()
  const result = db.prepare('DELETE FROM email_tokens WHERE expiresAt < ? OR used = 1').run(Date.now() - 86400000)
  return result.changes
}

export function recordTaskCompletion(minerId: string, taskId: string, success: boolean, reward: number) {
  const db = getDB()
  const now = new Date().toISOString()

  // Use transaction to ensure atomic update of miner + task
  const transaction = db.transaction(() => {
    if (success) {
      db.prepare('UPDATE miners SET totalTasks = totalTasks + 1, successfulTasks = successfulTasks + 1, totalRewards = totalRewards + ?, reputation = MIN(reputation + 1, 1000) WHERE id = ?').run(reward, minerId)
      db.prepare("UPDATE tasks SET status = 'completed', completedAt = ?, reward = ? WHERE id = ?").run(now, reward, taskId)
    } else {
      db.prepare('UPDATE miners SET totalTasks = totalTasks + 1, failedTasks = failedTasks + 1, reputation = MAX(reputation - 5, 0) WHERE id = ?').run(minerId)
      db.prepare("UPDATE tasks SET status = 'failed', completedAt = ? WHERE id = ?").run(now, taskId)
    }
  })

  try {
    transaction()
  } catch (e) {
    console.error('[DB] Transaction error in recordTaskCompletion:', e)
    throw e
  }
}
