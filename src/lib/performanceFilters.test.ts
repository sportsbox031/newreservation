import test from 'node:test'
import assert from 'node:assert/strict'

import {
  parsePerformanceFilters,
  applyRecordFilters,
  sortByDateDesc,
  paginate,
} from './performanceFilters.ts'
import type { PerformanceRecord } from './performanceTypes.ts'

function rec(partial: Partial<PerformanceRecord>): PerformanceRecord {
  return {
    id: 'sports_class:1', program_type: 'sports_class', date: '2026-05-10',
    organization_name: '테스트초', phone: '010-0000-0000', city_name: '수원시', region_id: 1, region_code: 'south',
    grade: '3학년', participant_count: 30, memo: null,
    source_type: 'sports_class', source_id: '1', ...partial,
  }
}

test('parsePerformanceFilters: super는 요청 region을 유지', () => {
  const params = new URLSearchParams({ year: '2026', region: 'north', program: 'sports_event', page: '2' })
  const { filters, error } = parsePerformanceFilters(params, 'super')
  assert.equal(error, null)
  assert.equal(filters.year, 2026)
  assert.equal(filters.region, 'north')
  assert.equal(filters.program, 'sports_event')
  assert.equal(filters.page, 2)
  assert.equal(filters.pageSize, 30)
})

test('parsePerformanceFilters: 지역관리자는 자기 지역으로 강제', () => {
  const params = new URLSearchParams({ region: 'south' })
  const { filters } = parsePerformanceFilters(params, 'north')
  assert.equal(filters.region, 'north')
})

test('parsePerformanceFilters: 잘못된 program은 all로', () => {
  const { filters } = parsePerformanceFilters(new URLSearchParams({ program: 'bogus' }), 'super')
  assert.equal(filters.program, 'all')
})

test('applyRecordFilters: 기간·프로그램·검색·지역 필터', () => {
  const records = [
    rec({ id: 'a', date: '2026-05-10', region_code: 'south', organization_name: '가나초' }),
    rec({ id: 'b', date: '2026-08-01', region_code: 'north', program_type: 'sports_event', organization_name: '다라초' }),
  ]
  const base: any = { year: 2026, from: null, to: null, region: null, program: 'all', q: '', page: 1, pageSize: 30 }
  assert.equal(applyRecordFilters(records, { ...base, from: '2026-06-01' }).length, 1)
  assert.equal(applyRecordFilters(records, { ...base, program: 'sports_event' }).length, 1)
  assert.equal(applyRecordFilters(records, { ...base, q: '가나' }).length, 1)
  assert.equal(applyRecordFilters(records, { ...base, region: 'north' }).length, 1)
  assert.equal(applyRecordFilters(records, { ...base, year: 2025 }).length, 0)
})

test('sortByDateDesc + paginate', () => {
  const records = [rec({ id: 'a', date: '2026-01-01' }), rec({ id: 'b', date: '2026-09-01' })]
  assert.equal(sortByDateDesc(records)[0].id, 'b')
  const p = paginate([1, 2, 3, 4, 5], 2, 2)
  assert.deepEqual(p.items, [3, 4])
  assert.equal(p.total, 5)
})
