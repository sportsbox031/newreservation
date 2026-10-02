import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { resolveReservationRegionScope } from '@/lib/reservationManagementHelpers'
import {
  applyRecordFilters, paginate, sortByDateDesc,
} from '@/lib/performanceFilters'
import {
  normalizeSportsClassRow, normalizeSportsEventRow, normalizeExperienceRow,
  overrideKey, dedupeSurveyContacts,
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

function toRegionCode(code: string | null | undefined): 'south' | 'north' | null {
  return code === 'south' || code === 'north' ? code : null
}

export interface MemberSearchResult {
  user_id: string
  organization_name: string
  phone: string | null
  city_id: number | null
  city_name: string | null
  region_id: number | null
  region_code: 'south' | 'north' | null
}

// 수기 실적 입력용 단체 자동완성: 승인된 회원만, 관리자 지역 범위 내에서
// 단체명 부분일치 검색(최대 10건).
export async function searchApprovedMembers(adminRole: string, q: string) {
  const scope = resolveReservationRegionScope(adminRole, null)
  if (scope.error) return { data: null, error: scope.error }
  const term = q.trim().replace(/[%,()]/g, '')
  if (!term) return { data: [] as MemberSearchResult[], error: null }
  const regionsEmbed = scope.regionCode ? 'regions!inner ( code )' : 'regions ( code )'
  let query = supabaseAdmin
    .from('users')
    .select(`id, organization_name, phone, city_id, status, cities!inner ( id, name, region_id, ${regionsEmbed} )`)
    .eq('status', 'approved')
    .ilike('organization_name', `%${term}%`)
    .order('organization_name')
    .limit(10)
  if (scope.regionCode) query = query.eq('cities.regions.code', scope.regionCode)
  const { data, error } = await query
  if (error) return { data: null, error: { message: '단체 검색에 실패했습니다.' } }
  const results: MemberSearchResult[] = (data ?? []).map((u: any) => ({
    user_id: u.id,
    organization_name: u.organization_name,
    phone: u.phone ?? null,
    city_id: u.city_id ?? null,
    city_name: u.cities?.name ?? null,
    region_id: u.cities?.region_id ?? null,
    region_code: toRegionCode(u.cities?.regions?.code),
  }))
  return { data: results, error: null }
}

export interface CityOption {
  id: number
  name: string
  region_id: number | null
  region_code: 'south' | 'north' | null
}

// 체험존(미가입 단체) 수기 입력 시 시/군 선택용 목록. 관리자 지역 범위 적용.
export async function listCitiesForAdmin(adminRole: string) {
  const scope = resolveReservationRegionScope(adminRole, null)
  if (scope.error) return { data: null, error: scope.error }
  const regionsEmbed = scope.regionCode ? 'regions!inner ( code )' : 'regions ( code )'
  let query = supabaseAdmin
    .from('cities')
    .select(`id, name, region_id, ${regionsEmbed}`)
    .order('name')
  if (scope.regionCode) query = query.eq('regions.code', scope.regionCode)
  const { data, error } = await query
  if (error) return { data: null, error: { message: '시/군 목록을 불러오지 못했습니다.' } }
  const results: CityOption[] = (data ?? []).map((c: any) => ({
    id: c.id,
    name: c.name,
    region_id: c.region_id ?? null,
    region_code: toRegionCode(c.regions?.code),
  }))
  return { data: results, error: null }
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
      users!inner ( organization_name, phone, cities!inner ( name, regions!inner ( code ) ) ),
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
      id, total_count, applicant_org_name, applicant_phone, region_id, status,
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
      program_type, phone, user_id, city_id,
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

// 만족도조사용 명단: 현재 필터를 적용한 실적에서 연락처가 있는 단체만
// (체험존은 연락처가 없어 자동 제외) 단체명 기준 중복을 제거해 반환한다.
export async function getSurveyContacts(adminRole: string, filters: PerformanceFilters) {
  const result = await getAllPerformanceRecords(adminRole, filters)
  if (result.error || !result.data) return { data: null, error: result.error }
  return { data: dedupeSurveyContacts(result.data), error: null }
}

export interface ExperienceInput {
  date: string
  organization_name: string
  program_type: 'sports_class' | 'sports_event' | 'experience_zone'
  user_id: string | null
  region_id: number | null
  city_id: number | null
  grade: string | null
  participant_count: number
  memo: string | null
}

interface MemberSnapshot {
  organization_name: string
  phone: string | null
  region_id: number | null
  city_id: number | null
}

// 회원가입된 단체(user_id)의 단체명·연락처·시군·지역을 서버에서 직접 읽어
// 클라이언트가 보낸 값 대신 사용한다(단체명 위조/불일치 방지). 승인된 회원만 허용.
async function loadApprovedMemberSnapshot(userId: string): Promise<MemberSnapshot | null> {
  const { data } = await supabaseAdmin
    .from('users')
    .select('organization_name, phone, city_id, status, cities ( region_id )')
    .eq('id', userId)
    .single()
  if (!data || data.status !== 'approved') return null
  const city = data.cities as unknown as { region_id: number | null } | null
  return {
    organization_name: data.organization_name,
    phone: data.phone ?? null,
    region_id: city?.region_id ?? null,
    city_id: data.city_id ?? null,
  }
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

interface ResolvedManualFields {
  organization_name: string
  program_type: 'sports_class' | 'sports_event' | 'experience_zone'
  user_id: string | null
  phone: string | null
  region_id: number | null
  city_id: number | null
}

// 수기 실적 공통 처리: 회원 단체(user_id)면 서버에서 단체명·연락처·시군·지역을 직접 읽어 사용하고,
// 교실/이벤트인데 회원이 아니면 거부한다. 지역관리자는 지역을 자기 지역으로 강제/검증한다.
async function resolveManualRecordFields(
  adminRole: string,
  input: Pick<ExperienceInput, 'program_type' | 'user_id' | 'organization_name' | 'region_id' | 'city_id'>
): Promise<{ error: { message: string } } | { fields: ResolvedManualFields }> {
  const programType = input.program_type
  const requiresMember = programType === 'sports_class' || programType === 'sports_event'
  let organizationName = input.organization_name
  let phone: string | null = null
  let regionId = input.region_id
  let cityId = input.city_id
  const userId = input.user_id

  if (userId) {
    const member = await loadApprovedMemberSnapshot(userId)
    if (!member) return { error: { message: '선택한 단체가 승인된 회원이 아닙니다.' } }
    organizationName = member.organization_name
    regionId = member.region_id
    cityId = member.city_id
    // 연락처는 만족도조사 대상인 교실/이벤트에만 저장(체험존은 제외)
    phone = requiresMember ? member.phone : null
  } else if (requiresMember) {
    return { error: { message: '스포츠교실·스포츠이벤트는 회원가입된 단체만 선택할 수 있습니다.' } }
  }

  if (adminRole === 'south' || adminRole === 'north') {
    const ownId = await loadRegionIdForCode(adminRole)
    if (regionId !== null && ownId !== null && regionId !== ownId) {
      return { error: { message: '해당 지역 데이터에 접근할 권한이 없습니다.' } }
    }
    regionId = ownId
  }

  return {
    fields: {
      organization_name: organizationName,
      program_type: programType,
      user_id: userId,
      phone,
      region_id: regionId,
      city_id: cityId,
    },
  }
}

export async function createExperienceRecord(adminId: string, adminRole: string, input: ExperienceInput) {
  const resolved = await resolveManualRecordFields(adminRole, input)
  if ('error' in resolved) return { data: null, error: resolved.error }
  const { data, error } = await supabaseAdmin
    .from('experience_zone_records')
    .insert({
      ...resolved.fields,
      date: input.date,
      grade: input.grade,
      participant_count: input.participant_count,
      memo: input.memo,
      created_by: adminId,
    })
    .select()
    .single()
  if (error) return { data: null, error: { message: '실적 저장에 실패했습니다.' } }
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

  // 수정 폼은 단체명/프로그램 구분을 함께 보낸다. 회원 단체면 서버에서 스냅샷을 다시 유도한다.
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.date !== undefined) patch.date = input.date
  if (input.grade !== undefined) patch.grade = input.grade
  if (input.participant_count !== undefined) patch.participant_count = input.participant_count
  if (input.memo !== undefined) patch.memo = input.memo

  if (input.program_type !== undefined) {
    const resolved = await resolveManualRecordFields(adminRole, {
      program_type: input.program_type,
      user_id: input.user_id ?? null,
      organization_name: input.organization_name ?? '',
      region_id: input.region_id ?? null,
      city_id: input.city_id ?? null,
    })
    if ('error' in resolved) return { data: null, error: resolved.error }
    Object.assign(patch, resolved.fields)
  } else {
    // program_type을 보내지 않은 기존 경로(하위호환): 개별 필드만 반영
    if (input.organization_name !== undefined) patch.organization_name = input.organization_name
    if (input.region_id !== undefined) patch.region_id = input.region_id
    if (input.city_id !== undefined) patch.city_id = input.city_id
  }

  const { data, error } = await supabaseAdmin
    .from('experience_zone_records')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) return { data: null, error: { message: '실적 수정에 실패했습니다.' } }
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
