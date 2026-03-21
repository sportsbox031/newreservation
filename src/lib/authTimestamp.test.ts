import test from 'node:test'
import assert from 'node:assert/strict'

import { parseDatabaseTimestamp } from './authTimestamp.ts'

test('parseDatabaseTimestamp treats timezone-less values as UTC', () => {
  const parsed = parseDatabaseTimestamp('2026-03-21T20:51:23.236')

  assert.equal(parsed.toISOString(), '2026-03-21T20:51:23.236Z')
})

test('parseDatabaseTimestamp preserves explicit timezone offsets', () => {
  const parsed = parseDatabaseTimestamp('2026-03-21T20:51:23.236+09:00')

  assert.equal(parsed.toISOString(), '2026-03-21T11:51:23.236Z')
})
