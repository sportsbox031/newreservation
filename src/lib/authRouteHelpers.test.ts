import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildAdminLoginResult,
  buildSessionValidationResult,
  buildUserLoginResult,
  getAdminRegionCode,
  getClientInfoFromHeaders,
} from './authRouteHelpers.ts'

test('getClientInfoFromHeaders prefers forwarded ip and keeps the user agent', () => {
  const result = getClientInfoFromHeaders({
    'x-forwarded-for': '203.0.113.1, 198.51.100.8',
    'user-agent': 'test-agent',
  })

  assert.deepEqual(result, {
    ip_address: '203.0.113.1',
    user_agent: 'test-agent',
  })
})

test('getAdminRegionCode maps regional admin roles only', () => {
  assert.equal(getAdminRegionCode('south'), 'south')
  assert.equal(getAdminRegionCode('north'), 'north')
  assert.equal(getAdminRegionCode('super'), null)
})

test('buildUserLoginResult strips the password hash and appends session data', () => {
  const expiresAt = '2026-03-23T00:00:00.000Z'
  const result = buildUserLoginResult(
    {
      id: 'user-1',
      organization_name: '테스트단체',
      status: 'approved',
      password_hash: 'secret',
      tier: 'Priority',
      cities: {
        name: '수원시',
        regions: {
          name: '경기남부',
          code: 'south',
        },
      },
    },
    'token-123',
    expiresAt
  )

  assert.equal('password_hash' in result, false)
  assert.equal(result.session_token, 'token-123')
  assert.equal(result.session_expires, expiresAt)
  assert.equal(result.cities?.regions?.code, 'south')
})

test('buildAdminLoginResult preserves the existing admin login payload shape', () => {
  const expiresAt = '2026-03-23T00:00:00.000Z'
  const result = buildAdminLoginResult(
    {
      id: 'admin-1',
      username: 'admin_south',
      role: 'south',
      phone: '010-1111-2222',
      email: 'south@example.com',
    },
    'token-456',
    expiresAt,
    2
  )

  assert.deepEqual(result, {
    id: 'admin-1',
    username: 'admin_south',
    role: 'south',
    region_id: 2,
    phone: '010-1111-2222',
    email: 'south@example.com',
    isAuthenticated: true,
    session_token: 'token-456',
    session_expires: expiresAt,
  })
})

test('buildSessionValidationResult keeps the current sessionAPI response contract', () => {
  const result = buildSessionValidationResult({
    id: 'session-1',
    user_id: 'user-1',
    users: {
      id: 'user-1',
      organization_name: '테스트단체',
    },
  })

  assert.deepEqual(result, {
    id: 'session-1',
    user_id: 'user-1',
    users: {
      id: 'user-1',
      organization_name: '테스트단체',
    },
  })
})
