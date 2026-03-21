import test from 'node:test'
import assert from 'node:assert/strict'

import { getAnnouncementAuthorName } from './announcementAuthors.ts'

test('getAnnouncementAuthorName returns the joined admin username when present', () => {
  assert.equal(
    getAnnouncementAuthorName({ admins: { username: 'admin' } }),
    'admin'
  )
})

test('getAnnouncementAuthorName falls back to a safe label when the join is null', () => {
  assert.equal(
    getAnnouncementAuthorName({ admins: null }),
    '관리자'
  )
})
