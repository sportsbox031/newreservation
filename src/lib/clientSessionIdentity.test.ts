import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getCookieFirstClientSessionScope,
  readStoredCurrentUserId,
} from './clientSessionIdentity.ts'

test('readStoredCurrentUserId returns the current user id from local storage payloads', () => {
  const storage = {
    getItem(key: string) {
      return key === 'currentUser' ? JSON.stringify({ id: 'user-123', name: '테스트단체' }) : null
    },
  }

  assert.equal(readStoredCurrentUserId(storage), 'user-123')
})

test('readStoredCurrentUserId ignores malformed cached user payloads', () => {
  const storage = {
    getItem() {
      return '{bad-json'
    },
  }

  assert.equal(readStoredCurrentUserId(storage), null)
})

test('getCookieFirstClientSessionScope falls back to a cookie session scope when no current user exists', () => {
  const storage = {
    getItem() {
      return null
    },
  }

  assert.equal(getCookieFirstClientSessionScope(storage), 'cookie-session')
})

test('getCookieFirstClientSessionScope scopes cache keys to the current user instead of legacy tokens', () => {
  const storage = {
    getItem(key: string) {
      return key === 'currentUser' ? JSON.stringify({ id: 'user-999' }) : null
    },
  }

  assert.equal(getCookieFirstClientSessionScope(storage), 'user:user-999')
})
