import test from 'node:test'
import assert from 'node:assert/strict'

import {
  resolveMemberRegionScope,
  canManageRequestedRegion,
} from './memberAdminHelpers.ts'

test('resolveMemberRegionScope restricts regional admins to their own region', () => {
  assert.equal(resolveMemberRegionScope('south', null), 'south')
  assert.equal(resolveMemberRegionScope('south', 'north'), 'south')
  assert.equal(resolveMemberRegionScope('north', 'south'), 'north')
})

test('resolveMemberRegionScope lets super admins use the requested region or all regions', () => {
  assert.equal(resolveMemberRegionScope('super', null), null)
  assert.equal(resolveMemberRegionScope('super', 'south'), 'south')
  assert.equal(resolveMemberRegionScope('super', 'north'), 'north')
})

test('canManageRequestedRegion blocks regional admins from crossing regions', () => {
  assert.equal(canManageRequestedRegion('south', 'south'), true)
  assert.equal(canManageRequestedRegion('south', 'north'), false)
  assert.equal(canManageRequestedRegion('north', 'south'), false)
  assert.equal(canManageRequestedRegion('super', 'south'), true)
})
