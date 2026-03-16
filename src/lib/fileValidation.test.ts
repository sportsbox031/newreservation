import test from 'node:test'
import assert from 'node:assert/strict'

import { sanitizeFileName } from './fileValidation.ts'

test('sanitizeFileName returns an ASCII-safe filename for storage keys', () => {
  const sanitized = sanitizeFileName('AI_POT_1급_생성형_AI_사용가이드_(1).pdf')

  assert.equal(sanitized, 'AI_POT_1_AI_1.pdf')
  assert.match(sanitized, /^[A-Za-z0-9._-]+$/)
})

test('sanitizeFileName preserves the extension and falls back when the base becomes empty', () => {
  const sanitized = sanitizeFileName('한글파일.pdf')

  assert.equal(sanitized, 'file.pdf')
})
