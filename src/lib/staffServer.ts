// 담당자 관리 및 예약 배정 서버 로직
//
// - 담당자 CRUD / 팀 구성 / 휴가 관리 (지역 단위)
// - 예약별 담당자 배정: 수동 배정 + 랜덤 배정(개인/팀)
// - 랜덤 배정 알고리즘은 순수 함수(src/lib/staffAssignment.ts)로 분리되어 테스트된다.

import { createClient } from '@supabase/supabase-js'

import { Database } from '@/types/database'
import { getErrorMessage } from '@/lib/requestUtils'
import {
  runRandomAssignment,
  type AssignmentMethod,
} from '@/lib/staffAssignment'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
  },
})

const SUWON_CITY_NAME = '수원시'
const MAX_STAFF_PER_REGION = 30

function serverError(error: unknown, fallback: string) {
  return { data: null, error: { message: getErrorMessage(error, fallback) } }
}

// ===== 담당자 CRUD =====

export async function getStaffMembers(regionCode: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('staff_members')
      .select('*')
      .eq('region_code', regionCode)
      .order('sort_order')
      .order('id')

    return { data, error }
  } catch (error) {
    return serverError(error, '담당자 목록을 불러오는 중 오류가 발생했습니다.')
  }
}

export async function createStaffMember(input: {
  regionCode: string
  name: string
  teamNo: number | null
}) {
  const name = input.name?.trim()
  if (!name) {
    return { data: null, error: { message: '담당자 이름을 입력해주세요.' } }
  }

  if (input.teamNo !== null && (!Number.isInteger(input.teamNo) || input.teamNo <= 0)) {
    return { data: null, error: { message: '잘못된 팀 번호입니다.' } }
  }

  try {
    const countResponse = await supabaseAdmin
      .from('staff_members')
      .select('id', { count: 'exact', head: true })
      .eq('region_code', input.regionCode)

    if (countResponse.error) {
      return { data: null, error: countResponse.error }
    }

    if ((countResponse.count ?? 0) >= MAX_STAFF_PER_REGION) {
      return { data: null, error: { message: `담당자는 지역당 최대 ${MAX_STAFF_PER_REGION}명까지 등록할 수 있습니다.` } }
    }

    const { data, error } = await supabaseAdmin
      .from('staff_members')
      .insert([{
        region_code: input.regionCode,
        name,
        team_no: input.teamNo,
        sort_order: (countResponse.count ?? 0) + 1,
      }])
      .select()

    return { data, error }
  } catch (error) {
    return serverError(error, '담당자 등록 중 오류가 발생했습니다.')
  }
}

export async function updateStaffMember(
  staffId: number,
  regionCode: string,
  updates: { name?: string; teamNo?: number | null; isActive?: boolean }
) {
  const payload: { name?: string; team_no?: number | null; is_active?: boolean } = {}

  if (updates.name !== undefined) {
    const name = updates.name.trim()
    if (!name) {
      return { data: null, error: { message: '담당자 이름을 입력해주세요.' } }
    }
    payload.name = name
  }

  if (updates.teamNo !== undefined) {
    if (updates.teamNo !== null && (!Number.isInteger(updates.teamNo) || updates.teamNo <= 0)) {
      return { data: null, error: { message: '잘못된 팀 번호입니다.' } }
    }
    payload.team_no = updates.teamNo
  }

  if (updates.isActive !== undefined) {
    payload.is_active = updates.isActive
  }

  if (Object.keys(payload).length === 0) {
    return { data: null, error: { message: '변경할 내용이 없습니다.' } }
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('staff_members')
      .update(payload)
      .eq('id', staffId)
      .eq('region_code', regionCode)
      .select()

    if (error) {
      return { data: null, error }
    }

    if (!data || data.length === 0) {
      return { data: null, error: { message: '해당 담당자를 찾을 수 없습니다.' } }
    }

    return { data, error: null }
  } catch (error) {
    return serverError(error, '담당자 수정 중 오류가 발생했습니다.')
  }
}

