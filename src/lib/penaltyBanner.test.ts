import { test } from 'node:test'
import assert from 'node:assert/strict'

import { getPenaltyBanner } from './penaltyBanner.ts'

test('경고 없음 → 양호(ok)', () => {
  const b = getPenaltyBanner({ restricted: false, resumeMonth: null, warningCount: 0, warningThreshold: 2 })
  assert.equal(b.level, 'ok')
  assert.equal(b.title, '양호')
  assert.match(b.detail, /경고 0\/2회/)
})

test('경고 1회 → warning, 임계치 표기', () => {
  const b = getPenaltyBanner({ restricted: false, resumeMonth: null, warningCount: 1, warningThreshold: 2 })
  assert.equal(b.level, 'warning')
  assert.equal(b.title, '경고 1/2회')
  assert.match(b.detail, /2회 누적 시 이용이 제한/)
})

test('제한 중 → restricted, 재개월 안내', () => {
  const b = getPenaltyBanner({ restricted: true, resumeMonth: '2026-09', warningCount: 0, warningThreshold: 1 })
  assert.equal(b.level, 'restricted')
  assert.equal(b.title, '이용 제한 중')
  assert.match(b.detail, /9월부터/)
})

test('제한 중이나 재개월 없음 → 기본 문구', () => {
  const b = getPenaltyBanner({ restricted: true, resumeMonth: null, warningCount: 0, warningThreshold: 2 })
  assert.equal(b.level, 'restricted')
  assert.match(b.detail, /다음 달부터/)
})

test('보호관찰 상황(임계치 1) → 문구에 1회로 표기, 보호관찰 단어 없음', () => {
  const b = getPenaltyBanner({ restricted: false, resumeMonth: null, warningCount: 0, warningThreshold: 1 })
  assert.equal(b.level, 'ok')
  assert.match(b.detail, /0\/1회/)
  assert.doesNotMatch(b.detail, /보호관찰/)
})

test('임계치 0 방어 → 기본 2로 처리', () => {
  const b = getPenaltyBanner({ restricted: false, resumeMonth: null, warningCount: 1, warningThreshold: 0 })
  assert.equal(b.title, '경고 1/2회')
})
