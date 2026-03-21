import test from 'node:test'
import assert from 'node:assert/strict'

import {
  shouldFallbackAfterRpcFailure,
  isMissingAtomicReservationFunctionError,
  getTierReservationWindowKey,
  getTierIdFromName,
} from './routeHelpers.ts'

test('shouldFallbackAfterRpcFailure returns false for reservation timeout errors', () => {
  assert.equal(
    shouldFallbackAfterRpcFailure(new Error('예약 요청 처리 시간이 초과되었습니다.')),
    false
  )
})

test('shouldFallbackAfterRpcFailure returns true when the atomic reservation function is missing', () => {
  assert.equal(
    shouldFallbackAfterRpcFailure({ code: 'PGRST202' }),
    true
  )
})

test('isMissingAtomicReservationFunctionError detects missing function messages', () => {
  assert.equal(
    isMissingAtomicReservationFunctionError({ message: 'Could not find the function create_reservation_atomic' }),
    true
  )
})

test('getTierIdFromName maps Priority to tier id 1 and defaults others to 2', () => {
  assert.equal(getTierIdFromName('Priority'), 1)
  assert.equal(getTierIdFromName('Standard'), 2)
  assert.equal(getTierIdFromName(null), 2)
})

test('getTierReservationWindowKey extracts the year-month segment', () => {
  assert.equal(getTierReservationWindowKey('2026-04-01'), '2026-04')
})
