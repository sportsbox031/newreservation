import test from 'node:test'
import assert from 'node:assert/strict'

import {
  RESERVATION_MAX_START_TIME,
  RESERVATION_MIN_START_TIME,
  buildReservationStartTimeOptions,
  isReservationStartTimeAllowed,
} from './reservationTimePolicy.ts'

test('reservation start time options begin at 09:50', () => {
  const options = buildReservationStartTimeOptions()

  assert.equal(options[0], RESERVATION_MIN_START_TIME)
  assert.equal(options.at(-1), RESERVATION_MAX_START_TIME)
  assert.equal(options.includes('09:00'), false)
  assert.equal(options.includes('09:40'), false)
  assert.equal(options.includes('09:50'), true)
  assert.equal(options.includes('16:30'), true)
  assert.equal(options.includes('16:40'), false)
})

test('reservation start time policy rejects times outside the allowed range', () => {
  assert.equal(isReservationStartTimeAllowed('09:40'), false)
  assert.equal(isReservationStartTimeAllowed('09:50'), true)
  assert.equal(isReservationStartTimeAllowed('16:30'), true)
  assert.equal(isReservationStartTimeAllowed('16:40'), false)
})
