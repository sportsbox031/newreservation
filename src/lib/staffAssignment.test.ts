import test from 'node:test'
import assert from 'node:assert/strict'

import {
  assignIndividuals,
  assignTeams,
  runRandomAssignment,
  type AssignableStaff,
} from './staffAssignment.ts'

// 고정 시퀀스 난수 (결정적 테스트용)
function fixedRandom(values: number[]) {
  let index = 0
  return () => values[index++ % values.length]
}

const fourStaff: AssignableStaff[] = [
  { id: 1, team_no: 1 },
  { id: 2, team_no: 1 },
  { id: 3, team_no: 2 },
  { id: 4, team_no: 2 },
]

test('스케줄 1개면 가용 담당자 전원 배정 (개인/팀 공통)', () => {
  const reservations = [{ id: 'r1', isSuwon: false }]

  const individual = assignIndividuals(reservations, fourStaff, fixedRandom([0]))
  assert.equal(individual.length, 1)
  assert.deepEqual([...individual[0].staffIds].sort(), [1, 2, 3, 4])

  const team = assignTeams(reservations, fourStaff, { lastSuwonTeamNo: null, random: fixedRandom([0]) })
  assert.equal(team.length, 1)
  assert.deepEqual([...team[0].staffIds].sort(), [1, 2, 3, 4])
})

test('개인배정: 스케줄 2개 × 4명 → 2명씩 균등 분배', () => {
  const reservations = [
    { id: 'r1', isSuwon: false },
    { id: 'r2', isSuwon: false },
  ]

  const results = assignIndividuals(reservations, fourStaff, fixedRandom([0.1, 0.5, 0.9]))
  assert.equal(results.length, 2)
  assert.equal(results[0].staffIds.length, 2)
  assert.equal(results[1].staffIds.length, 2)

  // 전원이 정확히 한 번씩 배정
  const allAssigned = [...results[0].staffIds, ...results[1].staffIds].sort()
  assert.deepEqual(allAssigned, [1, 2, 3, 4])
})

test('개인배정: 휴가자 제외 후 남은 인원으로 분배', () => {
  const available = fourStaff.filter((staff) => staff.id !== 2) // 2번 휴가
  const reservations = [
    { id: 'r1', isSuwon: false },
    { id: 'r2', isSuwon: false },
  ]

  const results = assignIndividuals(reservations, available, fixedRandom([0.3]))
  const counts = results.map((r) => r.staffIds.length).sort()
  assert.deepEqual(counts, [1, 2]) // 3명 → 2명 + 1명
  const allAssigned = results.flatMap((r) => r.staffIds).sort()
  assert.deepEqual(allAssigned, [1, 3, 4])
})

test('팀배정: 스케줄 2개 → 두 팀이 하나씩, 팀원 2명이 함께 배정', () => {
  const reservations = [
    { id: 'r1', isSuwon: false },
    { id: 'r2', isSuwon: false },
  ]

  const results = assignTeams(reservations, fourStaff, { lastSuwonTeamNo: null, random: fixedRandom([0.2]) })
  assert.equal(results.length, 2)

  const teamNos = results.map((r) => r.teamNo).sort()
  assert.deepEqual(teamNos, [1, 2]) // 두 팀에 하나씩

  for (const result of results) {
    assert.equal(result.staffIds.length, 2)
    // 같은 팀 멤버끼리 배정되었는지
    const expected = result.teamNo === 1 ? [1, 2] : [3, 4]
    assert.deepEqual([...result.staffIds].sort(), expected)
  }
})

test('팀배정: 수원시 예약은 직전 수원시 담당 팀과 다른 팀에 배정', () => {
  const reservations = [{ id: 'suwon-1', isSuwon: true }, { id: 'normal-1', isSuwon: false }]

  // 지난 수원시 배정이 1팀이었다면 이번 수원시는 2팀
  const results = assignTeams(reservations, fourStaff, { lastSuwonTeamNo: 1, random: fixedRandom([0]) })
  const suwonResult = results.find((r) => r.reservationId === 'suwon-1')
  assert.ok(suwonResult)
  assert.equal(suwonResult.teamNo, 2)

  // 지난 수원시 배정이 2팀이었다면 이번 수원시는 1팀
  const results2 = assignTeams(reservations, fourStaff, { lastSuwonTeamNo: 2, random: fixedRandom([0]) })
  const suwonResult2 = results2.find((r) => r.reservationId === 'suwon-1')
  assert.ok(suwonResult2)
  assert.equal(suwonResult2.teamNo, 1)
})

