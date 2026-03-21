import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getSessionValidatedAtStorageKey,
  isFreshSessionValidation,
} from './sessionCache.ts'

test('getSessionValidatedAtStorageKey scopes the cache key by session token', () => {
  assert.equal(
    getSessionValidatedAtStorageKey('token-1234567890'),
    'sessionValidatedAt:token-123456'
  )
})

test('isFreshSessionValidation only accepts timestamps within the ttl window', () => {
  assert.equal(isFreshSessionValidation('1000', 20_000, 30_000), true)
  assert.equal(isFreshSessionValidation('1000', 40_000, 30_000), false)
  assert.equal(isFreshSessionValidation(null, 40_000, 30_000), false)
})
