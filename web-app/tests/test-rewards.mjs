import { test } from 'node:test'
import assert from 'node:assert/strict'

const INITIAL_EPOCH_REWARD = 323_000
const HALVING_EPOCHS = 208
function calcReward(epoch) {
  const h = Math.floor(epoch / HALVING_EPOCHS)
  if (h >= 20) return 0
  return INITIAL_EPOCH_REWARD / Math.pow(2, h)
}

test('reward at epoch 0', () => assert.equal(calcReward(0), 323_000))
test('reward at epoch 207 (just before halving)', () => assert.equal(calcReward(207), 323_000))
test('reward at epoch 208 (first halving)', () => assert.equal(calcReward(208), 161_500))
test('reward at epoch 416 (second halving)', () => assert.equal(calcReward(416), 80_750))
test('reward goes to 0 eventually', () => assert.equal(calcReward(20 * HALVING_EPOCHS), 0))
test('reward never negative', () => {
  for (let e = 0; e < 50000; e += 100) assert.ok(calcReward(e) >= 0)
})
