import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildReservationMonthTransitionMessage,
  getInitialDashboardMonth,
  normalizeYearMonth,
  resolveActiveReservationMonth,
} from './reservationActiveMonth.ts'

test('normalizeYearMonth zero-pads a valid year-month value', () => {
  assert.equal(normalizeYearMonth('2026-4'), '2026-04')
})

test('resolveActiveReservationMonth prefers explicitly active months', () => {
  const result = resolveActiveReservationMonth({
    activeMonths: ['2026-05'],
    tierOpenMonths: ['2026-04'],
  })

  assert.equal(result, '2026-05')
})

test('resolveActiveReservationMonth falls back to tier-open months when no explicit active month exists', () => {
  const result = resolveActiveReservationMonth({
    activeMonths: [],
    tierOpenMonths: ['2026-04', '2026-04'],
  })

  assert.equal(result, '2026-04')
})

test('buildReservationMonthTransitionMessage formats Korean month labels', () => {
  assert.equal(
    buildReservationMonthTransitionMessage('2026-04', '2026-05'),
    '4월이 예약중입니다. 4월 예약을 종료하고 5월 예약을 시작하시겠습니까?'
  )
})

test('getInitialDashboardMonth returns the active reservation month when present', () => {
  const result = getInitialDashboardMonth('2026-05', new Date('2026-04-02T10:00:00+09:00'))

  assert.equal(result.getFullYear(), 2026)
  assert.equal(result.getMonth(), 4)
  assert.equal(result.getDate(), 1)
})

test('getInitialDashboardMonth falls back to the current month when no active month exists', () => {
  const result = getInitialDashboardMonth(null, new Date('2026-04-02T10:00:00+09:00'))

  assert.equal(result.getFullYear(), 2026)
  assert.equal(result.getMonth(), 3)
  assert.equal(result.getDate(), 1)
})
