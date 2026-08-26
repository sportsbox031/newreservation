import test from 'node:test'
import assert from 'node:assert/strict'

import { aggregatePerformance } from './performanceAggregate.ts'
import type { PerformanceRecord } from './performanceTypes.ts'

function rec(p: Partial<PerformanceRecord>): PerformanceRecord {
  return {
    id: 'x', program_type: 'sports_class', date: '2026-05-10',
    organization_name: 'o', phone: null, city_name: null, region_id: 1, region_code: 'south',
    grade: null, participant_count: 10, memo: null,
    source_type: 'sports_class', source_id: 'x', ...p,
  }
}

test('aggregatePerformance: 프로그램별 회/명 + 총계 + 월별', () => {
  const records = [
    rec({ program_type: 'sports_class', date: '2026-05-01', participant_count: 30 }),
    rec({ program_type: 'sports_class', date: '2026-05-20', participant_count: 20 }),
    rec({ program_type: 'sports_event', date: '2026-06-01', participant_count: 40 }),
    rec({ program_type: 'experience_zone', date: '2026-08-01', participant_count: 15 }),
  ]
  const s = aggregatePerformance(records, 2026)
  assert.equal(s.totalCount, 4)
  assert.equal(s.totalParticipants, 105)
  assert.deepEqual(s.byProgram.sports_class, { count: 2, participants: 50 })
  assert.deepEqual(s.byProgram.sports_event, { count: 1, participants: 40 })
  assert.deepEqual(s.byProgram.experience_zone, { count: 1, participants: 15 })
  assert.equal(s.monthly[4], 50) // 5월(index 4)
  assert.equal(s.monthly[5], 40) // 6월
  assert.equal(s.monthly[7], 15) // 8월
})

test('aggregatePerformance: year 필터가 월별 시리즈를 제한', () => {
  const records = [
    rec({ date: '2025-05-01', participant_count: 100 }),
    rec({ date: '2026-05-01', participant_count: 30 }),
  ]
  const s = aggregatePerformance(records, 2026)
  assert.equal(s.monthly[4], 30)
})

test('aggregatePerformance: 빈 배열', () => {
  const s = aggregatePerformance([], 2026)
  assert.equal(s.totalCount, 0)
  assert.equal(s.totalParticipants, 0)
  assert.equal(s.monthly.length, 12)
  assert.equal(s.monthly.reduce((a, b) => a + b, 0), 0)
})
