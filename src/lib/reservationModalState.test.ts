import test from 'node:test'
import assert from 'node:assert/strict'

import {
  EMPTY_RESERVATION_SLOT_FORM,
  getClosedReservationModalState,
} from './reservationModalState.ts'

test('getClosedReservationModalState resets modal state for the next reservation attempt', () => {
  const state = getClosedReservationModalState()

  assert.equal(state.activeModal, null)
  assert.equal(state.selectedDate, null)
  assert.deepEqual(state.reservationSlots, [EMPTY_RESERVATION_SLOT_FORM])
  assert.notEqual(state.reservationSlots[0], EMPTY_RESERVATION_SLOT_FORM)
})
