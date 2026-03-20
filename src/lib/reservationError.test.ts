import test from 'node:test'
import assert from 'node:assert/strict'

import { isReservationTimeoutError } from './reservationError.ts'

test('isReservationTimeoutError returns true for timeout messages', () => {
  assert.equal(
    isReservationTimeoutError(new Error('예약 요청 처리 시간이 초과되었습니다.')),
    true
  )
})

test('isReservationTimeoutError returns false for unknown values without throwing', () => {
  assert.equal(isReservationTimeoutError({ code: 'UNKNOWN' }), false)
  assert.equal(isReservationTimeoutError(null), false)
})
