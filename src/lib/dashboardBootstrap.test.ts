import test from 'node:test'
import assert from 'node:assert/strict'

import {
  applyTierReservationOpenState,
  calculateRemainingReservationDays,
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
