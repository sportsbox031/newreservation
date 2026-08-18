import test from 'node:test'
import assert from 'node:assert/strict'

import {
  validateApplicationInput,
  computeTotalCount,
  canCancelApplication,
} from './eventApplicationHelpers.ts'

test('event_id 없으면 거부', () => {
  const r = validateApplicationInput({ event_date_id: 'd1', student_count: 3, leader_count: 1 })
  assert.equal(r.ok, false)
})

test('event_date_id 없으면 거부', () => {
  const r = validateApplicationInput({ event_id: 'e1', student_count: 3, leader_count: 1 })
  assert.equal(r.ok, false)
})

test('참여 인원 합계가 0이면 거부', () => {
  const r = validateApplicationInput({ event_id: 'e1', event_date_id: 'd1', student_count: 0, leader_count: 0 })
  assert.equal(r.ok, false)
})

test('음수 인원은 거부', () => {
  const r = validateApplicationInput({ event_id: 'e1', event_date_id: 'd1', student_count: -1, leader_count: 2 })
  assert.equal(r.ok, false)
})

test('정상 입력은 정규화되어 통과', () => {
  const r = validateApplicationInput({ event_id: 'e1', event_date_id: 'd1', student_count: 20, leader_count: 3 })
  assert.equal(r.ok, true)
  if (r.ok) {
    assert.equal(r.value.student_count, 20)
    assert.equal(r.value.leader_count, 3)
  }
})

test('computeTotalCount 합산', () => {
  assert.equal(computeTotalCount(20, 3), 23)
})

test('applied 상태만 취소 가능', () => {
  assert.equal(canCancelApplication('applied'), true)
  assert.equal(canCancelApplication('selected'), false)
  assert.equal(canCancelApplication('rejected'), false)
  assert.equal(canCancelApplication('cancelled'), false)
})
