import test from 'node:test'
import assert from 'node:assert/strict'

import { validateEventInput } from './eventAdminHelpers.ts'

test('제목이 없으면 거부', () => {
  const r = validateEventInput({ title: '  ', target_type: 'all', dates: [{ event_date: '2026-09-01' }] })
  assert.equal(r.ok, false)
})

test('일정 날짜가 하나도 없으면 거부', () => {
  const r = validateEventInput({ title: '가을 스포츠', target_type: 'all', dates: [] })
  assert.equal(r.ok, false)
})

test("target_type='region'인데 지역이 없으면 거부", () => {
  const r = validateEventInput({ title: 'x', target_type: 'region', target_region_code: null, dates: [{ event_date: '2026-09-01' }] })
  assert.equal(r.ok, false)
})

test('정상 입력은 정규화되어 통과', () => {
  const r = validateEventInput({
    title: '  가을 스포츠  ',
    description: '<p>hi</p>',
    content_type: 'html',
    video_url: '',
    target_type: 'region',
    target_region_code: 'south',
    dates: [{ event_date: '2026-09-02', label: '오전' }, { event_date: '2026-09-01' }],
  })
  assert.equal(r.ok, true)
  if (r.ok) {
    assert.equal(r.value.title, '가을 스포츠')
    assert.equal(r.value.video_url, null)
    assert.equal(r.value.target_region_code, 'south')
    assert.equal(r.value.dates.length, 2)
  }
})

test('잘못된 날짜 형식은 거부', () => {
  const r = validateEventInput({ title: 'x', target_type: 'all', dates: [{ event_date: '2026/09/01' }] })
  assert.equal(r.ok, false)
})
