import test from 'node:test'
import assert from 'node:assert/strict'

import {
  mapReservationErrorMessage,
  RESERVATION_COMPETITION_FAILURE_MESSAGE,
  RESERVATION_SUCCESS_MESSAGE,
} from './reservationMessages.ts'

test('mapReservationErrorMessage normalizes busy responses into the shared competition failure message', () => {
  assert.equal(
    mapReservationErrorMessage('신청이 몰려 예약을 처리 중입니다. 잠시 후 다시 시도해주세요.'),
    RESERVATION_COMPETITION_FAILURE_MESSAGE
  )
})

test('mapReservationErrorMessage normalizes sold-out responses into the shared competition failure message', () => {
  assert.equal(
    mapReservationErrorMessage('예약이 마감되었습니다. 다른 날짜를 선택해주세요. (정원: 2개, 현재: 2개)'),
    RESERVATION_COMPETITION_FAILURE_MESSAGE
  )
})

test('mapReservationErrorMessage keeps duplicate-date validation messages intact', () => {
  const message = '이미 해당 날짜에 예약이 존재합니다. 같은 날짜에 중복 예약은 불가능합니다.'
  assert.equal(mapReservationErrorMessage(message), message)
})

test('reservation success message matches the approved UX copy', () => {
  assert.equal(
    RESERVATION_SUCCESS_MESSAGE,
    '예약신청이 완료되었습니다. 관리자의 승인을 기다려주세요.'
  )
})
