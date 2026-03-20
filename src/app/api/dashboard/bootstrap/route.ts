import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { validateApiRequest } from '@/lib/auth'
import { getErrorMessage, withTimeout } from '@/lib/requestUtils'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false
  }
})

const DASHBOARD_BOOTSTRAP_TIMEOUT_MS = 12000
const DASHBOARD_SHARED_CACHE_TTL_MS = 15 * 1000

type SharedDashboardCacheEntry = {
  cachedAt: number
  data: {
    user: {
      tier: string
      region_code: string
      region_name: string
    }
    remainingDays: number
    reservationStatus: Record<string, {
      current_reservations: number
      max_reservations_per_day: number
      is_full: boolean
      available_slots: number
      is_open: boolean
    }>
    blockedDates: Array<{
      date: string
      start_time: string | null
      end_time: string | null
      reason: string | null
      id: string
    }>
  }
}

const dashboardSharedCache = new Map<string, SharedDashboardCacheEntry>()

export async function GET(request: NextRequest) {
  try {
    const authResult = await validateApiRequest(request)
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 401 })
    }

    if (authResult.user.role !== 'user') {
      return NextResponse.json({ error: '일반 사용자만 접근할 수 있습니다.' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const year = Number(searchParams.get('year'))
    const month = Number(searchParams.get('month'))

    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: '잘못된 연도 또는 월입니다.' }, { status: 400 })
    }

    const userId = authResult.user.id
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const userResponse = await withTimeout(
      supabaseAdmin
        .from('users')
        .select(`
          id,
          organization_name,
          tier,
          cities!inner(
            name,
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
      return NextResponse.json(
        { error: userResponse.error?.message || '사용자 정보를 불러오지 못했습니다.' },
        { status: 400 }
      )
    }

    const region = Array.isArray(userResponse.data.cities?.regions)
      ? userResponse.data.cities.regions[0]
      : userResponse.data.cities?.regions

    if (!region?.id || !region.code) {
      return NextResponse.json({ error: '사용자 지역 정보를 찾을 수 없습니다.' }, { status: 400 })
    }

    const regionId = region.id

    const cacheKey = `${regionId}:${year}:${month}`
    const cachedSharedData = dashboardSharedCache.get(cacheKey)
    const isSharedCacheFresh = cachedSharedData && (Date.now() - cachedSharedData.cachedAt) < DASHBOARD_SHARED_CACHE_TTL_MS

    const [sharedDataResult, reservationSummaryResponse] = await withTimeout(
      Promise.all([
        isSharedCacheFresh
          ? Promise.resolve({ data: cachedSharedData.data, error: null })
          : Promise.all([
              supabaseAdmin
                .from('reservations')
                .select('date')
                .eq('region_id', regionId)
                .gte('date', startDate)
                .lte('date', endDate)
                .in('status', ['pending', 'approved', 'cancel_requested']),
              supabaseAdmin
                .from('reservation_settings')
                .select('*')
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
              },
              error: null
            })),
        supabaseAdmin
          .from('reservations')
          .select('date')
          .eq('user_id', userId)
          .gte('date', startDate)
          .lte('date', endDate)
          .in('status', ['pending', 'approved', 'cancel_requested'])
      ]),
      DASHBOARD_BOOTSTRAP_TIMEOUT_MS,
      '대시보드 데이터를 불러오는 중 시간이 초과되었습니다.'
    )

    let sharedData: SharedDashboardCacheEntry['data']

    if (isSharedCacheFresh && cachedSharedData) {
      sharedData = cachedSharedData.data
    } else {
      const {
        reservationsResponse,
        settingsResponse,
        dailyLimitsResponse,
        blockedDatesResponse
      } = sharedDataResult.data

      if (reservationsResponse.error) {
        return NextResponse.json({ error: reservationsResponse.error.message }, { status: 400 })
      }

      if (settingsResponse.error) {
        return NextResponse.json({ error: settingsResponse.error.message }, { status: 400 })
      }

      if (dailyLimitsResponse.error) {
        return NextResponse.json({ error: dailyLimitsResponse.error.message }, { status: 400 })
      }

      if (blockedDatesResponse.error) {
        return NextResponse.json({ error: blockedDatesResponse.error.message }, { status: 400 })
      }

      const reservationCounts: Record<string, number> = {}
      reservationsResponse.data?.forEach(reservation => {
        reservationCounts[reservation.date] = (reservationCounts[reservation.date] || 0) + 1
      })

      const defaultMaxReservations = settingsResponse.data?.max_reservations_per_day || 2
      const defaultIsOpen = settingsResponse.data?.is_open ?? false
      const dailyLimitMap: Record<string, number> = {}

      dailyLimitsResponse.data?.forEach(limit => {
        dailyLimitMap[limit.date] = limit.max_reservations
      })

      const monthStatus: Record<string, {
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

        monthStatus[dateString] = {
          current_reservations: currentReservations,
          max_reservations_per_day: maxReservations,
          is_full: maxReservations <= 0 ? true : currentReservations >= maxReservations,
          available_slots: Math.max(0, maxReservations - currentReservations),
          is_open: isOpen
        }
      }

      sharedData = {
        user: {
          tier: userResponse.data.tier || 'Standard',
          region_code: region.code,
          region_name: region.name
        },
        remainingDays: 4,
        reservationStatus: monthStatus,
        blockedDates: blockedDatesResponse.data || []
      }

      dashboardSharedCache.set(cacheKey, {
        cachedAt: Date.now(),
        data: sharedData
      })
    }

    if (reservationSummaryResponse.error) {
      return NextResponse.json({ error: reservationSummaryResponse.error.message }, { status: 400 })
    }

    const usedReservationDays = new Set((reservationSummaryResponse.data || []).map(item => item.date)).size
    const remainingDays = Math.max(0, 4 - usedReservationDays)

    return NextResponse.json({
      data: {
        user: {
          organization_name: userResponse.data.organization_name,
          tier: sharedData.user.tier,
          region_code: sharedData.user.region_code,
          region_name: sharedData.user.region_name
        },
        remainingDays,
        reservationStatus: sharedData.reservationStatus,
        blockedDates: sharedData.blockedDates
      }
    })
  } catch (error) {
    console.error('대시보드 bootstrap API 오류:', error)
    return NextResponse.json(
      { error: getErrorMessage(error, '대시보드 정보를 불러오지 못했습니다.') },
      { status: 500 }
    )
  }
}
