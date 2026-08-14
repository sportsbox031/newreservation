import test from 'node:test'
import assert from 'node:assert/strict'

import { canSubmit, isValidSelectionStatus } from './eventSubmissionHelpers.ts'

test('취소가 아니면 제출 가능', () => {
  assert.equal(canSubmit('applied'), true)
  assert.equal(canSubmit('selected'), true)
  assert.equal(canSubmit('rejected'), true)
  assert.equal(canSubmit('cancelled'), false)
})

test('선정 상태 유효값', () => {
  assert.equal(isValidSelectionStatus('applied'), true)
  assert.equal(isValidSelectionStatus('selected'), true)
  assert.equal(isValidSelectionStatus('rejected'), true)
  assert.equal(isValidSelectionStatus('cancelled'), false)
  assert.equal(isValidSelectionStatus('unknown'), false)
})
