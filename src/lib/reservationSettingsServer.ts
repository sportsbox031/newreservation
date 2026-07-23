import { createClient } from '@supabase/supabase-js'

import { Database } from '@/types/database'
import { getErrorMessage, withTimeout } from '@/lib/requestUtils'
import {
  normalizeYearMonth,
  parseYearMonthParts,
  resolveActiveReservationMonth,
} from '@/lib/reservationActiveMonth'
import {
  getReservationStatusesForScope,
  resolveReservationRegionScope,
  type ReservationRegionCode,
  type ReservationScope,
} from '@/lib/reservationManagementHelpers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
  },
})

const QUERY_TIMEOUT_MS = 8000
const LONG_QUERY_TIMEOUT_MS = 12000
const regionIdCache = new Map<string, number>()

function timeoutError(message: string) {
  return { message }
}

async function runQueryWithTimeout<T>(
  promise: PromiseLike<T>,
  message: string,
  timeoutMs = QUERY_TIMEOUT_MS
): Promise<T> {
  return withTimeout(promise, timeoutMs, message)
}

export async function getRegionIdByCode(regionCode: string): Promise<number | null> {
  const cached = regionIdCache.get(regionCode)
  if (cached) {
    return cached
  }

  const { data, error } = await runQueryWithTimeout(
    supabaseAdmin
      .from('regions')
      .select('id')
      .eq('code', regionCode)
      .single(),
    '지역 정보를 불러오는 중 시간이 초과되었습니다.'
  )

  if (error || !data) {
    return null
  }

  regionIdCache.set(regionCode, data.id)
  return data.id
}

export async function getBlockedDatesForRegion(regionCode: string) {
  const regionId = await getRegionIdByCode(regionCode)
  if (!regionId) {
    return { data: null, error: { message: '존재하지 않는 지역입니다.' } }
  }

  try {
    const { data, error } = await runQueryWithTimeout(
      supabaseAdmin
        .from('blocked_dates')
        .select('date, start_time, end_time, reason, id')
        .eq('region_id', regionId),
      '차단 일정을 불러오는 중 시간이 초과되었습니다.'
    )

    return { data, error }
  } catch (error) {
    return {
      data: null,
      error: timeoutError(getErrorMessage(error, '차단 일정을 불러오는 중 오류가 발생했습니다.')),
    }
  }
}

export async function getReservationSettingsForRegionMonth(regionCode: string, year: number, month: number) {
  const regionId = await getRegionIdByCode(regionCode)
  if (!regionId) {
    return { data: null, error: { message: '존재하지 않는 지역입니다.' } }
  }

  try {
    const response = await runQueryWithTimeout(
      supabaseAdmin
        .from('reservation_settings')
        .select('*')
        .eq('region_id', regionId)
        .eq('year', year)
        .eq('month', month)
        .maybeSingle(),
      '예약 설정을 불러오는 중 시간이 초과되었습니다.'
    )

    if (response.error) {
      return { data: null, error: response.error }
    }

    return {
      data: response.data || {
        is_open: false,
        max_reservations_per_day: 2,
        max_days_per_month: 4,
      },
      error: null,
    }
  } catch (error) {
    return {
      data: {
        is_open: false,
        max_reservations_per_day: 2,
        max_days_per_month: 4,
      },
      error: timeoutError(getErrorMessage(error, '예약 설정을 불러오는 중 오류가 발생했습니다.')),
    }
  }
}

export async function updateReservationSettingsForRegionMonth(
  regionCode: string,
  year: number,
  month: number,
  settings: {
    is_open?: boolean
    max_reservations_per_day?: number
    max_days_per_month?: number
  }
) {
  const regionId = await getRegionIdByCode(regionCode)
  if (!regionId) {
    return { data: null, error: { message: '존재하지 않는 지역입니다.' } }
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('reservation_settings')
      .upsert([{
        region_id: regionId,
        year,
        month,
        is_open: settings.is_open ?? false,
        max_reservations_per_day: settings.max_reservations_per_day ?? 2,
        max_days_per_month: settings.max_days_per_month ?? 4,
      }], {
        onConflict: 'region_id,year,month',
      })
      .select()

    return { data, error }
  } catch (error) {
    return {
      data: null,
      error: timeoutError(getErrorMessage(error, '예약 설정 업데이트 중 오류가 발생했습니다.')),
    }
  }
}

