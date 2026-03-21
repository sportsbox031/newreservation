import test from 'node:test'
import assert from 'node:assert/strict'

import { shouldStartDashboardRefresh } from './dashboardRefresh.ts'

test('shouldStartDashboardRefresh skips when a refresh is already in flight', () => {
  assert.equal(
    shouldStartDashboardRefresh({
      now: 10_000,
      inFlight: true,
      lastCompletedAt: 0,
      minIntervalMs: 2_000,
      force: false,
    }),
    false
  )
})

test('shouldStartDashboardRefresh throttles non-forced refreshes inside the minimum interval', () => {
  assert.equal(
    shouldStartDashboardRefresh({
      now: 10_000,
      inFlight: false,
      lastCompletedAt: 9_000,
      minIntervalMs: 2_000,
      force: false,
    }),
    false
  )
})

test('shouldStartDashboardRefresh allows forced refreshes after in-flight work completes', () => {
  assert.equal(
    shouldStartDashboardRefresh({
      now: 10_000,
      inFlight: false,
      lastCompletedAt: 9_500,
      minIntervalMs: 2_000,
      force: true,
    }),
    true
  )
})
