import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getReservationStatusesForScope,
  resolveReservationRegionScope,
} from '@/lib/reservationManagementHelpers'

test('resolveReservationRegionScope keeps super admin requested region or all regions', () => {
  assert.equal(resolveReservationRegionScope('super', 'south').regionCode, 'south')
  assert.equal(resolveReservationRegionScope('super', null).regionCode, null)
})

test('resolveReservationRegionScope restricts regional admins to their own region', () => {
  assert.deepEqual(resolveReservationRegionScope('south', null), { regionCode: 'south', error: null })
  assert.deepEqual(resolveReservationRegionScope('north', 'north'), { regionCode: 'north', error: null })
  assert.equal(
    resolveReservationRegionScope('south', 'north').error?.message,
    '해당 지역 데이터에 접근할 권한이 없습니다.'
  )
})

test('getReservationStatusesForScope maps each supported scope to the expected statuses', () => {
  assert.deepEqual(getReservationStatusesForScope('pending'), ['pending'])
  assert.deepEqual(getReservationStatusesForScope('approved'), ['approved'])
  assert.deepEqual(getReservationStatusesForScope('cancel_requested'), ['cancel_requested'])
  assert.deepEqual(getReservationStatusesForScope('active'), ['pending', 'approved', 'cancel_requested'])
  assert.equal(getReservationStatusesForScope('all'), null)
})
