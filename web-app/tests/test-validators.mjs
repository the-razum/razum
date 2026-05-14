import { test } from 'node:test'
import assert from 'node:assert/strict'

// Razum bech32 address regex
const RAZUM_ADDR = /^razum1[02-9ac-hj-np-z]{38}$/

test('valid razum address passes regex', () => {
  assert.ok(RAZUM_ADDR.test('razum1pu5hjzxe0nkutl5evaavp2s65z3kknemn2vmzn'))
})
test('invalid prefix fails', () => {
  assert.equal(RAZUM_ADDR.test('cosmos1pu5hjzxe0nkutl5evaavp2s65z3kknemn2vmzn'), false)
})
test('too short fails', () => {
  assert.equal(RAZUM_ADDR.test('razum1abc'), false)
})

test('email regex basic cases', () => {
  const re = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/
  assert.ok(re.test('test@airazum.com'))
  assert.equal(re.test('not-an-email'), false)
})
