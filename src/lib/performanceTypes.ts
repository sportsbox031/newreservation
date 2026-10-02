export type PerformanceProgram = 'sports_class' | 'sports_event' | 'experience_zone'

export interface PerformanceRecord {
  id: string
  program_type: PerformanceProgram
  date: string
  organization_name: string
  phone: string | null
  city_name: string | null
  region_id: number | null
  region_code: 'south' | 'north' | null
  grade: string | null
  participant_count: number
  memo: string | null
  source_type: PerformanceProgram
  source_id: string
  // 수기 레코드(experience_zone_records)에서만 채워지는 수정 폼 프리필용 값.
  // 예약/이벤트 파생 레코드에서는 undefined.
  user_id?: string | null
  city_id?: number | null
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
