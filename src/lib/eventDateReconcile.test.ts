import test from 'node:test'
import assert from 'node:assert/strict'

import { reconcileEventDates } from './eventDateReconcile.ts'

test('빈 기존 → 전부 삽입', () => {
  const r = reconcileEventDates([], [
    { event_date: '2026-12-01', label: '1일차', sort_order: 0 },
    { event_date: '2026-12-02', label: null, sort_order: 1 },
  ])
  assert.equal(r.toInsert.length, 2)
  assert.equal(r.toUpdate.length, 0)
  assert.equal(r.toDeleteIds.length, 0)
})

test('변경 없음 → 아무 작업 없음 (참조 보존)', () => {
  const existing = [{ id: 'a', event_date: '2026-12-01', label: '1일차', sort_order: 0 }]
  const r = reconcileEventDates(existing, [{ event_date: '2026-12-01', label: '1일차', sort_order: 0 }])
  assert.deepEqual(r, { toInsert: [], toUpdate: [], toDeleteIds: [] })
})

test('같은 날짜의 label/sort_order 변경 → update (id 유지, 삭제 안 함)', () => {
  const existing = [{ id: 'a', event_date: '2026-12-01', label: '1일차', sort_order: 0 }]
  const r = reconcileEventDates(existing, [{ event_date: '2026-12-01', label: '오전반', sort_order: 3 }])
  assert.equal(r.toInsert.length, 0)
  assert.deepEqual(r.toUpdate, [{ id: 'a', label: '오전반', sort_order: 3 }])
  assert.equal(r.toDeleteIds.length, 0)
})

test('날짜 추가 → 기존은 보존, 신규만 삽입', () => {
  const existing = [{ id: 'a', event_date: '2026-12-01', label: null, sort_order: 0 }]
  const r = reconcileEventDates(existing, [
    { event_date: '2026-12-01', label: null, sort_order: 0 },
    { event_date: '2026-12-05', label: null, sort_order: 1 },
  ])
  assert.equal(r.toInsert.length, 1)
  assert.equal(r.toInsert[0].event_date, '2026-12-05')
  assert.equal(r.toUpdate.length, 0)
  assert.equal(r.toDeleteIds.length, 0)
})

test('날짜 제거 → 해당 기존 행만 삭제 대상', () => {
  const existing = [
    { id: 'a', event_date: '2026-12-01', label: null, sort_order: 0 },
    { id: 'b', event_date: '2026-12-02', label: null, sort_order: 1 },
  ]
  const r = reconcileEventDates(existing, [{ event_date: '2026-12-01', label: null, sort_order: 0 }])
  assert.deepEqual(r.toDeleteIds, ['b'])
  assert.equal(r.toInsert.length, 0)
  assert.equal(r.toUpdate.length, 0)
})

test('교체(날짜 다름) → 옛 행 삭제 + 새 행 삽입', () => {
  const existing = [{ id: 'a', event_date: '2026-12-01', label: null, sort_order: 0 }]
  const r = reconcileEventDates(existing, [{ event_date: '2026-12-09', label: null, sort_order: 0 }])
  assert.deepEqual(r.toDeleteIds, ['a'])
  assert.equal(r.toInsert.length, 1)
  assert.equal(r.toInsert[0].event_date, '2026-12-09')
})

test('중복 날짜 기존 행 → 하나만 매칭, 나머지 삭제', () => {
  const existing = [
    { id: 'a', event_date: '2026-12-01', label: null, sort_order: 0 },
    { id: 'b', event_date: '2026-12-01', label: null, sort_order: 1 },
  ]
  const r = reconcileEventDates(existing, [{ event_date: '2026-12-01', label: null, sort_order: 0 }])
  assert.deepEqual(r.toDeleteIds, ['b'])
  assert.equal(r.toInsert.length, 0)
})
