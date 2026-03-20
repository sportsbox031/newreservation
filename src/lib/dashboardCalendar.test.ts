import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getDefaultDashboardMonth,
  getDashboardMonthCacheKey,
  getDashboardTargetDate,
} from './dashboardCalendar.ts'

test('getDefaultDashboardMonth returns the first day of next month', () => {
  const result = getDefaultDashboardMonth(new Date('2026-03-21T10:00:00+09:00'))

  assert.equal(result.getFullYear(), 2026)
  assert.equal(result.getMonth(), 3)
  assert.equal(result.getDate(), 1)
})

test('getDefaultDashboardMonth rolls over to January of next year', () => {
  const result = getDefaultDashboardMonth(new Date('2026-12-21T10:00:00+09:00'))

  assert.equal(result.getFullYear(), 2027)
  assert.equal(result.getMonth(), 0)
  assert.equal(result.getDate(), 1)
})

test('getDashboardMonthCacheKey includes user, region and year-month for tier-aware caching', () => {
  assert.equal(
    getDashboardMonthCacheKey('user-123', 'south', 2026, 4),
    'dashboardMonthGate:user-123:south:2026-04'
  )
})

test('getDashboardTargetDate returns the first day of the requested month', () => {
  assert.equal(getDashboardTargetDate(2026, 4), '2026-04-01')
})
