import test from 'node:test'
import assert from 'node:assert/strict'

import {
  combineGrades,
  applyOverride,
  normalizeSportsClassRow,
  normalizeSportsEventRow,
  normalizeExperienceRow,
  overrideKey,
} from './performanceRecords.ts'
import type { OverrideRow, PerformanceRecord } from './performanceTypes.ts'

test('combineGrades: 중복/공백 제거 후 결합, 없으면 null', () => {
  assert.equal(combineGrades(['3학년', '3학년', ' ', null, '5학년']), '3학년, 5학년')
  assert.equal(combineGrades([null, '', undefined]), null)
})

test('normalizeSportsClassRow: 슬롯 participant 합산 + grade 결합', () => {
  const row = {
    id: 'r1', date: '2026-05-10', region_id: 1,
    users: { organization_name: '가나초', cities: { name: '수원시', regions: { code: 'south' } } },
    reservation_slots: [
      { grade: '3학년', participant_count: 18 },
      { grade: '4학년', participant_count: 12 },
    ],
  }
  const rec = normalizeSportsClassRow(row as any, null)!
  assert.equal(rec.program_type, 'sports_class')
  assert.equal(rec.participant_count, 30)
  assert.equal(rec.grade, '3학년, 4학년')
  assert.equal(rec.organization_name, '가나초')
  assert.equal(rec.city_name, '수원시')
  assert.equal(rec.region_code, 'south')
  assert.equal(rec.id, 'sports_class:r1')
})

test('applyOverride: participant/grade/memo 대체, excluded면 null', () => {
  const base: PerformanceRecord = {
    id: 'sports_class:r1', program_type: 'sports_class', date: '2026-05-10',
    organization_name: '가나초', city_name: '수원시', region_id: 1, region_code: 'south',
    grade: '3학년', participant_count: 30, memo: null, source_type: 'sports_class', source_id: 'r1',
  }
  const ov: OverrideRow = {
    source_type: 'sports_class', source_id: 'r1', grade: '3,4학년',
    participant_count: 28, memo: '킥볼', excluded: false,
  }
  const merged = applyOverride(base, ov)!
  assert.equal(merged.participant_count, 28)
  assert.equal(merged.grade, '3,4학년')
  assert.equal(merged.memo, '킥볼')
  assert.equal(applyOverride(base, { ...ov, excluded: true }), null)
  // participant_count null이면 원본 유지
  assert.equal(applyOverride(base, { ...ov, participant_count: null })!.participant_count, 30)
  // participant_count 0은 명시적 override로 존중 (absent 취급 금지)
  assert.equal(applyOverride(base, { ...ov, participant_count: 0 })!.participant_count, 0)
  // override row가 있으면 memo는 항상 override 값 사용 (null이면 memo-clear)
  assert.equal(applyOverride(base, { ...ov, memo: null })!.memo, null)
})

test('normalizeSportsEventRow: total_count 사용, grade는 null', () => {
  const row = {
    id: 'a1', total_count: 40, applicant_org_name: '다라복지관', region_id: 2,
    event_dates: { event_date: '2026-06-01' },
    regions: { code: 'north' },
  }
  const rec = normalizeSportsEventRow(row as any, null)!
  assert.equal(rec.program_type, 'sports_event')
  assert.equal(rec.date, '2026-06-01')
  assert.equal(rec.participant_count, 40)
  assert.equal(rec.grade, null)
  assert.equal(rec.region_code, 'north')
})

test('normalizeExperienceRow: 입력값 그대로', () => {
  const row = {
    id: 'e1', date: '2026-07-01', organization_name: '체험단', region_id: 1,
    grade: null, participant_count: 55, memo: '축구',
    regions: { code: 'south' }, cities: { name: '성남시' },
  }
  const rec = normalizeExperienceRow(row as any)
  assert.equal(rec.program_type, 'experience_zone')
  assert.equal(rec.participant_count, 55)
  assert.equal(rec.memo, '축구')
  assert.equal(rec.city_name, '성남시')
})

test('overrideKey', () => {
  assert.equal(overrideKey('sports_class', 'r1'), 'sports_class:r1')
})
