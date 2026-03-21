import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createAuthCacheEntry,
  getCachedAuthResult,
  pruneExpiredAuthCacheEntries,
  type AuthCacheEntry,
} from './authCache.ts'

test('getCachedAuthResult returns cached auth results while ttl is valid', () => {
  const cache = new Map<string, AuthCacheEntry<{ authenticated: boolean }>>([
    ['token-1', createAuthCacheEntry({ authenticated: true }, 1_000)],
  ])

  const cached = getCachedAuthResult(cache, 'token-1', 4_000, 5_000)

  assert.deepEqual(cached, { authenticated: true })
})

test('getCachedAuthResult drops expired entries before returning', () => {
  const cache = new Map<string, AuthCacheEntry<{ authenticated: boolean }>>([
    ['token-1', createAuthCacheEntry({ authenticated: true }, 1_000)],
  ])

  const cached = getCachedAuthResult(cache, 'token-1', 7_000, 5_000)

  assert.equal(cached, null)
  assert.equal(cache.has('token-1'), false)
})

test('pruneExpiredAuthCacheEntries removes expired items and trims oldest overflow', () => {
  const cache = new Map<string, AuthCacheEntry<number>>([
    ['expired', createAuthCacheEntry(1, 1_000)],
    ['oldest', createAuthCacheEntry(2, 5_000)],
    ['middle', createAuthCacheEntry(3, 6_000)],
    ['newest', createAuthCacheEntry(4, 7_000)],
  ])

  pruneExpiredAuthCacheEntries(cache, 12_000, 10_000, 2)

  assert.deepEqual([...cache.keys()], ['middle', 'newest'])
})
