import test from 'node:test'
import assert from 'node:assert/strict'

import { buildCalendarEvent } from './calendarEvent.ts'

test('단일 슬롯 예약을 이벤트로 변환 (KST)', () => {
  const event = buildCalendarEvent({
    organizationName: '테스트초등학교',
    date: '2026-07-15',
    slots: [
      { startTime: '10:00', endTime: '11:40', grade: '3학년', participantCount: 25, location: '운동장' },
    ],
    staffNames: ['박인규', '박광민'],
  })

  assert.ok(event)
  assert.equal(event.summary, '테스트초등학교 (담당: 박인규, 박광민)')
  assert.equal(event.location, '운동장')
  assert.equal(event.start.dateTime, '2026-07-15T10:00:00')
  assert.equal(event.end.dateTime, '2026-07-15T11:40:00')
  assert.equal(event.start.timeZone, 'Asia/Seoul')
  assert.equal(event.end.timeZone, 'Asia/Seoul')
  assert.ok(event.description.includes('단체명: 테스트초등학교'))
  assert.ok(event.description.includes('10:00~11:40 · 3학년 · 25명 · 운동장'))
  assert.ok(event.description.includes('담당자: 박인규, 박광민'))
})

test('슬롯 2개면 전체 시간 범위로 이벤트 생성, 슬롯별 설명 포함', () => {
  const event = buildCalendarEvent({
    organizationName: '복지관A',
    date: '2026-07-20',
    slots: [
      // 순서가 뒤집혀 있어도 시작 시간 순으로 정렬
      { startTime: '13:00', endTime: '14:40', grade: '5학년', participantCount: 20, location: '체육관' },
      { startTime: '09:00', endTime: '10:40', grade: '4학년', participantCount: 22, location: '운동장' },
    ],
    staffNames: ['조호석'],
  })

  assert.ok(event)
  assert.equal(event.start.dateTime, '2026-07-20T09:00:00')
  assert.equal(event.end.dateTime, '2026-07-20T14:40:00')
  assert.equal(event.location, '운동장') // 첫 슬롯 기준
  assert.ok(event.description.includes('1타임 09:00~10:40 · 4학년 · 22명 · 운동장'))
  assert.ok(event.description.includes('2타임 13:00~14:40 · 5학년 · 20명 · 체육관'))
})

test('담당자가 없으면 미지정으로 표기', () => {
  const event = buildCalendarEvent({
    organizationName: '테스트단체',
    date: '2026-07-15',
    slots: [
      { startTime: '10:00', endTime: '11:00', grade: '1학년', participantCount: 10, location: '강당' },
    ],
    staffNames: [],
  })

  assert.ok(event)
  assert.equal(event.summary, '테스트단체 (담당: 미지정)')
  assert.ok(event.description.includes('담당자: 미지정'))
})

test('슬롯이 없거나 형식이 잘못되면 null', () => {
  assert.equal(buildCalendarEvent({
    organizationName: '테스트',
    date: '2026-07-15',
    slots: [],
    staffNames: ['박인규'],
  }), null)

  assert.equal(buildCalendarEvent({
    organizationName: '테스트',
    date: 'invalid-date',
    slots: [
      { startTime: '10:00', endTime: '11:00', grade: '1학년', participantCount: 10, location: '강당' },
    ],
    staffNames: [],
  }), null)

  assert.equal(buildCalendarEvent({
    organizationName: '테스트',
    date: '2026-07-15',
    slots: [
      { startTime: 'bad', endTime: '11:00', grade: '1학년', participantCount: 10, location: '강당' },
    ],
    staffNames: [],
  }), null)
})
