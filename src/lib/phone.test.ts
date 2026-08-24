import { test } from 'node:test'
import assert from 'node:assert/strict'

import { formatPhoneNumber, phoneDigits } from './phone.ts'

test('11자리 번호를 3-4-4 하이픈 형식으로 변환', () => {
  assert.equal(formatPhoneNumber('01012345678'), '010-1234-5678')
})

test('이미 하이픈이 있어도 동일한 형식으로 정규화(idempotent)', () => {
  assert.equal(formatPhoneNumber('010-1234-5678'), '010-1234-5678')
})

test('공백/점 등 구분자를 제거하고 변환', () => {
  assert.equal(formatPhoneNumber('010 1234.5678'), '010-1234-5678')
})

test('10자리 번호를 3-3-4 형식으로 변환', () => {
  assert.equal(formatPhoneNumber('0101234567'), '010-123-4567')
})

test('형식에 맞지 않는 길이는 원본을 유지', () => {
  assert.equal(formatPhoneNumber('12345'), '12345')
})

test('null/undefined는 빈 문자열로 처리', () => {
  assert.equal(formatPhoneNumber(null), '')
  assert.equal(formatPhoneNumber(undefined), '')
})

test('phoneDigits는 숫자만 남긴다', () => {
  assert.equal(phoneDigits('010-1234-5678'), '01012345678')
  assert.equal(phoneDigits(''), '')
  assert.equal(phoneDigits(null), '')
})
