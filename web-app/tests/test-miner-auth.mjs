import { test } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'

test('ECDSA secp256k1 sign and verify roundtrip', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'secp256k1' })
  const data = Buffer.from('hello miner')
  const sig = crypto.sign('SHA256', data, privateKey)
  assert.ok(crypto.verify('SHA256', data, publicKey, sig))
  // Tampered data must fail
  assert.equal(crypto.verify('SHA256', Buffer.from('tampered'), publicKey, sig), false)
})

test('Timestamp window check (server-side logic)', () => {
  const MAX_AGE_MS = 12 * 60 * 60 * 1000
  const now = Date.now()
  // within window
  assert.ok(Math.abs(now - (now - 1000)) < MAX_AGE_MS)
  // outside window
  assert.equal(Math.abs(now - (now - MAX_AGE_MS - 1000)) < MAX_AGE_MS, false)
})

test('Nonce uniqueness — replay protection idea', () => {
  const seen = new Set()
  for (let i = 0; i < 1000; i++) {
    const nonce = crypto.randomBytes(16).toString('hex')
    assert.ok(!seen.has(nonce), 'collision should be effectively impossible')
    seen.add(nonce)
  }
  assert.equal(seen.size, 1000)
})

test('PEM key serialization round trip', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'secp256k1' })
  const privPem = privateKey.export({ format: 'pem', type: 'sec1' })
  const pubPem  = publicKey.export({ format: 'pem', type: 'spki' })
  assert.ok(privPem.includes('BEGIN EC PRIVATE KEY'))
  assert.ok(pubPem.includes('BEGIN PUBLIC KEY'))
  // round trip
  const loadedPriv = crypto.createPrivateKey({ key: privPem, format: 'pem' })
  const loadedPub  = crypto.createPublicKey({ key: pubPem, format: 'pem' })
  const data = Buffer.from('payload')
  const sig = crypto.sign('SHA256', data, loadedPriv)
  assert.ok(crypto.verify('SHA256', data, loadedPub, sig))
})