test('팀배정: 같은 날 수원시 예약 2개면 두 팀이 번갈아 배정', () => {
  const reservations = [
    { id: 'suwon-1', isSuwon: true },
    { id: 'suwon-2', isSuwon: true },
  ]

  const results = assignTeams(reservations, fourStaff, { lastSuwonTeamNo: 1, random: fixedRandom([0]) })
  const first = results.find((r) => r.reservationId === 'suwon-1')
  const second = results.find((r) => r.reservationId === 'suwon-2')
  assert.equal(first?.teamNo, 2)  // 직전 1팀 → 2팀
  assert.equal(second?.teamNo, 1) // 직전 2팀 → 1팀
})

test('팀배정: 한 팀 전원이 휴가면 남은 팀이 모든 스케줄 담당', () => {
  const available = fourStaff.filter((staff) => staff.team_no !== 1) // 1팀 전원 휴가
  const reservations = [
    { id: 'r1', isSuwon: false },
    { id: 'r2', isSuwon: true },
  ]

  const results = assignTeams(reservations, available, { lastSuwonTeamNo: 2, random: fixedRandom([0]) })
  assert.equal(results.length, 2)
  for (const result of results) {
    assert.equal(result.teamNo, 2)
    assert.deepEqual([...result.staffIds].sort(), [3, 4])
  }
})

test('팀배정: 팀원 1명이 휴가면 남은 1명이 팀으로 배정', () => {
  const available = fourStaff.filter((staff) => staff.id !== 1) // 1팀의 1명 휴가
  const reservations = [
    { id: 'r1', isSuwon: false },
    { id: 'r2', isSuwon: false },
  ]

  const results = assignTeams(reservations, available, { lastSuwonTeamNo: null, random: fixedRandom([0.4]) })
  const team1Result = results.find((r) => r.teamNo === 1)
  const team2Result = results.find((r) => r.teamNo === 2)
  assert.ok(team1Result)
  assert.ok(team2Result)
  assert.deepEqual(team1Result.staffIds, [2])
  assert.deepEqual([...team2Result.staffIds].sort(), [3, 4])
})

test('가용 담당자가 없으면 빈 배정', () => {
  const reservations = [{ id: 'r1', isSuwon: false }]
  assert.deepEqual(assignIndividuals(reservations, [], fixedRandom([0])), [])
  assert.deepEqual(assignTeams(reservations, [], { lastSuwonTeamNo: null, random: fixedRandom([0]) }), [])
})

test('runRandomAssignment는 방식에 따라 올바른 알고리즘 실행', () => {
  const reservations = [
    { id: 'r1', isSuwon: false },
    { id: 'r2', isSuwon: false },
  ]

  const teamResults = runRandomAssignment('random_team', reservations, fourStaff, {
    lastSuwonTeamNo: null,
    random: fixedRandom([0]),
  })
  assert.ok(teamResults.every((r) => r.teamNo !== null))

  const individualResults = runRandomAssignment('random_individual', reservations, fourStaff, {
    lastSuwonTeamNo: null,
    random: fixedRandom([0]),
  })
  assert.ok(individualResults.every((r) => r.teamNo === null))
})

test('스케줄 3개 × 4명(개인배정) → 2명 + 1명 + 1명', () => {
  const reservations = [
    { id: 'r1', isSuwon: false },
    { id: 'r2', isSuwon: false },
    { id: 'r3', isSuwon: false },
  ]

  const results = assignIndividuals(reservations, fourStaff, fixedRandom([0.7, 0.2]))
  const counts = results.map((r) => r.staffIds.length).sort()
  assert.deepEqual(counts, [1, 1, 2])
})
