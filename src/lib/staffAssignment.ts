// 담당자 랜덤 배정 알고리즘 (순수 함수)
//
// 규칙:
// - 휴가인 담당자는 배정에서 제외한다.
// - 하루 스케줄이 1개면 가용 담당자 전원을 배정한다.
// - 하루 스케줄이 여러 개면 가능한 한 균등하게 나눠 배정한다. (예: 2개 스케줄 × 4명 → 2명 + 2명)
// - 팀배정: 한 팀(2명)이 같은 스케줄에 함께 배정된다.
// - 개인배정: 팀 구분 없이 가용 담당자를 섞어서 배정한다.
// - 수원시 예약(팀배정)은 한 달 동안 두 팀이 번갈아가며 담당한다.
// - 지역(남부/북부)은 호출자가 분리해서 전달하므로 여기서는 섞이지 않는다.

export type AssignmentMethod = 'random_team' | 'random_individual'

export interface AssignableStaff {
  id: number
  team_no: number | null
}

export interface AssignableReservation {
  id: string
  isSuwon: boolean
}

export interface AssignmentResult {
  reservationId: string
  staffIds: number[]
  teamNo: number | null // 팀배정일 때 배정된 팀 번호 (수원시 교대 판정 스냅샷)
}

export type RandomFn = () => number

function shuffle<T>(items: T[], random: RandomFn): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// 개인배정: 가용 담당자를 섞어 스케줄에 균등 분배
export function assignIndividuals(
  reservations: AssignableReservation[],
  availableStaff: AssignableStaff[],
  random: RandomFn = Math.random
): AssignmentResult[] {
  if (reservations.length === 0 || availableStaff.length === 0) {
    return []
  }

  // 스케줄 1개면 전원 배정
  if (reservations.length === 1) {
    return [{
      reservationId: reservations[0].id,
      staffIds: availableStaff.map((staff) => staff.id),
      teamNo: null,
    }]
  }

  const shuffled = shuffle(availableStaff, random)
  const buckets: number[][] = reservations.map(() => [])

  // 라운드 로빈으로 균등 분배 (인원이 스케줄 수보다 적으면 앞 스케줄부터 1명씩)
  shuffled.forEach((staff, index) => {
    buckets[index % reservations.length].push(staff.id)
  })

  return reservations.map((reservation, index) => ({
    reservationId: reservation.id,
    staffIds: buckets[index],
    teamNo: null,
  }))
}

// 팀배정: 팀 단위로 스케줄에 배정. 수원시 예약은 지난 수원시 배정 팀과 다른 팀부터 교대로.
export function assignTeams(
  reservations: AssignableReservation[],
  availableStaff: AssignableStaff[],
  options: {
    // 이번 달 가장 최근 수원시 팀배정의 팀 번호 (없으면 null)
    lastSuwonTeamNo: number | null
    random?: RandomFn
  }
): AssignmentResult[] {
  const random = options.random ?? Math.random

  if (reservations.length === 0 || availableStaff.length === 0) {
    return []
  }

  // 스케줄 1개면 전원 배정 (팀 구분 없이)
  if (reservations.length === 1) {
    const teamNos = [...new Set(availableStaff.map((staff) => staff.team_no).filter((no): no is number => no !== null))]
    return [{
      reservationId: reservations[0].id,
      staffIds: availableStaff.map((staff) => staff.id),
      teamNo: teamNos.length === 1 ? teamNos[0] : null,
    }]
  }

  // 가용 멤버가 1명 이상인 팀 목록 (팀 미지정 인원은 팀배정에서 제외)
  const teamMap = new Map<number, number[]>()
  for (const staff of availableStaff) {
    if (staff.team_no === null) {
      continue
    }
    const members = teamMap.get(staff.team_no) ?? []
    members.push(staff.id)
    teamMap.set(staff.team_no, members)
  }

  const teams = shuffle(
    [...teamMap.entries()].map(([teamNo, staffIds]) => ({ teamNo, staffIds })),
    random
  )

  if (teams.length === 0) {
    return []
  }

  // 예약 순서대로 배정하되, 수원시 예약은 직전 수원시 담당 팀을 피하고
  // 일반 예약은 사용 횟수가 가장 적은 팀부터 배정해 균등하게 나눈다
  const results: AssignmentResult[] = []
  const teamUsageCount = new Map<number, number>(teams.map((team) => [team.teamNo, 0]))
  let lastSuwonTeamNo = options.lastSuwonTeamNo

  const pickLeastUsedTeam = (excludeTeamNo: number | null) => {
    const candidates = teams
      .filter((team) => teams.length === 1 || team.teamNo !== excludeTeamNo)
      .sort((a, b) => (teamUsageCount.get(a.teamNo) ?? 0) - (teamUsageCount.get(b.teamNo) ?? 0))
    return candidates[0] ?? teams[0]
  }

  for (const reservation of reservations) {
    let team
    if (reservation.isSuwon) {
      // 직전 수원시 담당 팀과 다른 팀을 우선 배정 (팀이 1개뿐이면 그 팀)
      team = pickLeastUsedTeam(lastSuwonTeamNo)
      lastSuwonTeamNo = team.teamNo
    } else {
      team = pickLeastUsedTeam(null)
    }

    teamUsageCount.set(team.teamNo, (teamUsageCount.get(team.teamNo) ?? 0) + 1)
    results.push({
      reservationId: reservation.id,
      staffIds: team.staffIds,
      teamNo: team.teamNo,
    })
  }

  return results
}

export function runRandomAssignment(
  method: AssignmentMethod,
  reservations: AssignableReservation[],
  availableStaff: AssignableStaff[],
  options: {
    lastSuwonTeamNo: number | null
    random?: RandomFn
  }
): AssignmentResult[] {
  if (method === 'random_team') {
    return assignTeams(reservations, availableStaff, options)
  }
  return assignIndividuals(reservations, availableStaff, options.random)
}
