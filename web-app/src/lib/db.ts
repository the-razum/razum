import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import crypto from 'crypto'

const DB_PATH = join(process.cwd(), 'data', 'users.json')

export interface User {
  id: string
  email: string
  name: string
  passwordHash: string
  salt: string
  plan: 'free' | 'start' | 'basic' | 'pro'
  requestsToday: number
  lastRequestDate: string
  createdAt: string
}

export interface DB {
  users: User[]
}

function ensureDir() {
  const dir = join(process.cwd(), 'data')
  if (!existsSync(dir)) {
    const { mkdirSync } = require('fs')
    mkdirSync(dir, { recursive: true })
  }
}

function readDB(): DB {
  ensureDir()
  if (!existsSync(DB_PATH)) {
    const empty: DB = { users: [] }
    writeFileSync(DB_PATH, JSON.stringify(empty, null, 2))
    return empty
  }
  return JSON.parse(readFileSync(DB_PATH, 'utf-8'))
}

function writeDB(db: DB) {
  ensureDir()
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2))
}

// Password hashing with built-in crypto
function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const s = salt || crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, s, 10000, 64, 'sha512').toString('hex')
  return { hash, salt: s }
}

// PLANS with limits
export const PLANS = {
  free:  { name: 'Free',    requestsPerDay: 30,   price: 0 },
  start: { name: 'Старт',   requestsPerDay: 500,  price: 490 },
  basic: { name: 'Базовый', requestsPerDay: 2000, price: 990 },
  pro:   { name: 'Про',     requestsPerDay: 99999, price: 1990 },
}

// Register
export function registerUser(email: string, name: string, password: string): User | null {
  const db = readDB()

  if (db.users.find(u => u.email === email)) {
    return null // already exists
  }

  const { hash, salt } = hashPassword(password)
  const user: User = {
    id: crypto.randomUUID(),
    email,
    name,
    passwordHash: hash,
    salt,
    plan: 'free',
    requestsToday: 0,
    lastRequestDate: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
  }

  db.users.push(user)
  writeDB(db)
  return user
}

// Login
export function loginUser(email: string, password: string): User | null {
  const db = readDB()
  const user = db.users.find(u => u.email === email)
  if (!user) return null

  const { hash } = hashPassword(password, user.salt)
  if (hash !== user.passwordHash) return null

  return user
}

// Get user by ID
export function getUserById(id: string): User | null {
  const db = readDB()
  return db.users.find(u => u.id === id) || null
}

// Check and increment request count
export function checkAndIncrementRequests(userId: string): { allowed: boolean; remaining: number; limit: number } {
  const db = readDB()
  const user = db.users.find(u => u.id === userId)
  if (!user) return { allowed: false, remaining: 0, limit: 0 }

  const today = new Date().toISOString().split('T')[0]
  const plan = PLANS[user.plan]

  // Reset counter if new day
  if (user.lastRequestDate !== today) {
    user.requestsToday = 0
    user.lastRequestDate = today
  }

  if (user.requestsToday >= plan.requestsPerDay) {
    return { allowed: false, remaining: 0, limit: plan.requestsPerDay }
  }

  user.requestsToday++
  writeDB(db)

  return {
    allowed: true,
    remaining: plan.requestsPerDay - user.requestsToday,
    limit: plan.requestsPerDay
  }
}

// Anonymous rate limiting (by IP, stored in memory)
const anonLimits = new Map<string, { count: number; date: string }>()
const ANON_LIMIT = 10

export function checkAnonLimit(ip: string): { allowed: boolean; remaining: number } {
  const today = new Date().toISOString().split('T')[0]
  const entry = anonLimits.get(ip)

  if (!entry || entry.date !== today) {
    anonLimits.set(ip, { count: 1, date: today })
    return { allowed: true, remaining: ANON_LIMIT - 1 }
  }

  if (entry.count >= ANON_LIMIT) {
    return { allowed: false, remaining: 0 }
  }

  entry.count++
  return { allowed: true, remaining: ANON_LIMIT - entry.count }
}
