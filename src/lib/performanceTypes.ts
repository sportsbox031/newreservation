export type PerformanceProgram = 'sports_class' | 'sports_event' | 'experience_zone'

export interface PerformanceRecord {
  id: string
  program_type: PerformanceProgram
  date: string
  organization_name: string
  city_name: string | null
  region_id: number | null
  region_code: 'south' | 'north' | null
  grade: string | null
  participant_count: number
  memo: string | null
  source_type: PerformanceProgram
  source_id: string
}

export interface OverrideRow {
  source_type: 'sports_class' | 'sports_event'
  source_id: string
  grade: string | null
  participant_count: number | null
  memo: string | null
  excluded: boolean
}

export interface PerformanceFilters {
  year: number | null
  from: string | null
  to: string | null
  region: 'south' | 'north' | null
  program: PerformanceProgram | 'all'
  q: string
  page: number
  pageSize: number
}

export interface PerformanceSummary {
  totalCount: number
  totalParticipants: number
  byProgram: Record<PerformanceProgram, { count: number; participants: number }>
  monthly: number[]
}
