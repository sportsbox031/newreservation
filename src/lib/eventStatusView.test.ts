import test from 'node:test'
import assert from 'node:assert/strict'

import { eventStatusView } from './eventStatusView.ts'

test('상태별 라벨/색상', () => {
  assert.deepEqual(eventStatusView('applied'), { label: '신청', variant: 'blue' })
  assert.deepEqual(eventStatusView('selected'), { label: '선정', variant: 'green' })
  assert.deepEqual(eventStatusView('rejected'), { label: '탈락', variant: 'red' })
  assert.deepEqual(eventStatusView('cancelled'), { label: '취소', variant: 'neutral' })
})

test('알 수 없는 상태는 원문 + neutral', () => {
  assert.deepEqual(eventStatusView('weird'), { label: 'weird', variant: 'neutral' })
})
