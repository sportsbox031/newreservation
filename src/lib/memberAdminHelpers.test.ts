import test from 'node:test'
import assert from 'node:assert/strict'

import {
  resolveMemberRegionScope,
  canManageRequestedRegion,
  resolveMemberStatusScope,
  filterMembersForDisplay,
  getMemberSummaryCounts,
  sortMembersByCreatedAt,
  getPendingMemberAge,
} from './memberAdminHelpers.ts'

test('resolveMemberRegionScope restricts regional admins to their own region', () => {
  assert.equal(resolveMemberRegionScope('south', null), 'south')
  assert.equal(resolveMemberRegionScope('south', 'north'), 'south')
  assert.equal(resolveMemberRegionScope('north', 'south'), 'north')
})

test('resolveMemberRegionScope lets super admins use the requested region or all regions', () => {
  assert.equal(resolveMemberRegionScope('super', null), null)
  assert.equal(resolveMemberRegionScope('super', 'south'), 'south')
  assert.equal(resolveMemberRegionScope('super', 'north'), 'north')
})

test('canManageRequestedRegion blocks regional admins from crossing regions', () => {
  assert.equal(canManageRequestedRegion('south', 'south'), true)
  assert.equal(canManageRequestedRegion('south', 'north'), false)
  assert.equal(canManageRequestedRegion('north', 'south'), false)
  assert.equal(canManageRequestedRegion('super', 'south'), true)
})

test('resolveMemberStatusScope only allows supported member status filters', () => {
  assert.equal(resolveMemberStatusScope('pending'), 'pending')
  assert.equal(resolveMemberStatusScope('approved'), 'approved')
  assert.equal(resolveMemberStatusScope('all'), null)
  assert.equal(resolveMemberStatusScope(null), null)
})

test('filterMembersForDisplay applies search, region, and status filters together', () => {
  const members = [
    {
      organization_name: '남부학교',
      manager_name: '홍길동',
      email: 'south@example.com',
      phone: '010-1111-1111',
      status: 'pending' as const,
      cities: { regions: { name: '경기남부' } },
    },
    {
      organization_name: '북부복지관',
      manager_name: '임꺽정',
      email: 'north@example.com',
      phone: '010-2222-2222',
      status: 'approved' as const,
      cities: { regions: { name: '경기북부' } },
    },
  ]

  const filtered = filterMembersForDisplay(members, {
    searchTerm: '남부',
    regionFilter: '경기남부',
    statusFilter: 'pending',
  })

  assert.equal(filtered.length, 1)
  assert.equal(filtered[0]?.organization_name, '남부학교')
})

test('getMemberSummaryCounts follows the selected region instead of all members', () => {
  const members = [
    {
      organization_name: '남부대기',
      manager_name: '가',
      email: 'a@example.com',
      phone: '010-1111-1111',
      status: 'pending' as const,
      cities: { regions: { name: '경기남부' } },
    },
    {
      organization_name: '남부승인',
      manager_name: '나',
      email: 'b@example.com',
      phone: '010-2222-2222',
      status: 'approved' as const,
      cities: { regions: { name: '경기남부' } },
    },
    {
      organization_name: '북부승인',
      manager_name: '다',
      email: 'c@example.com',
      phone: '010-3333-3333',
      status: 'approved' as const,
      cities: { regions: { name: '경기북부' } },
    },
  ]

  const counts = getMemberSummaryCounts(members, {
    searchTerm: '',
    regionFilter: '경기남부',
  })

  assert.deepEqual(counts, {
    total: 2,
    pending: 1,
    approved: 1,
  })
})

test('sortMembersByCreatedAt orders newest or oldest first and keeps missing dates last', () => {
  const members = [
    { id: 'b', created_at: '2026-08-10T00:00:00Z' },
    { id: 'none', created_at: null },
    { id: 'a', created_at: '2026-09-01T00:00:00Z' },
    { id: 'c', created_at: '2026-07-01T00:00:00Z' },
  ]

  assert.deepEqual(sortMembersByCreatedAt(members, 'newest').map((m) => m.id), ['a', 'b', 'c', 'none'])
  assert.deepEqual(sortMembersByCreatedAt(members, 'oldest').map((m) => m.id), ['c', 'b', 'a', 'none'])
  // 원본 배열은 변경하지 않는다
  assert.deepEqual(members.map((m) => m.id), ['b', 'none', 'a', 'c'])
})

test('getPendingMemberAge counts elapsed days and flags members waiting 50+ days', () => {
  const now = new Date('2026-10-19T03:00:00Z')

  assert.deepEqual(getPendingMemberAge('2026-10-19T01:00:00Z', now), { days: 0, isOverdue: false })
  assert.deepEqual(getPendingMemberAge('2026-08-31T03:00:00Z', now), { days: 49, isOverdue: false })
  assert.deepEqual(getPendingMemberAge('2026-08-30T03:00:00Z', now), { days: 50, isOverdue: true })
  assert.deepEqual(getPendingMemberAge('2026-07-01T00:00:00Z', now), { days: 110, isOverdue: true })
  assert.equal(getPendingMemberAge(null, now), null)
  assert.equal(getPendingMemberAge('not-a-date', now), null)
})
