import test from 'node:test'
import assert from 'node:assert/strict'

import { validateManualRecordInput, type ManualRecordInput } from './performanceInput.ts'

function input(p: Partial<ManualRecordInput>): ManualRecordInput {
  return {
    date: '2026-08-01', organization_name: '가나초', program_type: 'sports_class',
    user_id: 'u1', phone: null, region_id: 1, city_id: 10, grade: null,
    participant_count: 20, memo: null, ...p,
  }
}

test('날짜 또는 단체명이 비면 오류', () => {
  assert.ok(validateManualRecordInput(input({ date: '' })))
  assert.ok(validateManualRecordInput(input({ organization_name: '' })))
})

test('스포츠교실은 user_id(회원) 필수', () => {
  assert.equal(validateManualRecordInput(input({ program_type: 'sports_class', user_id: 'u1' })), null)
  assert.ok(validateManualRecordInput(input({ program_type: 'sports_class', user_id: null })))
})

test('스포츠이벤트도 user_id(회원) 필수', () => {
  assert.equal(validateManualRecordInput(input({ program_type: 'sports_event', user_id: 'u1' })), null)
  assert.ok(validateManualRecordInput(input({ program_type: 'sports_event', user_id: null })))
})

test('스포츠체험존은 회원이 아니어도 허용(user_id 없어도 통과)', () => {
  assert.equal(
    validateManualRecordInput(input({ program_type: 'experience_zone', user_id: null, organization_name: '자유단체' })),
    null
  )
})
