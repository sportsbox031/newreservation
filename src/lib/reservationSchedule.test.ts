import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getKstNowLocalString,
  isReservationScheduleAction,
  kstLocalStringToUtcIso,
  utcIsoToKstLocalString,
} from './reservationSchedule.ts'

test('kstLocalStringToUtcIso converts KST to UTC (KST = UTC+9)', () => {
  assert.equal(kstLocalStringToUtcIso('2026-07-06T09:00'), '2026-07-06T00:00:00.000Z')
  assert.equal(kstLocalStringToUtcIso('2026-07-06T00:00'), '2026-07-05T15:00:00.000Z')
  assert.equal(kstLocalStringToUtcIso('2026-01-01T08:59'), '2025-12-31T23:59:00.000Z')
})

test('kstLocalStringToUtcIso rejects invalid format', () => {
  assert.equal(kstLocalStringToUtcIso(''), null)
  assert.equal(kstLocalStringToUtcIso('2026-07-06'), null)
  assert.equal(kstLocalStringToUtcIso('2026-07-06T09:00:00'), null)
  assert.equal(kstLocalStringToUtcIso('2026-7-6T09:00'), null)
  assert.equal(kstLocalStringToUtcIso('not-a-date'), null)
})

test('kstLocalStringToUtcIso rejects non-existent dates', () => {
  assert.equal(kstLocalStringToUtcIso('2026-02-30T10:00'), null)
  assert.equal(kstLocalStringToUtcIso('2026-13-01T10:00'), null)
  assert.equal(kstLocalStringToUtcIso('2026-07-06T24:00'), null)
  assert.equal(kstLocalStringToUtcIso('2026-07-06T10:60'), null)
})

test('utcIsoToKstLocalString converts UTC to KST local string', () => {
  assert.equal(utcIsoToKstLocalString('2026-07-06T00:00:00.000Z'), '2026-07-06T09:00')
  assert.equal(utcIsoToKstLocalString('2025-12-31T15:00:00.000Z'), '2026-01-01T00:00')
  assert.equal(utcIsoToKstLocalString('invalid'), null)
})

test('KST/UTC conversion round trip', () => {
  const samples = ['2026-07-06T09:30', '2026-01-01T00:00', '2026-12-31T23:59']
  for (const sample of samples) {
    const iso = kstLocalStringToUtcIso(sample)
    assert.ok(iso)
    assert.equal(utcIsoToKstLocalString(iso as string), sample)
  }
})

test('getKstNowLocalString reflects Asia/Seoul wall clock', () => {
  const now = new Date('2026-07-06T03:15:00.000Z')
  assert.equal(getKstNowLocalString(now), '2026-07-06T12:15')
})

test('isReservationScheduleAction accepts only open/close', () => {
  assert.equal(isReservationScheduleAction('open'), true)
  assert.equal(isReservationScheduleAction('close'), true)
  assert.equal(isReservationScheduleAction('pause'), false)
  assert.equal(isReservationScheduleAction(null), false)
})
