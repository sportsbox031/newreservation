import test from 'node:test'
import assert from 'node:assert/strict'

import { getAdminCalendarDayStatus } from './adminCalendarStatus.ts'

test('getAdminCalendarDayStatus returns full before closed when a date is already full', () => {
  const result = getAdminCalendarDayStatus(
    new Date('2026-04-01T00:00:00+09:00'),
    new Date('2026-03-22T00:00:00+09:00'),
    {
      '2026-04-01': {
        current: 2,
        max: 2,
        isFull: true,
        isOpen: false,
      },
    },
    []
  )

  assert.equal(result, 'full')
})

test('getAdminCalendarDayStatus returns limited for partially reserved dates even when the month is closed', () => {
  const result = getAdminCalendarDayStatus(
    new Date('2026-04-02T00:00:00+09:00'),
    new Date('2026-03-22T00:00:00+09:00'),
    {
      '2026-04-02': {
        current: 1,
        max: 2,
        isFull: false,
        isOpen: false,
      },
    },
    []
  )

  assert.equal(result, 'limited')
})

test('getAdminCalendarDayStatus returns closed for empty closed dates', () => {
  const result = getAdminCalendarDayStatus(
    new Date('2026-04-03T00:00:00+09:00'),
    new Date('2026-03-22T00:00:00+09:00'),
    {
      '2026-04-03': {
        current: 0,
        max: 2,
        isFull: false,
        isOpen: false,
      },
    },
    []
  )

  assert.equal(result, 'closed')
})