async function setReservationMonthOpenState(regionCode: string, yearMonth: string, isOpen: boolean) {
  const parsed = parseYearMonthParts(yearMonth)
  if (!parsed) {
    return { data: null, error: { message: '잘못된 예약 월입니다.' } }
  }

  const currentSettings = await getReservationSettingsForRegionMonth(regionCode, parsed.year, parsed.month)
  if (currentSettings.error && !currentSettings.data) {
    return currentSettings
  }

  return updateReservationSettingsForRegionMonth(regionCode, parsed.year, parsed.month, {
    is_open: isOpen,
    max_days_per_month: currentSettings.data?.max_days_per_month ?? 4,
    max_reservations_per_day: currentSettings.data?.max_reservations_per_day ?? 2,
  })
}

export async function getActiveReservationMonthForRegion(regionCode: string) {
  try {
    const regionId = await getRegionIdByCode(regionCode)
    if (!regionId) {
      return { data: null, error: { message: '존재하지 않는 지역입니다.' } }
    }

    const [settingsResponse, tierSettingsResponse] = await Promise.all([
      runQueryWithTimeout(
        supabaseAdmin
          .from('reservation_settings')
          .select('year, month')
          .eq('region_id', regionId)
          .eq('is_open', true),
        '활성 예약 월을 불러오는 중 시간이 초과되었습니다.'
      ),
      runQueryWithTimeout(
        supabaseAdmin
          .from('tier_reservation_settings')
          .select('year_month')
          .eq('region_code', regionCode)
          .eq('is_open', true),
        '티어 예약 상태를 불러오는 중 시간이 초과되었습니다.'
      ),
    ])

    if (settingsResponse.error) {
      return { data: null, error: settingsResponse.error }
    }

    if (tierSettingsResponse.error) {
      return { data: null, error: tierSettingsResponse.error }
    }

    const activeMonths = (settingsResponse.data ?? []).map((item) =>
      normalizeYearMonth(`${item.year}-${item.month}`)
    )
    const tierOpenMonths = (tierSettingsResponse.data ?? []).map((item) =>
      normalizeYearMonth(item.year_month)
    )

    const yearMonth = resolveActiveReservationMonth({
      activeMonths,
      tierOpenMonths,
    })

    return {
      data: {
        yearMonth,
      },
      error: null,
    }
  } catch (error) {
    return {
      data: null,
      error: timeoutError(getErrorMessage(error, '활성 예약 월을 불러오는 중 오류가 발생했습니다.')),
    }
  }
}

export async function getAllDailyReservationLimitsForRegion(regionCode: string) {
  const regionId = await getRegionIdByCode(regionCode)
  if (!regionId) {
    return { data: null, error: { message: '존재하지 않는 지역입니다.' } }
  }

  const { data, error } = await supabaseAdmin
    .from('daily_reservation_limits')
    .select('*')
    .eq('region_id', regionId)
    .gt('max_reservations', 0)
    .order('date')

  return { data, error }
}

export async function getDailyReservationLimitForRegion(regionCode: string, date: string) {
  const regionId = await getRegionIdByCode(regionCode)
  if (!regionId) {
    return { data: null, error: { message: '존재하지 않는 지역입니다.' } }
  }

  try {
    const response = await runQueryWithTimeout(
      supabaseAdmin
        .from('daily_reservation_limits')
        .select('*')
        .eq('region_id', regionId)
        .eq('date', date),
      '일별 예약 제한을 불러오는 중 시간이 초과되었습니다.'
    )

    if (response.error) {
      return { data: null, error: response.error }
    }

    if (!response.data || response.data.length === 0) {
      return { data: null, error: null }
    }

    return { data: response.data[0], error: null }
  } catch (error) {
    return {
      data: null,
      error: timeoutError(getErrorMessage(error, '일별 예약 제한을 불러오는 중 오류가 발생했습니다.')),
    }
  }
}

export async function setDailyReservationLimitForRegion(
  regionCode: string,
  date: string,
  maxReservations: number
) {
  const regionId = await getRegionIdByCode(regionCode)
  if (!regionId) {
    return { data: null, error: { message: '존재하지 않는 지역입니다.' } }
  }

  const { data, error } = await supabaseAdmin
    .from('daily_reservation_limits')
    .upsert([{
      region_id: regionId,
      date,
      max_reservations: maxReservations,
      updated_at: new Date().toISOString(),
    }], {
      onConflict: 'region_id,date',
    })
    .select()

  return { data, error }
}

