import test from 'node:test'
import assert from 'node:assert/strict'

import { buildDashboardUserMetaContextFromAuthUser } from './dashboardUserContext.ts'

test('buildDashboardUserMetaContextFromAuthUser maps auth user metadata into dashboard context', () => {
  const result = buildDashboardUserMetaContextFromAuthUser(
    {
      id: 'user-1',
      organization_name: '테스트단체',
      role: 'user',
      region_id: 1,
      region_code: 'south',
      region_name: '경기남부',
      tier: 'Priority',
    },
    2026,
    4
  )

  assert.deepEqual(result, {
    userMeta: {
      organization_name: '테스트단체',
      tier: 'Priority',
      region_code: 'south',
      region_name: '경기남부',
    },
    regionId: 1,
    userTierId: 1,
    yearMonth: '2026-04'
  })
})

test('buildDashboardUserMetaContextFromAuthUser returns null when dashboard metadata is missing', () => {
  const result = buildDashboardUserMetaContextFromAuthUser(
    {
      id: 'user-1',
      organization_name: '테스트단체',
      role: 'user',
      region_id: null,
    },
    2026,
    4
  )

  assert.equal(result, null)
})
