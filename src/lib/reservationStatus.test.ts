import test from 'node:test'
import assert from 'node:assert/strict'

import { applyReservationStatusDelta } from '@/lib/reservationStatus'

test('applyReservationStatusDelta marks a date as full when current reaches max', () => {
  const result = applyReservationStatusDelta({
    '2026-04-01': {
      current: 1,
      max: 2,
      isFull: false,
      isOpen: true,
    },
  }, '2026-04-01', 1)

  assert.deepEqual(result['2026-04-01'], {
    current: 2,
    max: 2,
    isFull: true,
    isOpen: true,
  })
})

test('applyReservationStatusDelta preserves previous state when the date is missing', () => {
  const previous = {
    '2026-04-01': {
      current: 1,
      max: 2,
      isFull: false,
      isOpen: true,
    },
  }

  const result = applyReservationStatusDelta(previous, '2026-04-02', 1)
  assert.equal(result, previous)
})
