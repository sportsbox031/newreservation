import test from 'node:test'
import assert from 'node:assert/strict'

import { validateEventInput } from './eventAdminHelpers.ts'

test('제목이 없으면 거부', () => {
  const r = validateEventInput({ title: '  ', dates: [{ event_date: '2026-09-01' }] })
  assert.equal(r.ok, false)
})

test('일정 날짜가 하나도 없으면 거부', () => {
  const r = validateEventInput({ title: '가을 스포츠', dates: [] })
  assert.equal(r.ok, false)
})

test('정상 입력은 정규화되어 통과', () => {
  const r = validateEventInput({
    title: '  가을 스포츠  ',
    description: '<p>hi</p>',
    content_type: 'html',
    video_url: '',
    dates: [{ event_date: '2026-09-02', label: '오전' }, { event_date: '2026-09-01' }],
  })
  assert.equal(r.ok, true)
  if (r.ok) {
    assert.equal(r.value.title, '가을 스포츠')
    assert.equal(r.value.video_url, null)
    assert.equal(r.value.dates.length, 2)
  }
})

test('잘못된 날짜 형식은 거부', () => {
  const r = validateEventInput({ title: 'x', dates: [{ event_date: '2026/09/01' }] })
  assert.equal(r.ok, false)
})

test('스케줄 미지정 시 null로 정규화', () => {
  const r = validateEventInput({ title: 'x', dates: [{ event_date: '2026-09-01' }] })
  assert.equal(r.ok, true)
  if (r.ok) {
    assert.equal(r.value.reservation_start_at, null)
    assert.equal(r.value.reservation_end_at, null)
  }
})

test('스케줄 시작/종역 ISO는 그대로 통과', () => {
  const r = validateEventInput({
    title: 'x', dates: [{ event_date: '2026-09-01' }],
    reservation_start_at: '2026-08-01T00:00:00.000Z',
    reservation_end_at: '2026-08-31T23:59:00.000Z',
  })
  assert.equal(r.ok, true)
  if (r.ok) assert.equal(r.value.reservation_start_at, '2026-08-01T00:00:00.000Z')
})

test('종료가 시작보다 앞서면 거부', () => {
  const r = validateEventInput({
    title: 'x', dates: [{ event_date: '2026-09-01' }],
    reservation_start_at: '2026-08-31T00:00:00.000Z',
    reservation_end_at: '2026-08-01T00:00:00.000Z',
  })
  assert.equal(r.ok, false)
})

test('잘못된 스케줄 형식은 거부', () => {
  const r = validateEventInput({
    title: 'x', dates: [{ event_date: '2026-09-01' }],
    reservation_start_at: 'not-a-date',
  })
  assert.equal(r.ok, false)
})
