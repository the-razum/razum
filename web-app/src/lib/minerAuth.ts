/**
 * Miner Request Signing & Verification (ECDSA)
 *
 * Each miner generates an ECDSA keypair on first run.
 * The public key is sent during registration.
 * Every subsequent request is signed with the private key.
 * The coordinator verifies the signature before processing.
 *
 * This prevents:
 * - One miner impersonating another
 * - Replay attacks (nonce + timestamp)
 * - Man-in-the-middle result tampering
 */

import * as crypto from 'crypto'

/**
 * Verify an ECDSA signature from a miner request.
 *
 * Expected headers:
 * - X-Miner-Signature: hex-encoded ECDSA signature
 * - X-Miner-Timestamp: ISO timestamp (max 5 min old)
 * - X-Miner-Nonce: random nonce
 *
 * The signed payload is: timestamp + nonce + body
 */
export function verifyMinerSignature(
  publicKeyPem: string,
  body: string,
  signature: string,
  timestamp: string,
  nonce: string
): { valid: boolean; reason?: string } {
  // Check timestamp freshness (5 minute window)
  const ts = new Date(timestamp).getTime()
  if (isNaN(ts)) return { valid: false, reason: 'invalid timestamp' }

  const now = Date.now()
  const MAX_AGE_MS = 5 * 60 * 1000
  if (Math.abs(now - ts) > MAX_AGE_MS) {
    return { valid: false, reason: 'timestamp too old or in future' }
  }

  // Check nonce uniqueness (simple in-memory, rotates every 10 min)
  if (isNonceUsed(nonce)) {
    return { valid: false, reason: 'nonce already used (replay attack?)' }
  }
  markNonceUsed(nonce)

  // Build the payload that was signed
  const payload = timestamp + nonce + body

  try {
    const verify = crypto.createVerify('SHA256')
    verify.update(payload)
    verify.end()

    const isValid = verify.verify(publicKeyPem, Buffer.from(signature, 'hex'))
    return { valid: isValid, reason: isValid ? undefined : 'signature mismatch' }
  } catch (e: any) {
    return { valid: false, reason: 'verification error: ' + e.message }
  }
}

/**
 * Generate a new ECDSA keypair for a miner.
 * Returns PEM-encoded public and private keys.
 */
export function generateMinerKeypair(): { publicKey: string; privateKey: string } {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'secp256k1',
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  })
  return { publicKey, privateKey }
}

/**
 * Sign a request payload (used by miner.js).
 * This function is included here for reference — the actual signing
 * happens in miner.js on the miner's machine.
 */
export function signRequest(privateKeyPem: string, body: string, timestamp: string, nonce: string): string {
  const payload = timestamp + nonce + body
  const sign = crypto.createSign('SHA256')
  sign.update(payload)
  sign.end()
  return sign.sign(privateKeyPem, 'hex')
}

// --- Nonce tracking (prevent replay attacks) ---

const usedNonces = new Map<string, number>()
const NONCE_WINDOW_MS = 10 * 60 * 1000 // 10 minutes

function isNonceUsed(nonce: string): boolean {
  return usedNonces.has(nonce)
}

function markNonceUsed(nonce: string) {
  usedNonces.set(nonce, Date.now())
}

// Clean up old nonces every 5 minutes
if (!(globalThis as any).__razumNonceCleaner) {
  (globalThis as any).__razumNonceCleaner = setInterval(() => {
    const cutoff = Date.now() - NONCE_WINDOW_MS
    for (const [nonce, ts] of Array.from(usedNonces.entries())) {
      if (ts < cutoff) usedNonces.delete(nonce)
    }
  }, 5 * 60 * 1000)
}

/**
 * Extract and verify miner signature from a request.
 * If the miner has a public key registered, signature is required.
 * If no public key → signature is optional (backward compat).
 */
export function verifyMinerRequest(
  minerId: string,
  body: string,
  headers: { signature?: string; timestamp?: string; nonce?: string }
): { valid: boolean; signed: boolean; reason?: string } {
  try {
    const db = require('@/lib/db').getDB()
    const miner = db.prepare('SELECT publicKey FROM miners WHERE id = ?').get(minerId) as any

    // If miner has no public key registered, allow unsigned (backward compat)
    if (!miner?.publicKey) {
      return { valid: true, signed: false }
    }

    // Miner has public key → signature required
    if (!headers.signature || !headers.timestamp || !headers.nonce) {
      return { valid: false, signed: false, reason: 'signature required but missing' }
    }

    const result = verifyMinerSignature(
      miner.publicKey,
      body,
      headers.signature,
      headers.timestamp,
      headers.nonce
    )

    return { valid: result.valid, signed: true, reason: result.reason }
  } catch (e: any) {
    console.error('[MinerAuth] Verify error:', e.message)
    // On error, allow request (don't break service on auth bugs)
    return { valid: true, signed: false, reason: 'verify error: ' + e.message }
  }
}
