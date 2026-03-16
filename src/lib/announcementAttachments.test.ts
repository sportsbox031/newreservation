import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getRemovedExistingAttachments,
  type PersistedAttachment,
} from './announcementAttachments.ts'

test('getRemovedExistingAttachments returns persisted attachments removed during edit', () => {
  const original: PersistedAttachment[] = [
    { id: 'a1', storage_path: 'announcements/1/a.pdf' },
    { id: 'a2', storage_path: 'announcements/1/b.pdf' },
  ]

  const current = [
    { id: 'a2', storage_path: 'announcements/1/b.pdf' },
    { file_name: 'new.pdf', file_size: 1, file_type: 'application/pdf' },
  ]

  assert.deepEqual(getRemovedExistingAttachments(original, current), [
    { id: 'a1', storage_path: 'announcements/1/a.pdf' },
  ])
})

test('getRemovedExistingAttachments returns all original files when current list is empty', () => {
  const original: PersistedAttachment[] = [
    { id: 'a1', storage_path: 'announcements/1/a.pdf' },
  ]

  assert.deepEqual(getRemovedExistingAttachments(original, []), original)
})