export async function removeDailyReservationLimitForRegion(regionCode: string, date: string) {
  const regionId = await getRegionIdByCode(regionCode)
  if (!regionId) {
    return { data: null, error: { message: '존재하지 않는 지역입니다.' } }
  }

  const { data, error } = await supabaseAdmin
    .from('daily_reservation_limits')
    .delete()
    .eq('region_id', regionId)
    .eq('date', date)

  return { data, error }
}

export async function addBlockedDateForRegion(
  regionCode: string,
  date: string,
  reason: string,
  startTime?: string | null,
  endTime?: string | null
) {
  const regionId = await getRegionIdByCode(regionCode)
  if (!regionId) {
    return { data: null, error: { message: '존재하지 않는 지역입니다.' } }
  }

  if ((startTime && !endTime) || (!startTime && endTime)) {
    return { data: null, error: { message: '시작 시간과 종료 시간을 모두 입력하거나 모두 비워야 합니다.' } }
  }

  if (startTime && endTime && startTime >= endTime) {
    return { data: null, error: { message: '종료 시간은 시작 시간보다 늦어야 합니다.' } }
  }

  const { data, error } = await supabaseAdmin
    .from('blocked_dates')
    .insert([{
      region_id: regionId,
      date,
      reason,
      start_time: startTime || null,
      end_time: endTime || null,
    }])
    .select()

  return { data, error }
}

export async function removeBlockedDateById(dateId: number) {
  const { data, error } = await supabaseAdmin
    .from('blocked_dates')
    .delete()
    .eq('id', dateId)

  return { data, error }
}

export async function getMonthReservationStatusForRegion(regionCode: string, year: number, month: number) {
  const regionId = await getRegionIdByCode(regionCode)
  if (!regionId) {
    return { data: null, error: { message: '존재하지 않는 지역입니다.' } }
  }

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  try {
    const [{ data: reservations, error: reservationError }, { data: settings, error: settingsError }, { data: dailyLimits, error: dailyLimitsError }] = await Promise.all([
      runQueryWithTimeout(
        supabaseAdmin
          .from('reservations')
          .select('date')
          .eq('region_id', regionId)
          .gte('date', startDate)
          .lte('date', endDate)
          .in('status', ['pending', 'approved', 'cancel_requested']),
        '월별 예약 현황을 불러오는 중 시간이 초과되었습니다.',
        LONG_QUERY_TIMEOUT_MS
      ),
      getReservationSettingsForRegionMonth(regionCode, year, month),
      runQueryWithTimeout(
        supabaseAdmin
          .from('daily_reservation_limits')
          .select('date, max_reservations')
          .eq('region_id', regionId)
          .gte('date', startDate)
          .lte('date', endDate),
        '일별 예약 제한을 불러오는 중 시간이 초과되었습니다.'
      ),
    ])

    if (reservationError) {
      return { data: null, error: reservationError }
    }

    if (settingsError) {
      return { data: null, error: settingsError }
    }

    if (dailyLimitsError) {
      return { data: null, error: dailyLimitsError }
    }

    const reservationCounts: Record<string, number> = {}
    reservations?.forEach((reservation) => {
      reservationCounts[reservation.date] = (reservationCounts[reservation.date] || 0) + 1
    })

    const defaultMaxReservations = settings?.max_reservations_per_day || 2
    const defaultIsOpen = settings?.is_open ?? false
    const dailyLimitMap: Record<string, number> = {}

    dailyLimits?.forEach((limit) => {
      dailyLimitMap[limit.date] = limit.max_reservations
    })

    const result: Record<string, {
      current_reservations: number
      max_reservations_per_day: number
      is_full: boolean
      available_slots: number
      is_open: boolean
    }> = {}

    for (let day = 1; day <= lastDay; day += 1) {
      const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const currentReservations = reservationCounts[dateString] || 0
      const hasDailyLimit = Object.prototype.hasOwnProperty.call(dailyLimitMap, dateString)
      const maxReservations = hasDailyLimit ? dailyLimitMap[dateString] : defaultMaxReservations
      const isOpen = hasDailyLimit ? maxReservations > 0 : defaultIsOpen

      result[dateString] = {
        current_reservations: currentReservations,
        max_reservations_per_day: maxReservations,
        is_full: maxReservations <= 0 ? true : currentReservations >= maxReservations,
        available_slots: Math.max(0, maxReservations - currentReservations),
        is_open: isOpen,
      }
    }

    return { data: result, error: null }
  } catch (error) {
    return {
      data: null,
      error: timeoutError(getErrorMessage(error, '월별 예약 현황을 불러오는 중 오류가 발생했습니다.')),
    }
  }
}

