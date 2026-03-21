import { createClient } from '@supabase/supabase-js'

import type { AuthResult } from '@/lib/auth'
import { Database } from '@/types/database'
import { withTimeout } from '@/lib/requestUtils'
import {
  buildDashboardCalendarData,
  buildDashboardMeData,
  calculateRemainingReservationDays,
  getDashboardCalendarSharedCacheKey,
  getDashboardBootstrapUserMetaCacheKey,
  getDashboardBootstrapUserSummaryCacheKey,
  pruneExpiredDashboardCacheEntries,
  type DashboardBlockedDate,
  type DashboardCalendarData,
  type DashboardMeData,
  type DashboardReservationStatus,
  type DashboardBootstrapUser,
  type TimestampedCacheEntry,
} from '@/lib/dashboardBootstrap'
import { buildDashboardUserMetaContextFromAuthUser } from '@/lib/dashboardUserContext'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false
  }
})

const DASHBOARD_BOOTSTRAP_TIMEOUT_MS = 12000
const DASHBOARD_CALENDAR_CACHE_TTL_MS = 15 * 1000
const DASHBOARD_CALENDAR_CACHE_MAX_ENTRIES = 120
const DASHBOARD_USER_META_CACHE_TTL_MS = 30 * 1000
const DASHBOARD_USER_META_CACHE_MAX_ENTRIES = 500
const DASHBOARD_USER_SUMMARY_CACHE_TTL_MS = 5 * 1000
const DASHBOARD_USER_SUMMARY_CACHE_MAX_ENTRIES = 1000

type DashboardUserMetaContext = {
  userMeta: DashboardBootstrapUser
  regionId: number
  userTierId: number
  yearMonth: string
}

type SharedDashboardQueryData = {
  reservationsResponse: {
    data: Array<{ date: string }> | null
    error: { message: string } | null
  }
  settingsResponse: {
    data: { max_reservations_per_day?: number | null } | null
    error: { message: string } | null
  }
  dailyLimitsResponse: {
    data: Array<{ date: string; max_reservations: number }> | null
    error: { message: string } | null
  }
  blockedDatesResponse: {
    data: DashboardBlockedDate[] | null
    error: { message: string } | null
  }
}

const dashboardCalendarCache = new Map<string, TimestampedCacheEntry<DashboardCalendarData>>()
const dashboardUserMetaCache = new Map<string, TimestampedCacheEntry<DashboardUserMetaContext>>()
const dashboardUserSummaryCache = new Map<string, TimestampedCacheEntry<Array<{ date: string }>>>()

function pruneDashboardCaches(now: number): void {
  pruneExpiredDashboardCacheEntries(
    dashboardUserMetaCache,
    now,
    DASHBOARD_USER_META_CACHE_TTL_MS,
    DASHBOARD_USER_META_CACHE_MAX_ENTRIES
  )
  pruneExpiredDashboardCacheEntries(
    dashboardUserSummaryCache,
    now,
    DASHBOARD_USER_SUMMARY_CACHE_TTL_MS,
    DASHBOARD_USER_SUMMARY_CACHE_MAX_ENTRIES
  )
  pruneExpiredDashboardCacheEntries(
    dashboardCalendarCache,
    now,
    DASHBOARD_CALENDAR_CACHE_TTL_MS,
    DASHBOARD_CALENDAR_CACHE_MAX_ENTRIES
  )
}

