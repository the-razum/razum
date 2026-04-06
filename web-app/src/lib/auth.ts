import crypto from 'crypto'
import { cookies } from 'next/headers'
import { getUserById } from './db'

const SECRET = process.env.AUTH_SECRET || 'razum-ai-secret-key-change-in-production-2026'

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

    if (signature !== expected) return null

    // Token expires in 30 days
    const age = Date.now() - parseInt(timestamp)
    if (age > 30 * 24 * 60 * 60 * 1000) return null

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
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60, // 30 days
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
