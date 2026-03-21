import test from 'node:test'
import assert from 'node:assert/strict'

import {
  classifyReservationOutcome,
  createReservationLogPayload,
} from './reservationLogging.ts'

test('classifyReservationOutcome distinguishes contention from sold-out failures', () => {
  assert.equal(
    classifyReservationOutcome('신청이 몰려 예약을 처리 중입니다. 잠시 후 다시 시도해주세요.'),
    'contention_busy'
  )
  assert.equal(
    classifyReservationOutcome('예약이 마감되었습니다. 다른 날짜를 선택해주세요.'),
    'capacity_full'
  )
})

test('classifyReservationOutcome recognizes timeout and defaults unexpected errors', () => {
  assert.equal(
    classifyReservationOutcome('예약 요청 처리 시간이 초과되었습니다.'),
    'timeout'
  )
  assert.equal(
    classifyReservationOutcome('알 수 없는 오류'),
    'unexpected_error'
  )
})

test('createReservationLogPayload returns structured, sanitized log data', () => {
  const payload = createReservationLogPayload({
    phase: 'rpc',
    outcome: 'success',
    userId: '12345678-abcd-efgh',
    regionId: 1,
    date: '2026-04-01',
    slotCount: 2,
    durationMs: 321,
  })

  assert.deepEqual(payload, {
    event: 'reservation_request',
    phase: 'rpc',
    outcome: 'success',
    userKey: 'efgh',
    regionId: 1,
    date: '2026-04-01',
    slotCount: 2,
    durationMs: 321,
  })
})
