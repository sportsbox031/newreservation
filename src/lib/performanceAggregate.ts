import type { PerformanceProgram, PerformanceRecord, PerformanceSummary } from './performanceTypes.ts'

const PROGRAMS: PerformanceProgram[] = ['sports_class', 'sports_event', 'experience_zone']

export function aggregatePerformance(
  records: PerformanceRecord[],
  year: number | null
): PerformanceSummary {
  const byProgram = {
    sports_class: { count: 0, participants: 0 },
    sports_event: { count: 0, participants: 0 },
    experience_zone: { count: 0, participants: 0 },
  } as Record<PerformanceProgram, { count: number; participants: number }>

  const monthly = new Array(12).fill(0) as number[]
  let totalCount = 0
  let totalParticipants = 0

  for (const r of records) {
    const bucket = byProgram[r.program_type]
    if (!bucket) continue
    bucket.count += 1
    bucket.participants += r.participant_count
    totalCount += 1
    totalParticipants += r.participant_count

    if (year === null || Number(r.date.slice(0, 4)) === year) {
      const monthIdx = Number(r.date.slice(5, 7)) - 1
      if (monthIdx >= 0 && monthIdx < 12) monthly[monthIdx] += r.participant_count
    }
  }

  return { totalCount, totalParticipants, byProgram, monthly }
}

export const PERFORMANCE_PROGRAMS = PROGRAMS