export async function getDateReservationStatusForRegion(regionCode: string, date: string) {
  const regionId = await getRegionIdByCode(regionCode)
  if (!regionId) {
    return { data: null, error: { message: '존재하지 않는 지역입니다.' } }
  }

  try {
    const { data: reservations, error: reservationError } = await runQueryWithTimeout(
      supabaseAdmin
        .from('reservations')
        .select('id')
        .eq('region_id', regionId)
        .eq('date', date)
        .in('status', ['pending', 'approved', 'cancel_requested']),
      '해당 날짜의 예약 현황을 불러오는 중 시간이 초과되었습니다.'
    )

    if (reservationError) {
      return { data: null, error: reservationError }
    }

    const currentReservations = reservations?.length || 0
    const { data: dailyLimit } = await getDailyReservationLimitForRegion(regionCode, date)
    let maxReservationsPerDay: number
    let isOpen: boolean

    if (dailyLimit) {
      maxReservationsPerDay = dailyLimit.max_reservations
      isOpen = dailyLimit.max_reservations > 0
    } else {
      const targetDate = new Date(date)
      const year = targetDate.getFullYear()
      const month = targetDate.getMonth() + 1
      const { data: settings } = await getReservationSettingsForRegionMonth(regionCode, year, month)

      maxReservationsPerDay = settings?.max_reservations_per_day || 2
      isOpen = settings?.is_open ?? false
    }

    return {
      data: {
        current_reservations: currentReservations,
        max_reservations_per_day: maxReservationsPerDay,
        is_full: maxReservationsPerDay <= 0 ? true : currentReservations >= maxReservationsPerDay,
        available_slots: Math.max(0, maxReservationsPerDay - currentReservations),
        is_open: isOpen,
      },
      error: null,
    }
  } catch (error) {
    return {
      data: null,
      error: timeoutError(getErrorMessage(error, '해당 날짜의 예약 현황을 불러오는 중 오류가 발생했습니다.')),
    }
  }
}

export async function getActiveTiersOnServer() {
  const { data, error } = await supabaseAdmin
    .from('member_tiers')
    .select('*')
    .eq('is_active', true)
    .order('tier_level')

  return { data, error }
}

export async function getTierReservationSettingsOnServer(regionCode: string, yearMonth: string) {
  const { data, error } = await supabaseAdmin
    .from('tier_reservation_settings')
    .select(`
      *,
      member_tiers!inner(tier_name, tier_level, advance_reservation_days)
    `)
    .eq('region_code', regionCode)
    .eq('year_month', yearMonth)
    .order('tier_id')

  return { data, error }
}

export async function updateTierReservationStatusOnServer(
  regionCode: string,
  yearMonth: string,
  tierId: number,
  isOpen: boolean,
  adminId: string
) {
  const normalizedYearMonth = normalizeYearMonth(yearMonth)
  if (!normalizedYearMonth) {
    return { data: null, error: { message: '잘못된 예약 월입니다.' } }
  }

  if (isOpen) {
    const activeMonthResult = await getActiveReservationMonthForRegion(regionCode)
    if (activeMonthResult.error) {
      return activeMonthResult
    }

    const currentActiveYearMonth = activeMonthResult.data?.yearMonth
    if (currentActiveYearMonth && currentActiveYearMonth !== normalizedYearMonth) {
      const closePreviousResult = await runQueryWithTimeout(
        supabaseAdmin
          .from('tier_reservation_settings')
          .update({ is_open: false })
          .eq('region_code', regionCode)
          .eq('year_month', currentActiveYearMonth),
        '이전 예약 월을 종료하는 중 시간이 초과되었습니다.'
      )

      if (closePreviousResult.error) {
        return { data: null, error: closePreviousResult.error }
      }

      const closeMonthSettingResult = await setReservationMonthOpenState(regionCode, currentActiveYearMonth, false)
      if (closeMonthSettingResult.error) {
        return closeMonthSettingResult
      }
    }

    const openMonthSettingResult = await setReservationMonthOpenState(regionCode, normalizedYearMonth, true)
    if (openMonthSettingResult.error) {
      return openMonthSettingResult
    }
  }

  const reservationStartDate = new Date().toISOString().split('T')[0]

  const { data, error } = await supabaseAdmin
    .from('tier_reservation_settings')
    .upsert([{
      region_code: regionCode,
      year_month: normalizedYearMonth,
      tier_id: tierId,
      is_open: isOpen,
      reservation_start_date: reservationStartDate,
      created_by: adminId,
    }], {
      onConflict: 'region_code,year_month,tier_id',
    })
    .select(`
      *,
      member_tiers!inner(tier_name, tier_level)
    `)

  if (error) {
    return { data, error }
  }

  if (!isOpen) {
    const remainingOpenSettings = await runQueryWithTimeout(
      supabaseAdmin
        .from('tier_reservation_settings')
        .select('tier_id')
        .eq('region_code', regionCode)
        .eq('year_month', normalizedYearMonth)
        .eq('is_open', true),
      '남아 있는 티어 예약 상태를 확인하는 중 시간이 초과되었습니다.'
    )

    if (remainingOpenSettings.error) {
      return { data: null, error: remainingOpenSettings.error }
    }

    if (!remainingOpenSettings.data || remainingOpenSettings.data.length === 0) {
      const closeMonthSettingResult = await setReservationMonthOpenState(regionCode, normalizedYearMonth, false)
      if (closeMonthSettingResult.error) {
        return closeMonthSettingResult
      }
    }
  }

  return { data, error: null }
}

