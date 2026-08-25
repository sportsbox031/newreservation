import type { OverrideRow, PerformanceRecord } from './performanceTypes.ts'

export interface SportsClassRow {
  id: string
  date: string
  region_id: number | null
  users: {
    organization_name: string
    cities: { name: string | null; regions: { code: string | null } | null } | null
  } | null
  reservation_slots: { grade: string | null; participant_count: number | null }[] | null
}

export interface SportsEventRow {
  id: string
  total_count: number | null
  applicant_org_name: string | null
  region_id: number | null
  event_dates: { event_date: string } | null
  regions: { code: string | null } | null
}

export interface ExperienceRow {
  id: string
  date: string
  organization_name: string
  region_id: number | null
  grade: string | null
  participant_count: number | null
  memo: string | null
  regions: { code: string | null } | null
  cities: { name: string | null } | null
}

export function overrideKey(sourceType: string, sourceId: string): string {
  return `${sourceType}:${sourceId}`
}

export function combineGrades(grades: (string | null | undefined)[]): string | null {
  const cleaned = grades
    .map((g) => (g ?? '').trim())
    .filter((g) => g.length > 0)
  const unique = [...new Set(cleaned)]
  return unique.length > 0 ? unique.join(', ') : null
}

function asRegionCode(code: string | null | undefined): 'south' | 'north' | null {
  return code === 'south' || code === 'north' ? code : null
}

export function applyOverride(
  base: PerformanceRecord,
  override?: OverrideRow | null
): PerformanceRecord | null {
  if (!override) return base
  if (override.excluded) return null
  return {
    ...base,
    grade: override.grade != null ? override.grade : base.grade,
    participant_count: override.participant_count != null ? override.participant_count : base.participant_count,
    memo: override.memo != null ? override.memo : base.memo,
  }
}

export function normalizeSportsClassRow(
  row: SportsClassRow,
  override?: OverrideRow | null
): PerformanceRecord | null {
  const slots = row.reservation_slots ?? []
  const base: PerformanceRecord = {
    id: overrideKey('sports_class', row.id),
    program_type: 'sports_class',
    date: row.date,
    organization_name: row.users?.organization_name ?? '(알 수 없음)',
    city_name: row.users?.cities?.name ?? null,
    region_id: row.region_id ?? null,
    region_code: asRegionCode(row.users?.cities?.regions?.code),
    grade: combineGrades(slots.map((s) => s.grade)),
    participant_count: slots.reduce((sum, s) => sum + (s.participant_count ?? 0), 0),
    memo: null,
    source_type: 'sports_class',
    source_id: row.id,
  }
  return applyOverride(base, override)
}

export function normalizeSportsEventRow(
  row: SportsEventRow,
  override?: OverrideRow | null
): PerformanceRecord | null {
  const base: PerformanceRecord = {
    id: overrideKey('sports_event', row.id),
    program_type: 'sports_event',
    date: row.event_dates?.event_date ?? '',
    organization_name: row.applicant_org_name ?? '(알 수 없음)',
    city_name: null,
    region_id: row.region_id ?? null,
    region_code: asRegionCode(row.regions?.code),
    grade: null,
    participant_count: row.total_count ?? 0,
    memo: null,
    source_type: 'sports_event',
    source_id: row.id,
  }
  return applyOverride(base, override)
}

export function normalizeExperienceRow(row: ExperienceRow): PerformanceRecord {
  return {
    id: overrideKey('experience_zone', row.id),
    program_type: 'experience_zone',
    date: row.date,
    organization_name: row.organization_name,
    city_name: row.cities?.name ?? null,
    region_id: row.region_id ?? null,
    region_code: asRegionCode(row.regions?.code),
    grade: row.grade ?? null,
    participant_count: row.participant_count ?? 0,
    memo: row.memo ?? null,
    source_type: 'experience_zone',
    source_id: row.id,
  }
}
