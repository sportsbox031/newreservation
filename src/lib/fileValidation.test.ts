import test from 'node:test'
import assert from 'node:assert/strict'

import { sanitizeFileName, validateFileMetadata } from './fileValidation.ts'

test('sanitizeFileName returns an ASCII-safe filename for storage keys', () => {
  const sanitized = sanitizeFileName('AI_POT_1급_생성형_AI_사용가이드_(1).pdf')

  assert.equal(sanitized, 'AI_POT_1_AI_1.pdf')
  assert.match(sanitized, /^[A-Za-z0-9._-]+$/)
})

test('sanitizeFileName preserves the extension and falls back when the base becomes empty', () => {
  const sanitized = sanitizeFileName('한글파일.pdf')

  assert.equal(sanitized, 'file.pdf')
})

test('validateFileMetadata accepts HWP with a common MIME type', () => {
  const result = validateFileMetadata('공지사항.hwp', 1024, 'application/x-hwp')

  assert.equal(result.valid, true)
})

test('validateFileMetadata accepts HWPX when the browser reports octet-stream', () => {
  const result = validateFileMetadata('공지사항.hwpx', 1024, 'application/octet-stream')

  assert.equal(result.valid, true)
})

test('validateFileMetadata accepts HWPX when the browser reports haansofthwp MIME type', () => {
  const result = validateFileMetadata('공지사항.hwpx', 1024, 'application/haansofthwp')

  assert.equal(result.valid, true)
})

test('validateFileMetadata accepts HWPX saved by Hangul 2018/2022 (application/hwp+zip)', () => {
  const result = validateFileMetadata('공지사항.hwpx', 1024, 'application/hwp+zip')

  assert.equal(result.valid, true)
})

test('validateFileMetadata accepts HWPX when the browser reports an empty MIME type', () => {
  const result = validateFileMetadata('공지사항.hwpx', 1024, '')

  assert.equal(result.valid, true)
})

test('validateFileMetadata rejects a disallowed extension', () => {
  const result = validateFileMetadata('malware.exe', 1024, 'application/octet-stream')

  assert.equal(result.valid, false)
})

test('validateFileMetadata rejects a MIME/extension mismatch for strict types', () => {
  const result = validateFileMetadata('image.png', 1024, 'application/pdf')

  assert.equal(result.valid, false)
})