function getReservationListQuery() {
  return supabaseAdmin
    .from('reservations')
    .select(`
      *,
      users!inner(
        id,
        organization_name,
        manager_name,
        phone,
        email,
        cities!inner(name, regions!inner(name, code))
      ),
      reservation_slots(
        id,
        start_time,
        end_time,
        grade,
        participant_count,
        location,
        slot_order
      ),
      regions!inner(name, code)
    `)
}

export async function getReservationsForAdmin(
  adminRole: string,
  requestedRegionCode: string | null,
  scope: ReservationScope,
  date?: string | null
) {
  const regionScope = resolveReservationRegionScope(adminRole, requestedRegionCode)
  if (regionScope.error) {
    return { data: null, error: regionScope.error }
  }

  let query = getReservationListQuery()
  const statuses = getReservationStatusesForScope(scope)

  if (statuses) {
    query = query.in('status', statuses)
  }

  if (regionScope.regionCode) {
    query = query.eq('users.cities.regions.code', regionScope.regionCode)
  }

  if (date) {
    query = query.eq('date', date)
  }

  try {
    const { data, error } = await runQueryWithTimeout(
      query.order('created_at', { ascending: scope === 'active' && !!date }),
      '예약 목록을 불러오는 중 시간이 초과되었습니다.',
      LONG_QUERY_TIMEOUT_MS
    )

    return { data, error }
  } catch (error) {
    return {
      data: null,
      error: timeoutError(getErrorMessage(error, '예약 목록을 불러오는 중 오류가 발생했습니다.')),
    }
  }
}

async function getReservationRegionScope(reservationId: string) {
  const { data, error } = await runQueryWithTimeout(
    supabaseAdmin
      .from('reservations')
      .select('id, user_id, status, regions(code)')
      .eq('id', reservationId)
      .single(),
    '예약 정보를 확인하는 중 시간이 초과되었습니다.'
  )

  if (error || !data) {
    return { data: null, error: error || { message: '예약 정보를 찾을 수 없습니다.' } }
  }

  const region = Array.isArray(data.regions) ? data.regions[0] : data.regions
  return {
    data: {
      id: data.id,
      userId: data.user_id,
      status: data.status,
      regionCode: region?.code || null,
    },
    error: null,
  }
}

function canManageReservation(adminRole: string, regionCode: string | null) {
  const scope = resolveReservationRegionScope(adminRole, regionCode)
  return !scope.error
}

export async function updateReservationStatusOnServer(
  adminRole: string,
  reservationId: string,
  status: 'approved' | 'rejected' | 'cancelled'
) {
  const reservation = await getReservationRegionScope(reservationId)
  if (reservation.error || !reservation.data) {
    return { data: null, error: reservation.error }
  }

  if (!canManageReservation(adminRole, reservation.data.regionCode)) {
    return { data: null, error: { message: '해당 지역 예약을 관리할 권한이 없습니다.' } }
  }

  const { data, error } = await supabaseAdmin
    .from('reservations')
    .update({ status })
    .eq('id', reservationId)
    .select()

  return { data, error }
}

