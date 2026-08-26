import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { resolveReservationRegionScope } from '@/lib/reservationManagementHelpers'
import {
  applyRecordFilters, paginate, sortByDateDesc,
} from '@/lib/performanceFilters'
import {
  normalizeSportsClassRow, normalizeSportsEventRow, normalizeExperienceRow,
  overrideKey,
  type SportsClassRow, type SportsEventRow, type ExperienceRow,
} from '@/lib/performanceRecords'
import { aggregatePerformance } from '@/lib/performanceAggregate'
import type { OverrideRow, PerformanceFilters, PerformanceRecord } from '@/lib/performanceTypes'

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

async function loadRegionIdForCode(code: 'south' | 'north'): Promise<number | null> {
  const { data } = await supabaseAdmin.from('regions').select('id').eq('code', code).single()
  return data?.id ?? null
}

async function loadOverrides(): Promise<Map<string, OverrideRow>> {
  const { data } = await supabaseAdmin
    .from('performance_overrides')
    .select('source_type, source_id, grade, participant_count, memo, excluded')
  const map = new Map<string, OverrideRow>()
  for (const o of data ?? []) {
    map.set(overrideKey(o.source_type, o.source_id), o as OverrideRow)
  }
  return map
}

// 참고: reservations -> users -> cities -> regions 체인은 users.city_id, cities.region_id가
// 사실상 항상 채워져 있는 기존 데이터 규약을 따르므로(reservationSettingsServer.ts와 동일 패턴),
// region 필터 유무와 무관하게 체인 전체를 !inner로 고정한다. 이렇게 해야
// `.eq('users.cities.regions.code', regionCode)`가 실제 WHERE 제약으로 동작한다
// (PostgREST는 embed가 !inner가 아니면 중첩 컬럼 필터가 상위 row를 걸러내지 못한다).
async function loadSportsClassRecords(
  regionCode: 'south' | 'north' | null,
  overrides: Map<string, OverrideRow>
): Promise<PerformanceRecord[]> {
  let query = supabaseAdmin
    .from('reservations')
    .select(`
      id, date, region_id, status,
      users!inner ( organization_name, cities!inner ( name, regions!inner ( code ) ) ),
      reservation_slots ( grade, participant_count )
    `)
    .eq('status', 'approved')
  if (regionCode) query = query.eq('users.cities.regions.code', regionCode)
  const { data } = await query
  return (data ?? [])
    .map((row) => {
      const typed = row as unknown as SportsClassRow
      return normalizeSportsClassRow(typed, overrides.get(overrideKey('sports_class', typed.id)))
    })
    .filter((r): r is PerformanceRecord => r !== null)
}

// 참고: event_applications.region_id / experience_zone_records.region_id는 nullable이므로
// (super 관리자가 지역 필터 없이 전체 조회할 때는 region이 비어 있는 레코드도 보여야 한다)
// regions embed를 무조건 !inner로 고정하면 안 된다. regionCode가 지정된 경우에만
// `regions!inner`로 바꿔 실제 WHERE 제약이 걸리도록 하고, 그 외에는 기본(left) embed를 사용한다.
async function loadSportsEventRecords(
  regionCode: 'south' | 'north' | null,
  overrides: Map<string, OverrideRow>
): Promise<PerformanceRecord[]> {
  const regionsEmbed = regionCode ? 'regions!inner ( code )' : 'regions ( code )'
  let query = supabaseAdmin
    .from('event_applications')
    .select(`
      id, total_count, applicant_org_name, region_id, status,
      event_dates ( event_date ),
      ${regionsEmbed}
    `)
    .eq('status', 'selected')
  if (regionCode) query = query.eq('regions.code', regionCode)
  const { data } = await query
  return (data ?? [])
    .map((row) => {
      const typed = row as unknown as SportsEventRow
      return normalizeSportsEventRow(typed, overrides.get(overrideKey('sports_event', typed.id)))
    })
    .filter((r): r is PerformanceRecord => r !== null && r.date !== '')
}

async function loadExperienceRecords(
  regionCode: 'south' | 'north' | null
): Promise<PerformanceRecord[]> {
  const regionsEmbed = regionCode ? 'regions!inner ( code )' : 'regions ( code )'
  let query = supabaseAdmin
    .from('experience_zone_records')
    .select(`
      id, date, organization_name, region_id, grade, participant_count, memo,
      ${regionsEmbed}, cities ( name )
    `)
  if (regionCode) query = query.eq('regions.code', regionCode)
  const { data } = await query
  return (data ?? []).map((row) => normalizeExperienceRow(row as unknown as ExperienceRow))
}

async function loadAllRecords(regionCode: 'south' | 'north' | null): Promise<PerformanceRecord[]> {
  const overrides = await loadOverrides()
  const [cls, evt, exp] = await Promise.all([
    loadSportsClassRecords(regionCode, overrides),
    loadSportsEventRecords(regionCode, overrides),
    loadExperienceRecords(regionCode),
  ])
  return [...cls, ...evt, ...exp]
}

export async function getAllPerformanceRecords(adminRole: string, filters: PerformanceFilters) {
  const scope = resolveReservationRegionScope(adminRole, filters.region)
  if (scope.error) return { data: null, error: scope.error }
  try {
    const all = await loadAllRecords(scope.regionCode)
    return { data: sortByDateDesc(applyRecordFilters(all, filters)), error: null }
  } catch (error) {
    return { data: null, error: { message: '실적 데이터를 불러오는 중 오류가 발생했습니다.' } }
  }
}