export async function getDashboardUserMetaContext(
  userId: string,
  year: number,
  month: number,
  authUser?: AuthResult['user']
): Promise<{ data: DashboardUserMetaContext | null; error: string | null }> {
  const now = Date.now()
  pruneDashboardCaches(now)

  const authUserContext = buildDashboardUserMetaContextFromAuthUser(authUser, year, month)
  if (authUserContext) {
    return { data: authUserContext, error: null }
  }

  const userMetaCacheKey = getDashboardBootstrapUserMetaCacheKey(userId, year, month)
  const cachedUserMeta = dashboardUserMetaCache.get(userMetaCacheKey)
  if (cachedUserMeta && (now - cachedUserMeta.cachedAt) < DASHBOARD_USER_META_CACHE_TTL_MS) {
    return { data: cachedUserMeta.data, error: null }
  }

  const userResponse = await withTimeout(
    supabaseAdmin
      .from('users')
      .select(`
        id,
        organization_name,
        tier,
        cities!inner(
          regions!inner(
            id,
            code,
            name
          )
        )
      `)
      .eq('id', userId)
      .single(),
    DASHBOARD_BOOTSTRAP_TIMEOUT_MS,
    '대시보드 정보를 불러오는 중 시간이 초과되었습니다.'
  )

  if (userResponse.error || !userResponse.data) {
    return {
      data: null,
      error: userResponse.error?.message || '사용자 정보를 불러오지 못했습니다.'
    }
  }

  const region = Array.isArray(userResponse.data.cities?.regions)
    ? userResponse.data.cities.regions[0]
    : userResponse.data.cities?.regions

  if (!region?.id || !region.code) {
    return { data: null, error: '사용자 지역 정보를 찾을 수 없습니다.' }
  }

  const data: DashboardUserMetaContext = {
    userMeta: {
      organization_name: userResponse.data.organization_name,
      tier: userResponse.data.tier || 'Standard',
      region_code: region.code,
      region_name: region.name
    },
    regionId: region.id,
    userTierId: userResponse.data.tier === 'Priority' ? 1 : 2,
    yearMonth: `${year}-${String(month).padStart(2, '0')}`
  }

  dashboardUserMetaCache.set(userMetaCacheKey, {
    cachedAt: now,
    data
  })

  return { data, error: null }
}

export async function getDashboardTierOpenState(
  regionCode: string,
  tierId: number,
  yearMonth: string
): Promise<{ data: boolean | null; error: string | null }> {
  const tierSettingResponse = await withTimeout(
    supabaseAdmin
      .from('tier_reservation_settings')
      .select('is_open')
      .eq('region_code', regionCode)
      .eq('year_month', yearMonth)
      .eq('tier_id', tierId)
      .maybeSingle(),
    DASHBOARD_BOOTSTRAP_TIMEOUT_MS,
    '티어별 예약 상태를 불러오는 중 시간이 초과되었습니다.'
  )

  if (tierSettingResponse.error) {
    return { data: null, error: tierSettingResponse.error.message }
  }

  return { data: tierSettingResponse.data?.is_open ?? false, error: null }
}