// 알림톡 발송 직전 최신 연락처를 조회 (클라이언트에 캐시된 값을 신뢰하지 않기 위함)
export async function getReservationContactPhoneOnServer(reservationId: string): Promise<{
  phone: string | null
  error: { message: string } | null
}> {
  try {
    const { data, error } = await runQueryWithTimeout(
      supabaseAdmin
        .from('reservations')
        .select('users!inner(phone)')
        .eq('id', reservationId)
        .single(),
      '예약자 연락처를 불러오는 중 시간이 초과되었습니다.'
    )

    if (error || !data) {
      return { phone: null, error: timeoutError(getErrorMessage(error, '예약자 연락처를 찾을 수 없습니다.')) }
    }

    const phone = (data.users as { phone: string | null } | null)?.phone ?? null
    return { phone, error: null }
  } catch (error) {
    return { phone: null, error: timeoutError(getErrorMessage(error, '예약자 연락처를 불러오는 중 오류가 발생했습니다.')) }
  }
}

export async function deleteReservationOnServer(adminRole: string, reservationId: string) {
  const reservation = await getReservationRegionScope(reservationId)
  if (reservation.error || !reservation.data) {
    return { data: null, error: reservation.error }
  }

  if (!canManageReservation(adminRole, reservation.data.regionCode)) {
    return { data: null, error: { message: '해당 지역 예약을 관리할 권한이 없습니다.' } }
  }

  const { data, error } = await supabaseAdmin
    .from('reservations')
    .delete()
    .eq('id', reservationId)
    .select()

  return { data, error }
}

export async function forceCancelReservationOnServer(adminRole: string, reservationId: string) {
  const reservation = await getReservationRegionScope(reservationId)
  if (reservation.error || !reservation.data) {
    return { data: null, error: reservation.error }
  }

  if (!canManageReservation(adminRole, reservation.data.regionCode)) {
    return { data: null, error: { message: '해당 지역 예약을 관리할 권한이 없습니다.' } }
  }

  const { error: updateError } = await supabaseAdmin
    .from('reservations')
    .update({ status: 'cancelled' })
    .eq('id', reservationId)

  if (updateError) {
    return { data: null, error: updateError }
  }

  const { data, error } = await getReservationListQuery()
    .eq('id', reservationId)
    .single()

  return { data, error }
}

export async function getUserReservationsOnServer(userId: string) {
  try {
    const { data, error } = await runQueryWithTimeout(
      supabaseAdmin
        .from('reservations')
        .select(`
          *,
          reservation_slots(*)
        `)
        .eq('user_id', userId)
        .order('date', { ascending: false }),
      '내 예약 목록을 불러오는 중 시간이 초과되었습니다.',
      LONG_QUERY_TIMEOUT_MS
    )

    return { data, error }
  } catch (error) {
    return {
      data: null,
      error: timeoutError(getErrorMessage(error, '내 예약 목록을 불러오는 중 오류가 발생했습니다.')),
    }
  }
}

export async function deleteUserReservationOnServer(userId: string, reservationId: string) {
  const reservation = await getReservationRegionScope(reservationId)
  if (reservation.error || !reservation.data) {
    return { data: null, error: reservation.error }
  }

  if (reservation.data.userId !== userId) {
    return { data: null, error: { message: '본인의 예약만 취소할 수 있습니다.' } }
  }

  if (reservation.data.status !== 'pending') {
    return { data: null, error: { message: '승인 대기 상태의 예약만 즉시 취소할 수 있습니다.' } }
  }

  const { data, error } = await supabaseAdmin
    .from('reservations')
    .delete()
    .eq('id', reservationId)
    .eq('user_id', userId)
    .select()

  return { data, error }
}

export async function requestReservationCancellationOnServer(userId: string, reservationId: string) {
  const reservation = await getReservationRegionScope(reservationId)
  if (reservation.error || !reservation.data) {
    return { data: null, error: reservation.error }
  }

  if (reservation.data.userId !== userId) {
    return { data: null, error: { message: '본인의 예약만 취소 요청할 수 있습니다.' } }
  }

  const { data, error } = await supabaseAdmin
    .from('reservations')
    .update({ status: 'cancel_requested' })
    .eq('id', reservationId)
    .eq('user_id', userId)
    .select()

  return { data, error }
}

export async function getReservationsByDateOnServer(regionCode: ReservationRegionCode | '', date: string) {
  let query = getReservationListQuery()
    .eq('date', date)
    .in('status', ['pending', 'approved', 'cancel_requested'])

  if (regionCode) {
    query = query.eq('users.cities.regions.code', regionCode)
  }

  const { data, error } = await query.order('created_at', { ascending: true })
  return { data, error }
}
