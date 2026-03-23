import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildCookieFirstClientHeaders,
  buildCookieFirstJsonRequestInit,
  clearLegacySessionTokens,
} from './clientAuthHeaders.ts'

test('buildCookieFirstClientHeaders does not attach stale authorization tokens', () => {
  assert.deepEqual(buildCookieFirstClientHeaders(), {
    'Content-Type': 'application/json',
  })
})

test('clearLegacySessionTokens removes both legacy user token keys', () => {
  const removed: string[] = []
  const storage = {
    removeItem(key: string) {
      removed.push(key)
    },
  }

  clearLegacySessionTokens(storage)

  assert.deepEqual(removed, ['session_token', 'sessionToken'])
})

test('buildCookieFirstJsonRequestInit uses cookies instead of stale bearer tokens', () => {
  const init = buildCookieFirstJsonRequestInit({ hello: 'world' })

  assert.equal(init.method, 'POST')
  assert.equal(init.credentials, 'include')
  assert.deepEqual(init.headers, {
    'Content-Type': 'application/json',
  })
  assert.equal(init.body, JSON.stringify({ hello: 'world' }))
})
