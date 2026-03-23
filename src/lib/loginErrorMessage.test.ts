import test from 'node:test'
import assert from 'node:assert/strict'

import { mapLoginErrorMessage } from './loginErrorMessage.ts'

test('maps missing organization errors to a clear message', () => {
  assert.equal(
    mapLoginErrorMessage({ code: 'PGRST116' }, 'user'),
    '등록되지 않은 단체명입니다.'
  )
})

test('preserves wrong password messages from the server', () => {
  assert.equal(
    mapLoginErrorMessage({ message: '비밀번호가 일치하지 않습니다.' }, 'user'),
    '비밀번호가 일치하지 않습니다.'
  )
})

test('preserves account state messages from the server', () => {
  assert.equal(
    mapLoginErrorMessage({ message: '회원가입 승인 대기중입니다. 관리자 승인 후 로그인하실 수 있습니다.' }, 'user'),
    '회원가입 승인 대기중입니다. 관리자 승인 후 로그인하실 수 있습니다.'
  )
})

test('falls back to a safe generic user login message for unknown errors', () => {
  assert.equal(
    mapLoginErrorMessage({ message: 'unexpected postgres error' }, 'user'),
    '로그인 중 오류가 발생했습니다. 다시 시도해주세요.'
  )
})

test('maps missing admin account errors to a clear message', () => {
  assert.equal(
    mapLoginErrorMessage({ message: '등록되지 않은 관리자 계정입니다.' }, 'admin'),
    '등록되지 않은 관리자 계정입니다.'
  )
})