export async function deleteStaffMember(staffId: number, regionCode: string) {
  try {
    // 휴가/배정 기록은 ON DELETE CASCADE로 함께 삭제된다
    const { data, error } = await supabaseAdmin
      .from('staff_members')
      .delete()
      .eq('id', staffId)
      .eq('region_code', regionCode)
      .select('id')

    if (error) {
      return { data: null, error }
    }

    if (!data || data.length === 0) {
      return { data: null, error: { message: '해당 담당자를 찾을 수 없습니다.' } }
    }

    return { data, error: null }
  } catch (error) {
    return serverError(error, '담당자 삭제 중 오류가 발생했습니다.')
  }
}

// ===== 휴가 관리 =====

export async function getStaffVacations(regionCode: string, yearMonth: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(yearMonth)
  if (!match) {
    return { data: null, error: { message: '잘못된 조회 월입니다.' } }
  }

  const [, year, month] = match
  const startDate = `${year}-${month}-01`
  const lastDay = new Date(Number(year), Number(month), 0).getDate()
  const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`

  try {
    const { data, error } = await supabaseAdmin
      .from('staff_vacations')
      .select('*, staff_members!inner(id, name, region_code, team_no)')
      .eq('staff_members.region_code', regionCode)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date')

    return { data, error }
  } catch (error) {
    return serverError(error, '휴가 목록을 불러오는 중 오류가 발생했습니다.')
  }
}

export async function addStaffVacation(staffId: number, regionCode: string, date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { data: null, error: { message: '잘못된 날짜 형식입니다.' } }
  }

  try {
    // 담당자가 해당 지역 소속인지 확인
    const staffResponse = await supabaseAdmin
      .from('staff_members')
      .select('id')
      .eq('id', staffId)
      .eq('region_code', regionCode)
      .maybeSingle()

    if (staffResponse.error) {
      return { data: null, error: staffResponse.error }
    }

    if (!staffResponse.data) {
      return { data: null, error: { message: '해당 담당자를 찾을 수 없습니다.' } }
    }

    const { data, error } = await supabaseAdmin
      .from('staff_vacations')
      .upsert([{ staff_id: staffId, date }], { onConflict: 'staff_id,date' })
      .select()

    return { data, error }
  } catch (error) {
    return serverError(error, '휴가 등록 중 오류가 발생했습니다.')
  }
}

export async function removeStaffVacation(vacationId: number, regionCode: string) {
  try {
    const vacationResponse = await supabaseAdmin
      .from('staff_vacations')
      .select('id, staff_members!inner(region_code)')
      .eq('id', vacationId)
      .eq('staff_members.region_code', regionCode)
      .maybeSingle()

    if (vacationResponse.error) {
      return { data: null, error: vacationResponse.error }
    }

    if (!vacationResponse.data) {
      return { data: null, error: { message: '해당 휴가 기록을 찾을 수 없습니다.' } }
    }

    const { data, error } = await supabaseAdmin
      .from('staff_vacations')
      .delete()
      .eq('id', vacationId)
      .select('id')

    return { data, error }
  } catch (error) {
    return serverError(error, '휴가 삭제 중 오류가 발생했습니다.')
  }
}

// ===== 예약 배정 =====

// 월 단위 배정 조회 (예약관리 페이지 표시용)
export async function getAssignmentsForMonth(regionCode: string, year: number, month: number) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  try {
    const { data, error } = await supabaseAdmin
      .from('reservation_staff_assignments')
      .select(`
        id,
        reservation_id,
        staff_id,
        team_no,
        method,
        staff_members!inner(name, region_code, team_no),
        reservations!inner(date)
      `)
      .eq('staff_members.region_code', regionCode)
      .gte('reservations.date', startDate)
      .lte('reservations.date', endDate)

    return { data, error }
  } catch (error) {
    return serverError(error, '담당자 배정 정보를 불러오는 중 오류가 발생했습니다.')
  }
}

// 해당 날짜의 배정 대상 예약 조회 (취소/거절 제외)
async function getAssignableReservationsForDate(regionCode: string, date: string) {
  const regionId = regionCode === 'north' ? 2 : 1

  const { data, error } = await supabaseAdmin
    .from('reservations')
    .select('id, date, created_at, users!inner(cities!inner(name))')
    .eq('region_id', regionId)
    .eq('date', date)
    .in('status', ['pending', 'approved', 'cancel_requested'])
    .order('created_at', { ascending: true })

  if (error) {
    return { data: null, error }
  }

  const reservations = (data ?? []).map((row) => {
    const city = Array.isArray(row.users?.cities) ? row.users.cities[0] : row.users?.cities
    return {
      id: row.id,
      isSuwon: city?.name === SUWON_CITY_NAME,
    }
  })

  return { data: reservations, error: null }
}

// 이번 달 가장 최근 수원시 팀배정의 팀 번호 (교대 배정 판정용)
async function getLastSuwonTeamNo(regionCode: string, year: number, month: number, excludeDate: string) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const { data, error } = await supabaseAdmin
    .from('reservation_staff_assignments')
    .select(`
      team_no,
      created_at,
      staff_members!inner(region_code),
      reservations!inner(date, users!inner(cities!inner(name)))
    `)
    .eq('staff_members.region_code', regionCode)
    .eq('method', 'random_team')
    .not('team_no', 'is', null)
    .eq('reservations.users.cities.name', SUWON_CITY_NAME)
    .gte('reservations.date', startDate)
    .lte('reservations.date', endDate)
    .neq('reservations.date', excludeDate)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error || !data || data.length === 0) {
    return null
  }

  return data[0].team_no
}

// 랜덤 배정 (특정 날짜의 모든 배정 대상 예약을 다시 배정)
export async function assignStaffRandomly(input: {
  regionCode: string
  date: string
  method: AssignmentMethod
  adminId: string
}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    return { data: null, error: { message: '잘못된 날짜 형식입니다.' } }
  }

  if (input.method !== 'random_team' && input.method !== 'random_individual') {
    return { data: null, error: { message: '잘못된 배정 방식입니다.' } }
  }

  try {
    const [year, month] = input.date.split('-').map(Number)

    const reservationsResult = await getAssignableReservationsForDate(input.regionCode, input.date)
    if (reservationsResult.error || !reservationsResult.data) {
      return { data: null, error: reservationsResult.error }
    }

    if (reservationsResult.data.length === 0) {
      return { data: null, error: { message: '해당 날짜에 배정할 예약이 없습니다.' } }
    }

    const staffResult = await getStaffMembers(input.regionCode)
    if (staffResult.error || !staffResult.data) {
      return { data: null, error: staffResult.error }
    }

    const activeStaff = staffResult.data.filter((staff) => staff.is_active)

    // 해당 날짜 휴가자 제외
    const vacationResponse = await supabaseAdmin
      .from('staff_vacations')
      .select('staff_id')
      .eq('date', input.date)
      .in('staff_id', activeStaff.map((staff) => staff.id))

    if (vacationResponse.error) {
      return { data: null, error: vacationResponse.error }
    }

    const vacationStaffIds = new Set((vacationResponse.data ?? []).map((row) => row.staff_id))
    const availableStaff = activeStaff.filter((staff) => !vacationStaffIds.has(staff.id))

    if (availableStaff.length === 0) {
      return { data: null, error: { message: '해당 날짜에 배정 가능한 담당자가 없습니다. (전원 휴가 또는 미등록)' } }
    }

    const lastSuwonTeamNo = input.method === 'random_team'
      ? await getLastSuwonTeamNo(input.regionCode, year, month, input.date)
      : null

    const results = runRandomAssignment(
      input.method,
      reservationsResult.data,
      availableStaff.map((staff) => ({ id: staff.id, team_no: staff.team_no })),
      { lastSuwonTeamNo }
    )

    // 해당 날짜 예약들의 기존 배정을 지우고 새 배정으로 교체
    const reservationIds = reservationsResult.data.map((reservation) => reservation.id)
    const deleteResponse = await supabaseAdmin
      .from('reservation_staff_assignments')
      .delete()
      .in('reservation_id', reservationIds)

    if (deleteResponse.error) {
      return { data: null, error: deleteResponse.error }
    }

    const rows = results.flatMap((result) =>
      result.staffIds.map((staffId) => ({
        reservation_id: result.reservationId,
        staff_id: staffId,
        team_no: result.teamNo,
        method: input.method,
        assigned_by: input.adminId,
      }))
    )

    if (rows.length === 0) {
      return { data: null, error: { message: '배정 결과가 없습니다.' } }
    }

    const insertResponse = await supabaseAdmin
      .from('reservation_staff_assignments')
      .insert(rows)
      .select()

    if (insertResponse.error) {
      return { data: null, error: insertResponse.error }
    }

    return {
      data: {
        assignedReservations: results.length,
        assignments: insertResponse.data ?? [],
      },
      error: null,
    }
  } catch (error) {
    return serverError(error, '랜덤 배정 중 오류가 발생했습니다.')
  }
}

// 월 전체 랜덤 배정: 해당 월의 모든 배정 대상 예약을 날짜 순서대로 재배정한다.
// 수원시 팀 교대는 월 초부터 날짜 순서대로 이어지며, 휴가자는 각 날짜별로 제외된다.
export async function assignStaffRandomlyForMonth(input: {
  regionCode: string
  year: number
  month: number
  method: AssignmentMethod
  adminId: string
}) {
  if (!Number.isInteger(input.year) || !Number.isInteger(input.month) || input.month < 1 || input.month > 12) {
    return { data: null, error: { message: '잘못된 연도 또는 월입니다.' } }
  }

  if (input.method !== 'random_team' && input.method !== 'random_individual') {
    return { data: null, error: { message: '잘못된 배정 방식입니다.' } }
  }

  try {
    const regionId = input.regionCode === 'north' ? 2 : 1
    const startDate = `${input.year}-${String(input.month).padStart(2, '0')}-01`
    const lastDay = new Date(input.year, input.month, 0).getDate()
    const endDate = `${input.year}-${String(input.month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const reservationsResponse = await supabaseAdmin
      .from('reservations')
      .select('id, date, created_at, users!inner(cities!inner(name))')
      .eq('region_id', regionId)
      .gte('date', startDate)
      .lte('date', endDate)
      .in('status', ['pending', 'approved', 'cancel_requested'])
      .order('date', { ascending: true })
      .order('created_at', { ascending: true })

    if (reservationsResponse.error) {
      return { data: null, error: reservationsResponse.error }
    }

    if (!reservationsResponse.data || reservationsResponse.data.length === 0) {
      return { data: null, error: { message: '해당 월에 배정할 예약이 없습니다.' } }
    }

    const staffResult = await getStaffMembers(input.regionCode)
    if (staffResult.error || !staffResult.data) {
      return { data: null, error: staffResult.error }
    }

    const activeStaff = staffResult.data.filter((staff) => staff.is_active)
    if (activeStaff.length === 0) {
      return { data: null, error: { message: '등록된 담당자가 없습니다. 설정 → 담당자 관리에서 먼저 등록해주세요.' } }
    }

    // 이번 달 휴가 전체를 날짜별로 정리
    const vacationResponse = await supabaseAdmin
      .from('staff_vacations')
      .select('staff_id, date')
      .gte('date', startDate)
      .lte('date', endDate)
      .in('staff_id', activeStaff.map((staff) => staff.id))

    if (vacationResponse.error) {
      return { data: null, error: vacationResponse.error }
    }

    const vacationsByDate = new Map<string, Set<number>>()
    for (const row of vacationResponse.data ?? []) {
      const staffIds = vacationsByDate.get(row.date) ?? new Set<number>()
      staffIds.add(row.staff_id)
      vacationsByDate.set(row.date, staffIds)
    }

    // 날짜별로 예약 그룹핑 (날짜/신청순 정렬 유지)
    const reservationsByDate = new Map<string, { id: string; isSuwon: boolean }[]>()
    for (const row of reservationsResponse.data) {
      const city = Array.isArray(row.users?.cities) ? row.users.cities[0] : row.users?.cities
      const items = reservationsByDate.get(row.date) ?? []
      items.push({ id: row.id, isSuwon: city?.name === SUWON_CITY_NAME })
      reservationsByDate.set(row.date, items)
    }

    // 월 전체를 재배정하므로 수원시 팀 교대는 월 초부터 새로 시작한다
    let lastSuwonTeamNo: number | null = null
    let skippedDays = 0
    const rows: {
      reservation_id: string
      staff_id: number
      team_no: number | null
      method: AssignmentMethod
      assigned_by: string
    }[] = []
    let assignedReservations = 0

    for (const [date, dayReservations] of reservationsByDate) {
      const vacationStaffIds = vacationsByDate.get(date) ?? new Set<number>()
      const availableStaff = activeStaff.filter((staff) => !vacationStaffIds.has(staff.id))

      if (availableStaff.length === 0) {
        skippedDays += 1
        continue
      }

      const results = runRandomAssignment(
        input.method,
        dayReservations,
        availableStaff.map((staff) => ({ id: staff.id, team_no: staff.team_no })),
        { lastSuwonTeamNo }
      )

      // 이 날짜의 수원시 배정 결과를 다음 날짜의 교대 판정에 반영
      if (input.method === 'random_team') {
        for (const result of results) {
          const reservation = dayReservations.find((item) => item.id === result.reservationId)
          if (reservation?.isSuwon && result.teamNo !== null) {
            lastSuwonTeamNo = result.teamNo
          }
        }
      }

      assignedReservations += results.length
      for (const result of results) {
        for (const staffId of result.staffIds) {
          rows.push({
            reservation_id: result.reservationId,
            staff_id: staffId,
            team_no: result.teamNo,
            method: input.method,
            assigned_by: input.adminId,
          })
        }
      }
    }

    if (rows.length === 0) {
      return { data: null, error: { message: '배정 가능한 담당자가 없어 배정하지 못했습니다. (휴가 확인)' } }
    }

    // 이번 달 예약들의 기존 배정을 지우고 새 배정으로 교체
    const reservationIds = reservationsResponse.data.map((reservation) => reservation.id)
    const deleteResponse = await supabaseAdmin
      .from('reservation_staff_assignments')
      .delete()
      .in('reservation_id', reservationIds)

    if (deleteResponse.error) {
      return { data: null, error: deleteResponse.error }
    }

    const insertResponse = await supabaseAdmin
      .from('reservation_staff_assignments')
      .insert(rows)
      .select('id')

    if (insertResponse.error) {
      return { data: null, error: insertResponse.error }
    }

    return {
      data: {
        assignedReservations,
        skippedDays,
      },
      error: null,
    }
  } catch (error) {
    return serverError(error, '월 전체 랜덤 배정 중 오류가 발생했습니다.')
  }
}

// 수동 배정 (특정 예약의 담당자 목록을 교체. 빈 배열이면 배정 해제)
export async function setManualAssignment(input: {
  regionCode: string
  reservationId: string
  staffIds: number[]
  adminId: string
}) {
  try {
    const regionId = input.regionCode === 'north' ? 2 : 1

    const reservationResponse = await supabaseAdmin
      .from('reservations')
      .select('id')
      .eq('id', input.reservationId)
      .eq('region_id', regionId)
      .maybeSingle()

    if (reservationResponse.error) {
      return { data: null, error: reservationResponse.error }
    }

    if (!reservationResponse.data) {
      return { data: null, error: { message: '해당 예약을 찾을 수 없습니다.' } }
    }

    // 담당자들이 해당 지역 소속인지 확인
    const uniqueStaffIds = [...new Set(input.staffIds)]
    if (uniqueStaffIds.length > 0) {
      const staffResponse = await supabaseAdmin
        .from('staff_members')
        .select('id')
        .eq('region_code', input.regionCode)
        .in('id', uniqueStaffIds)

      if (staffResponse.error) {
        return { data: null, error: staffResponse.error }
      }

      if ((staffResponse.data ?? []).length !== uniqueStaffIds.length) {
        return { data: null, error: { message: '해당 지역에 없는 담당자가 포함되어 있습니다.' } }
      }
    }

    const deleteResponse = await supabaseAdmin
      .from('reservation_staff_assignments')
      .delete()
      .eq('reservation_id', input.reservationId)

    if (deleteResponse.error) {
      return { data: null, error: deleteResponse.error }
    }

    if (uniqueStaffIds.length === 0) {
      return { data: { assignments: [] }, error: null }
    }

    const insertResponse = await supabaseAdmin
      .from('reservation_staff_assignments')
      .insert(uniqueStaffIds.map((staffId) => ({
        reservation_id: input.reservationId,
        staff_id: staffId,
        team_no: null,
        method: 'manual' as const,
        assigned_by: input.adminId,
      })))
      .select()

    if (insertResponse.error) {
      return { data: null, error: insertResponse.error }
    }

    return { data: { assignments: insertResponse.data ?? [] }, error: null }
  } catch (error) {
    return serverError(error, '담당자 배정 중 오류가 발생했습니다.')
  }
}
