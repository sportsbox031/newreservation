import type { PerformanceFilters, PerformanceProgram, PerformanceRecord } from './performanceTypes.ts'

const PROGRAMS: PerformanceProgram[] = ['sports_class', 'sports_event', 'experience_zone']
const DEFAULT_PAGE_SIZE = 30

function parseIntOr(value: string | null, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
}

export function parsePerformanceFilters(
  params: URLSearchParams,
  adminRole: string
): { filters: PerformanceFilters; error: { message: string } | null } {
  let regionCode: 'south' | 'north' | null = null
  let error: { message: string } | null = null

  // Determine region based on admin role
  if (adminRole === 'super') {
    // Super admin can request any region
    const requested = params.get('region')
    regionCode = (requested === 'south' || requested === 'north') ? requested : null
  } else if (adminRole === 'south' || adminRole === 'north') {
    // Regional admins are forced to their own region
    regionCode = adminRole
  } else {
    // Invalid admin role
    error = { message: '관리자 권한이 없습니다.' }
  }

  const yearRaw = Number(params.get('year'))
  const programRaw = params.get('program')
  const program = (programRaw && PROGRAMS.includes(programRaw as PerformanceProgram))
    ? (programRaw as PerformanceProgram)
    : 'all'

  return {
    filters: {
      year: Number.isFinite(yearRaw) && yearRaw > 0 ? yearRaw : null,
      from: params.get('from') || null,
      to: params.get('to') || null,
      region: regionCode,
      program,
      q: (params.get('q') || '').trim(),
      page: parseIntOr(params.get('page'), 1),
      pageSize: parseIntOr(params.get('pageSize'), DEFAULT_PAGE_SIZE),
    },
    error,
  }
}

export function applyRecordFilters(
  records: PerformanceRecord[],
  filters: PerformanceFilters
): PerformanceRecord[] {
  return records.filter((r) => {
    if (filters.year !== null && Number(r.date.slice(0, 4)) !== filters.year) return false
    if (filters.from && r.date < filters.from) return false
    if (filters.to && r.date > filters.to) return false
    if (filters.region && r.region_code !== filters.region) return false
    if (filters.program !== 'all' && r.program_type !== filters.program) return false
    if (filters.q && !r.organization_name.includes(filters.q)) return false
    return true
  })
}

export function sortByDateDesc(records: PerformanceRecord[]): PerformanceRecord[] {
  return [...records].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
}

export function paginate<T>(
  items: T[],
  page: number,
  pageSize: number
): { items: T[]; total: number; page: number; pageSize: number } {
  const start = (page - 1) * pageSize
  return { items: items.slice(start, start + pageSize), total: items.length, page, pageSize }
}
