import test from 'node:test'
import assert from 'node:assert/strict'

import { computeEffectiveOpen } from './eventReservationStatus.ts'

test('파싱 불가한 스케줄 시각은 열림 대신 닫힘(fail-safe)', () => {
  assert.equal(
    computeEffectiveOpen({ is_open: true, reservation_start_at: 'not-a-date', reservation_end_at: null }, '2026-08-18T00:00:00.000Z'),
    false
  )
  assert.equal(
    computeEffectiveOpen({ is_open: true, reservation_start_at: null, reservation_end_at: 'bogus' }, '2026-08-18T00:00:00.000Z'),
    false
  )
})

const NOW = '2026-08-13T05:00:00.000Z'

test('스케줄이 없으면 is_open 값을 그대로 사용', () => {
  assert.equal(computeEffectiveOpen({ is_open: true, reservation_start_at: null, reservation_end_at: null }, NOW), true)
  assert.equal(computeEffectiveOpen({ is_open: false, reservation_start_at: null, reservation_end_at: null }, NOW), false)
})

test('시작~종료 창 안이면 open (is_open=false여도 스케줄 우선)', () => {
  assert.equal(
    computeEffectiveOpen({ is_open: false, reservation_start_at: '2026-08-13T00:00:00.000Z', reservation_end_at: '2026-08-14T00:00:00.000Z' }, NOW),
    true
  )
})

test('시작 전이면 closed', () => {
  assert.equal(
    computeEffectiveOpen({ is_open: true, reservation_start_at: '2026-08-20T00:00:00.000Z', reservation_end_at: null }, NOW),
    false
  )
})

test('종료 시각 이후면 closed (경계: end는 배타적)', () => {
  assert.equal(
    computeEffectiveOpen({ is_open: true, reservation_start_at: null, reservation_end_at: '2026-08-13T05:00:00.000Z' }, NOW),
    false
  )
})

test('종료만 설정되고 아직 종료 전이면 open', () => {
  assert.equal(
    computeEffectiveOpen({ is_open: false, reservation_start_at: null, reservation_end_at: '2026-08-14T00:00:00.000Z' }, NOW),
    true
  )
})
