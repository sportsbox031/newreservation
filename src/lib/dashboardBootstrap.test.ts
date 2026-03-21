import test from 'node:test'
import assert from 'node:assert/strict'

import {
  applyTierReservationOpenState,
  buildDashboardCalendarData,
  buildDashboardMeData,
  buildClosedDashboardBootstrapData,
  getDashboardBootstrapSharedCacheKey,
  getDashboardCalendarSharedCacheKey,
  getDashboardBootstrapClientCacheKey,
  getDashboardCalendarClientCacheKey,
  getDashboardMeClientCacheKey,
  getDashboardBootstrapUserMetaCacheKey,
  getDashboardBootstrapUserSummaryCacheKey,
  buildOpenDashboardBootstrapData,
  calculateRemainingReservationDays,
  getDashboardBootstrapClientCacheTtl,
  pruneExpiredDashboardCacheEntries,
  type TimestampedCacheEntry,
} from './dashboardBootstrap.ts'

test('calculateRemainingReservationDays counts unique reservation dates only once', () => {
  const remainingDays = calculateRemainingReservationDays(
    [
      { date: '2026-03-10' },
      { date: '2026-03-10' },
      { date: '2026-03-18' },
    ],
    4
  )

  assert.equal(remainingDays, 2)
})

test('calculateRemainingReservationDays does not go below zero', () => {
  const remainingDays = calculateRemainingReservationDays(
    [
      { date: '2026-03-01' },
      { date: '2026-03-02' },
      { date: '2026-03-03' },
      { date: '2026-03-04' },
      { date: '2026-03-05' },
    ],
    4
  )

  assert.equal(remainingDays, 0)
})

test('pruneExpiredDashboardCacheEntries removes expired entries and trims the oldest overflow', () => {
  const cache = new Map<string, TimestampedCacheEntry<number>>([
    ['expired', { cachedAt: 1_000, data: 1 }],
    ['oldest', { cachedAt: 5_000, data: 2 }],
    ['middle', { cachedAt: 6_000, data: 3 }],
    ['newest', { cachedAt: 7_000, data: 4 }],
  ])

  pruneExpiredDashboardCacheEntries(cache, 14_000, 10_000, 2)

  assert.deepEqual([...cache.keys()], ['middle', 'newest'])
})

test('applyTierReservationOpenState closes every day when the user tier is not open', () => {
  const result = applyTierReservationOpenState(
    {
      '2026-04-01': {
        current_reservations: 0,
        max_reservations_per_day: 2,
        is_full: false,
        available_slots: 2,
        is_open: true,
      },
      '2026-04-02': {
        current_reservations: 1,
        max_reservations_per_day: 0,
        is_full: true,
        available_slots: 0,
        is_open: false,
      },
    },
    false
  )

  assert.equal(result['2026-04-01'].is_open, false)
  assert.equal(result['2026-04-02'].is_open, false)
})

test('applyTierReservationOpenState keeps days with zero capacity closed even when the tier is open', () => {
  const result = applyTierReservationOpenState(
    {
      '2026-04-01': {
        current_reservations: 0,
        max_reservations_per_day: 2,
        is_full: false,
        available_slots: 2,
        is_open: false,
      },
      '2026-04-02': {
        current_reservations: 1,
        max_reservations_per_day: 0,
        is_full: true,
        available_slots: 0,
        is_open: false,
      },
    },
    true
  )

  assert.equal(result['2026-04-01'].is_open, true)
  assert.equal(result['2026-04-02'].is_open, false)
})

test('buildClosedDashboardBootstrapData returns a lightweight closed payload', () => {
  const result = buildClosedDashboardBootstrapData({
    organization_name: '테스트단체',
    tier: 'Standard',
    region_code: 'south',
    region_name: '경기남부',
  })

  assert.deepEqual(result, {
    user: {
      organization_name: '테스트단체',
      tier: 'Standard',
      region_code: 'south',
      region_name: '경기남부',
    },
    remainingDays: 4,
    reservationStatus: {},
    blockedDates: [],
    monthGate: {
      is_open: false,
    },
  })
})

