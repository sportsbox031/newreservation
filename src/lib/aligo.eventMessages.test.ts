import test from 'node:test'
import assert from 'node:assert/strict'

import {
  sendEventApplicationNotification,
  sendEventCancellationNotification,
  sendEventSelectionNotification,
  sendEventRejectionNotification,
} from './aligo.ts'

// global fetch를 가로채 프록시로 전송되는 message 본문을 캡처한다(실제 발송 없음).
function withCapturedMessage(fn: () => Promise<unknown>): Promise<{ message: string; subject: string; receiver: string; tplCode: string }> {
  const original = globalThis.fetch
  let captured: { message: string; subject: string; receiver: string; tplCode: string } | null = null
  globalThis.fetch = (async (_url: string, init?: { body?: string }) => {
    captured = JSON.parse(init?.body || '{}')
    return { json: async () => ({ success: true }) }
  }) as unknown as typeof fetch
  return fn().then(() => {
    globalThis.fetch = original
    if (!captured) throw new Error('no fetch captured')
    return captured
  }).catch((e) => { globalThis.fetch = original; throw e })
}

test('신청 알림: 변수 치환 + 서류 제출 안내 포함', async () => {
  const c = await withCapturedMessage(() =>
    sendEventApplicationNotification('01012345678', '행복학교', '가을 스포츠데이', '2026-10-05', 'TPL')
  )
  assert.equal(c.receiver, '01012345678')
  assert.equal(c.tplCode, 'TPL')
  assert.match(c.message, /행복학교/)
  assert.match(c.message, /가을 스포츠데이/)
  assert.match(c.message, /2026-10-05/)
  assert.match(c.message, /내 신청내역/)
  assert.match(c.message, /서류/)
  assert.doesNotMatch(c.message, /#\{/) // 미치환 변수가 남지 않아야 함
})

test('취소 알림: 이벤트명/단체명 치환', async () => {
  const c = await withCapturedMessage(() =>
    sendEventCancellationNotification('01000000000', '행복학교', '가을 스포츠데이', 'TPL')
  )
  assert.match(c.message, /취소/)
  assert.match(c.message, /행복학교/)
  assert.doesNotMatch(c.message, /#\{/)
})

test('선정 알림: 축하 + 서류 제출 안내', async () => {
  const c = await withCapturedMessage(() =>
    sendEventSelectionNotification('01000000000', '행복학교', '가을 스포츠데이', 'TPL')
  )
  assert.match(c.message, /선정/)
  assert.match(c.message, /내 신청내역/)
  assert.doesNotMatch(c.message, /#\{/)
})

test('미선정 알림: 온화한 표현(‘탈락’ 미사용) + 감사 인사', async () => {
  const c = await withCapturedMessage(() =>
    sendEventRejectionNotification('01000000000', '행복학교', '가을 스포츠데이', 'TPL')
  )
  assert.doesNotMatch(c.message, /탈락/) // 강한 표현 금지
  assert.match(c.message, /감사/)
  assert.match(c.message, /아쉽/)
  assert.match(c.message, /행복학교/)
  assert.doesNotMatch(c.message, /#\{/)
})
