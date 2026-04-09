import crypto from 'crypto'
import { cookies } from 'next/headers'
import { getUserById } from './db'

// CRITICAL: Fail hard without AUTH_SECRET in production
if (process.env.NODE_ENV === 'production' && !process.env.AUTH_SECRET) {
  throw new Error('[FATAL] AUTH_SECRET environment variable is required in production. Generate with: openssl rand -hex 64')
}

const SECRET = process.env.AUTH_SECRET || 'dev-only-secret-not-for-production'

// Simple token: userId.timestamp.signature
export function createToken(userId: string): string {
  const timestamp = Date.now().toString()
  const data = `${userId}.${timestamp}`
  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(data)
    .digest('hex')
  return Buffer.from(`${data}.${signature}`).toString('base64')
}

export function verifyToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, 'base64').toString()
    const parts = decoded.split('.')
    if (parts.length !== 3) return null

    const [userId, timestamp, signature] = parts
    const data = `${userId}.${timestamp}`
    const expected = crypto
      .createHmac('sha256', SECRET)
      .update(data)
      .digest('hex')

    // Timing-safe comparison
    if (signature.length !== expected.length) return null
    const sigBuf = Buffer.from(signature, 'utf-8')
    const expBuf = Buffer.from(expected, 'utf-8')
    if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null

    // Token expires in 7 days (industry standard)
    const age = Date.now() - parseInt(timestamp)
    if (age > 7 * 24 * 60 * 60 * 1000) return null

    return userId
  } catch {
    return null
  }
}

export function setAuthCookie(userId: string) {
  const token = createToken(userId)
  cookies().set('razum_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
  })
}

export function getCurrentUser() {
  const token = cookies().get('razum_token')?.value
  if (!token) return null
  const userId = verifyToken(token)
  if (!userId) return null
  return getUserById(userId)
}

export function clearAuthCookie() {
  cookies().delete('razum_token')
}