test('buildOpenDashboardBootstrapData applies tier state and exposes an open month gate when any day is open', () => {
  const result = buildOpenDashboardBootstrapData(
    {
      organization_name: '테스트단체',
      tier: 'Priority',
      region_code: 'north',
      region_name: '경기북부',
    },
    3,
    {
      '2026-04-01': {
        current_reservations: 0,
        max_reservations_per_day: 2,
        is_full: false,
        available_slots: 2,
        is_open: false,
      },
      '2026-04-02': {
        current_reservations: 1,
        max_reservations_per_day: 0,
        is_full: true,
        available_slots: 0,
        is_open: false,
      },
    },
    [
      {
        date: '2026-04-03',
        start_time: null,
        end_time: null,
        reason: '휴무',
        id: 'blocked-1',
      },
    ],
    true
  )

  assert.equal(result.monthGate.is_open, true)
  assert.equal(result.reservationStatus['2026-04-01'].is_open, true)
  assert.equal(result.reservationStatus['2026-04-02'].is_open, false)
  assert.equal(result.remainingDays, 3)
})

test('getDashboardBootstrapClientCacheTtl keeps closed months on a shorter cache window', () => {
  assert.equal(getDashboardBootstrapClientCacheTtl(false), 3000)
  assert.equal(getDashboardBootstrapClientCacheTtl(true), 15000)
})

test('getDashboardBootstrapClientCacheKey scopes the cache to the active session token', () => {
  assert.equal(
    getDashboardBootstrapClientCacheKey(2026, 4, 'session-token-123456789'),
    'dashboardBootstrap:session-toke:2026-04'
  )
  assert.equal(
    getDashboardCalendarClientCacheKey(2026, 4, 'session-token-123456789'),
    'dashboardCalendar:session-toke:2026-04'
  )
  assert.equal(
    getDashboardMeClientCacheKey(2026, 4, 'session-token-123456789'),
    'dashboardMe:session-toke:2026-04'
  )
})

test('dashboard bootstrap server cache keys are stable and scoped to the right entities', () => {
  assert.equal(getDashboardBootstrapSharedCacheKey(1, 2026, 4), 'dashboardShared:1:2026:4')
  assert.equal(getDashboardCalendarSharedCacheKey(1, 2, 2026, 4), 'dashboardCalendar:1:2:2026:4')
  assert.equal(getDashboardBootstrapUserMetaCacheKey('user-123', 2026, 4), 'dashboardUserMeta:user-123:2026:4')
  assert.equal(getDashboardBootstrapUserSummaryCacheKey('user-123', 2026, 4), 'dashboardUserSummary:user-123:2026:4')
})

test('buildDashboardCalendarData returns only calendar state and marks month gate from tier-open days', () => {
  const result = buildDashboardCalendarData(
    {
      '2026-04-01': {
        current_reservations: 1,
        max_reservations_per_day: 2,
        is_full: false,
        available_slots: 1,
        is_open: false,
      },
      '2026-04-02': {
        current_reservations: 0,
        max_reservations_per_day: 0,
        is_full: true,
        available_slots: 0,
        is_open: false,
      },
    },
    [
      {
        date: '2026-04-10',
        start_time: null,
        end_time: null,
        reason: '휴무',
        id: 'blocked-1',
      },
    ],
    true
  )

  assert.deepEqual(result.blockedDates, [
    {
      date: '2026-04-10',
      start_time: null,
      end_time: null,
      reason: '휴무',
      id: 'blocked-1',
    },
  ])
  assert.equal(result.monthGate.is_open, true)
  assert.equal(result.reservationStatus['2026-04-01'].is_open, true)
  assert.equal(result.reservationStatus['2026-04-02'].is_open, false)
})

test('buildDashboardMeData returns only personal dashboard data', () => {
  const result = buildDashboardMeData(
    {
      organization_name: '테스트단체',
      tier: 'Priority',
      region_code: 'south',
      region_name: '경기남부',
    },
    2
  )

  assert.deepEqual(result, {
    user: {
      organization_name: '테스트단체',
      tier: 'Priority',
      region_code: 'south',
      region_name: '경기남부',
    },
    remainingDays: 2,
  })
})