export async function getDashboardCalendarDataForMonth(
  regionId: number,
  tierId: number,
  year: number,
  month: number,
  isTierOpen: boolean,
  options?: {
    bypassCache?: boolean
  }
): Promise<{ data: DashboardCalendarData | null; error: string | null }> {
  const now = Date.now()
  pruneDashboardCaches(now)

  const cacheKey = getDashboardCalendarSharedCacheKey(regionId, tierId, year, month)
  const cachedCalendarData = dashboardCalendarCache.get(cacheKey)
  if (!options?.bypassCache && cachedCalendarData && (now - cachedCalendarData.cachedAt) < DASHBOARD_CALENDAR_CACHE_TTL_MS) {
    return { data: cachedCalendarData.data, error: null }
  }

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const sharedDataResult = await withTimeout(
    Promise.all([
      supabaseAdmin
        .from('reservations')
        .select('date')
        .eq('region_id', regionId)
        .gte('date', startDate)
        .lte('date', endDate)
        .in('status', ['pending', 'approved', 'cancel_requested']),
      supabaseAdmin
        .from('reservation_settings')
        .select('max_reservations_per_day')
        .eq('region_id', regionId)
        .eq('year', year)
        .eq('month', month)
        .maybeSingle(),
      supabaseAdmin
        .from('daily_reservation_limits')
        .select('date, max_reservations')
        .eq('region_id', regionId)
        .gte('date', startDate)
        .lte('date', endDate),
      supabaseAdmin
        .from('blocked_dates')
        .select('date, start_time, end_time, reason, id')
        .eq('region_id', regionId)
    ]).then(([reservationsResponse, settingsResponse, dailyLimitsResponse, blockedDatesResponse]) => ({
      data: {
        reservationsResponse,
        settingsResponse,
        dailyLimitsResponse,
        blockedDatesResponse
      } satisfies SharedDashboardQueryData,
      error: null
    })),
    DASHBOARD_BOOTSTRAP_TIMEOUT_MS,
    '대시보드 달력 데이터를 불러오는 중 시간이 초과되었습니다.'
  )

  const {
    reservationsResponse,
    settingsResponse,
    dailyLimitsResponse,
    blockedDatesResponse
  } = sharedDataResult.data

  if (reservationsResponse.error) {
    return { data: null, error: reservationsResponse.error.message }
  }

  if (settingsResponse.error) {
    return { data: null, error: settingsResponse.error.message }
  }

  if (dailyLimitsResponse.error) {
    return { data: null, error: dailyLimitsResponse.error.message }
  }

  if (blockedDatesResponse.error) {
    return { data: null, error: blockedDatesResponse.error.message }
  }

  const reservationCounts: Record<string, number> = {}
  reservationsResponse.data?.forEach((reservation: { date: string }) => {
    reservationCounts[reservation.date] = (reservationCounts[reservation.date] || 0) + 1
  })

  const defaultMaxReservations = settingsResponse.data?.max_reservations_per_day || 2
  const dailyLimitMap: Record<string, number> = {}

  dailyLimitsResponse.data?.forEach((limit: { date: string; max_reservations: number }) => {
    dailyLimitMap[limit.date] = limit.max_reservations
  })

  const monthStatus: DashboardReservationStatus = {}
  for (let day = 1; day <= lastDay; day += 1) {
    const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const currentReservations = reservationCounts[dateString] || 0
    const hasDailyLimit = Object.prototype.hasOwnProperty.call(dailyLimitMap, dateString)
    const maxReservations = hasDailyLimit ? dailyLimitMap[dateString] : defaultMaxReservations

    monthStatus[dateString] = {
      current_reservations: currentReservations,
      max_reservations_per_day: maxReservations,
      is_full: maxReservations <= 0 ? true : currentReservations >= maxReservations,
      available_slots: Math.max(0, maxReservations - currentReservations),
      is_open: maxReservations > 0
    }
  }

  const calendarData = buildDashboardCalendarData(
    monthStatus,
    blockedDatesResponse.data || [],
    isTierOpen
  )

  dashboardCalendarCache.set(cacheKey, {
    cachedAt: now,
    data: calendarData
  })

  return { data: calendarData, error: null }
}

export async function getDashboardMeDataForMonth(
  userId: string,
  userMeta: DashboardBootstrapUser,
  year: number,
  month: number,
  options?: {
    bypassCache?: boolean
  }
): Promise<{ data: DashboardMeData | null; error: string | null }> {
  const now = Date.now()
  pruneDashboardCaches(now)

  const userSummaryCacheKey = getDashboardBootstrapUserSummaryCacheKey(userId, year, month)
  const cachedUserSummary = dashboardUserSummaryCache.get(userSummaryCacheKey)
  let reservations = options?.bypassCache ? null : (cachedUserSummary?.data || null)

  if (
    options?.bypassCache ||
    !cachedUserSummary ||
    (now - cachedUserSummary.cachedAt) >= DASHBOARD_USER_SUMMARY_CACHE_TTL_MS
  ) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const reservationSummaryResult = await withTimeout(
      supabaseAdmin
        .from('reservations')
        .select('date')
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate)
        .in('status', ['pending', 'approved', 'cancel_requested']),
      DASHBOARD_BOOTSTRAP_TIMEOUT_MS,
      '내 예약 정보를 불러오는 중 시간이 초과되었습니다.'
    )

    if (reservationSummaryResult.error) {
      return { data: null, error: reservationSummaryResult.error.message }
    }

    reservations = reservationSummaryResult.data || []
    dashboardUserSummaryCache.set(userSummaryCacheKey, {
      cachedAt: now,
      data: reservations
    })
  }

  return {
    data: buildDashboardMeData(
      userMeta,
      calculateRemainingReservationDays(reservations || [], 4)
    ),
    error: null
  }
}
