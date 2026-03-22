import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildCookieFirstClientHeaders,
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
