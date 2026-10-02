import test from 'node:test'
import assert from 'node:assert/strict'

import {
  formatSlotGrades,
  formatSlotLocations,
  formatSlotTimeRange,
  formatReservationCell,
} from './reservationExcelFormat.ts'

test('formatSlotGrades: 1개 학년은 그대로 표기', () => {
  assert.equal(formatSlotGrades([{ grade: '3학년' }]), '3학년')
})

test('formatSlotGrades: 2개 학년은 숫자만 콤마로 묶어 표기', () => {
  assert.equal(
    formatSlotGrades([{ grade: '3학년' }, { grade: '4학년' }]),
    '3,4학년'
  )
})

test('formatSlotGrades: 같은 학년 중복은 한 번만 표기', () => {
  assert.equal(formatSlotGrades([{ grade: '3학년' }, { grade: '3학년' }]), '3학년')
})

test('formatSlotGrades: 학년 숫자는 오름차순 정렬', () => {
  assert.equal(
    formatSlotGrades([{ grade: '5학년' }, { grade: '2학년' }]),
    '2,5학년'
  )
})

test('formatSlotGrades: 기타는 기타로 표기', () => {
  assert.equal(formatSlotGrades([{ grade: '기타' }]), '기타')
})

test('formatSlotGrades: 숫자 학년과 기타가 섞이면 함께 표기', () => {
  assert.equal(
    formatSlotGrades([{ grade: '3학년' }, { grade: '기타' }]),
    '3학년, 기타'
  )
})

test('formatSlotGrades: 빈 값은 무시', () => {
  assert.equal(formatSlotGrades([{ grade: '' }, { grade: null }]), '')
})

test('formatSlotLocations: 장소 중복 제거 후 콤마 연결', () => {
  assert.equal(
    formatSlotLocations([{ location: '체육관' }, { location: '운동장' }]),
    '체육관, 운동장'
  )
  assert.equal(
    formatSlotLocations([{ location: '체육관' }, { location: '체육관' }]),
    '체육관'
  )
})

test('formatSlotTimeRange: 첫 시작 ~ 마지막 종료', () => {
  assert.equal(
    formatSlotTimeRange([
      { startTime: '09:50', endTime: '10:40' },
      { startTime: '10:50', endTime: '11:40' },
    ]),
    '09:50~11:40'
  )
})

test('formatReservationCell: 단체명 / (학년 / 장소) / 시간 순으로 줄바꿈 결합', () => {
  const cell = formatReservationCell('테스트단체', [
    { startTime: '09:50', endTime: '10:40', grade: '3학년', location: '체육관' },
    { startTime: '10:50', endTime: '11:40', grade: '4학년', location: '체육관' },
  ])
  assert.equal(cell, '테스트단체\n3,4학년 / 체육관\n09:50~11:40')
})

test('formatReservationCell: 학년만 있으면 학년만 표기', () => {
  const cell = formatReservationCell('테스트단체', [
    { startTime: '09:50', endTime: '10:40', grade: '3학년', location: '' },
  ])
  assert.equal(cell, '테스트단체\n3학년\n09:50~10:40')
})

test('formatReservationCell: 장소만 있으면 장소만 표기', () => {
  const cell = formatReservationCell('테스트단체', [
    { startTime: '09:50', endTime: '10:40', grade: '', location: '운동장' },
  ])
  assert.equal(cell, '테스트단체\n운동장\n09:50~10:40')
})

test('formatReservationCell: 슬롯이 없으면 단체명만', () => {
  assert.equal(formatReservationCell('테스트단체', []), '테스트단체')
})
