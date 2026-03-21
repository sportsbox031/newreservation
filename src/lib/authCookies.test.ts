import test from 'node:test'
import assert from 'node:assert/strict'

import {
  ADMIN_SESSION_COOKIE_NAME,
  USER_SESSION_COOKIE_NAME,
  buildClearedSessionCookieOptions,
  buildSessionCookieConfig,
  getAuthTokenFromRequest,
} from './authCookies.ts'

test('buildSessionCookieConfig returns strict httpOnly cookie defaults for user sessions', () => {
  const result = buildSessionCookieConfig('user', 'token-123', '2026-03-23T00:00:00.000Z')

  assert.equal(result.name, USER_SESSION_COOKIE_NAME)
  assert.equal(result.value, 'token-123')
  assert.equal(result.options.httpOnly, true)
  assert.equal(result.options.sameSite, 'strict')
  assert.equal(result.options.path, '/')
  assert.equal(result.options.expires.toISOString(), '2026-03-23T00:00:00.000Z')
})

test('buildClearedSessionCookieOptions expires cookies immediately', () => {
  const result = buildClearedSessionCookieOptions()

  assert.equal(result.httpOnly, true)
  assert.equal(result.sameSite, 'strict')
  assert.equal(result.path, '/')
  assert.equal(result.maxAge, 0)
  assert.equal(result.expires.getTime(), 0)
})

test('getAuthTokenFromRequest prefers authorization header over cookies', () => {
  const result = getAuthTokenFromRequest({
    headers: {
      get(name: string) {
        return name === 'authorization' ? 'Bearer header-token' : null
      },
    },
    cookies: {
      get(name: string) {
        if (name === USER_SESSION_COOKIE_NAME) {
          return { value: 'user-cookie-token' }
        }
        if (name === ADMIN_SESSION_COOKIE_NAME) {
          return { value: 'admin-cookie-token' }
        }
        return undefined
      },
    },
  })

  assert.equal(result, 'header-token')
})

test('getAuthTokenFromRequest falls back to user cookie then admin cookie', () => {
  const userFirst = getAuthTokenFromRequest({
    headers: { get() { return null } },
    cookies: {
      get(name: string) {
        if (name === USER_SESSION_COOKIE_NAME) {
          return { value: 'user-cookie-token' }
        }
        if (name === ADMIN_SESSION_COOKIE_NAME) {
          return { value: 'admin-cookie-token' }
        }
        return undefined
      },
    },
  })

  const adminOnly = getAuthTokenFromRequest({
    headers: { get() { return null } },
    cookies: {
      get(name: string) {
        if (name === ADMIN_SESSION_COOKIE_NAME) {
          return { value: 'admin-cookie-token' }
        }
        return undefined
      },
    },
  }, ['user', 'admin'])

  assert.equal(userFirst, 'user-cookie-token')
  assert.equal(adminOnly, 'admin-cookie-token')
})