export async function getPerformanceRecords(adminRole: string, filters: PerformanceFilters) {
  const result = await getAllPerformanceRecords(adminRole, filters)
  if (result.error || !result.data) return { data: null, error: result.error }
  const paged = paginate(result.data, filters.page, filters.pageSize)
  return { data: { records: paged.items, total: paged.total }, error: null }
}

export async function getPerformanceSummary(adminRole: string, filters: PerformanceFilters) {
  const result = await getAllPerformanceRecords(adminRole, filters)
  if (result.error || !result.data) return { data: null, error: result.error }
  return { data: aggregatePerformance(result.data, filters.year), error: null }
}

export interface ExperienceInput {
  date: string
  organization_name: string
  region_id: number | null
  city_id: number | null
  grade: string | null
  participant_count: number
  memo: string | null
}

async function assertRegionAllowed(adminRole: string, regionId: number | null): Promise<{ message: string } | null> {
  if (adminRole === 'super') return null
  if (adminRole !== 'south' && adminRole !== 'north') return { message: '관리자 권한이 없습니다.' }
  const ownId = await loadRegionIdForCode(adminRole)
  if (regionId !== null && ownId !== null && regionId !== ownId) {
    return { message: '해당 지역 데이터에 접근할 권한이 없습니다.' }
  }
  return null
}

export async function createExperienceRecord(adminId: string, adminRole: string, input: ExperienceInput) {
  // 지역관리자는 region_id를 자기 지역으로 강제
  let regionId = input.region_id
  if (adminRole === 'south' || adminRole === 'north') {
    regionId = await loadRegionIdForCode(adminRole)
  }
  const { data, error } = await supabaseAdmin
    .from('experience_zone_records')
    .insert({ ...input, region_id: regionId, created_by: adminId })
    .select()
    .single()
  if (error) return { data: null, error: { message: '체험존 실적 저장에 실패했습니다.' } }
  return { data, error: null }
}

async function loadExperienceRegionId(id: string): Promise<number | null | undefined> {
  const { data } = await supabaseAdmin.from('experience_zone_records').select('region_id').eq('id', id).single()
  return data ? data.region_id : undefined // undefined = not found
}

export async function updateExperienceRecord(adminRole: string, id: string, input: Partial<ExperienceInput>) {
  const existingRegion = await loadExperienceRegionId(id)
  if (existingRegion === undefined) return { data: null, error: { message: '실적을 찾을 수 없습니다.' } }
  const guard = await assertRegionAllowed(adminRole, existingRegion ?? null)
  if (guard) return { data: null, error: guard }
  const { data, error } = await supabaseAdmin
    .from('experience_zone_records')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) return { data: null, error: { message: '체험존 실적 수정에 실패했습니다.' } }
  return { data, error: null }
}

export async function deleteExperienceRecord(adminRole: string, id: string) {
  const existingRegion = await loadExperienceRegionId(id)
  if (existingRegion === undefined) return { data: null, error: { message: '실적을 찾을 수 없습니다.' } }
  const guard = await assertRegionAllowed(adminRole, existingRegion ?? null)
  if (guard) return { data: null, error: guard }
  const { error } = await supabaseAdmin.from('experience_zone_records').delete().eq('id', id)
  if (error) return { data: null, error: { message: '체험존 실적 삭제에 실패했습니다.' } }
  return { data: { id }, error: null }
}

export interface OverrideFields {
  grade: string | null
  participant_count: number | null
  memo: string | null
  excluded: boolean
}

export async function upsertPerformanceOverride(
  adminId: string,
  adminRole: string,
  sourceType: 'sports_class' | 'sports_event',
  sourceId: string,
  fields: OverrideFields
) {
  // 지역관리자 권한 검증: 대상 레코드가 자기 지역인지 확인
  if (adminRole === 'south' || adminRole === 'north') {
    const ownAll = await getAllPerformanceRecords(adminRole, {
      year: null, from: null, to: null, region: adminRole, program: 'all', q: '', page: 1, pageSize: 100000,
    })
    const found = ownAll.data?.some((r) => r.source_type === sourceType && r.source_id === sourceId)
    if (!found) return { data: null, error: { message: '해당 지역 데이터에 접근할 권한이 없습니다.' } }
  }
  // 모든 필드가 비어 있으면 override 삭제(원복)
  const isEmpty = fields.grade == null && fields.participant_count == null && (fields.memo == null || fields.memo === '') && !fields.excluded
  if (isEmpty) {
    await supabaseAdmin.from('performance_overrides').delete().eq('source_type', sourceType).eq('source_id', sourceId)
    return { data: { cleared: true }, error: null }
  }
  const { data, error } = await supabaseAdmin
    .from('performance_overrides')
    .upsert(
      { source_type: sourceType, source_id: sourceId, ...fields, updated_by: adminId, updated_at: new Date().toISOString() },
      { onConflict: 'source_type,source_id' }
    )
    .select()
    .single()
  if (error) return { data: null, error: { message: '실적 수정에 실패했습니다.' } }
  return { data, error: null }
}
