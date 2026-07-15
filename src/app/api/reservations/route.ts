import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { validateUserApiRequest } from '@/lib/auth'
import { getErrorMessage, withTimeout } from '@/lib/requestUtils'
import { isReservationTimeoutError } from '@/lib/reservationError'
import { getActiveReservationMonthForRegion } from '@/lib/reservationSettingsServer'
import {
  getTierIdFromName,
  getTierReservationWindowKey,
  shouldFallbackAfterRpcFailure,
} from './routeHelpers'
import {
  classifyReservationOutcome,
  createReservationLogPayload,
} from '@/lib/reservationLogging'
import {
  isReservationStartTimeAllowed,
  RESERVATION_MAX_START_TIME,
  RESERVATION_MIN_START_TIME,
} from '@/lib/reservationTimePolicy'
import { formatYearMonthLabel } from '@/lib/penalty'
import { getUserPenaltyStatus } from '@/lib/penaltyServer'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false
  }
})

const RESERVATION_ROUTE_TIMEOUT_MS = 10000
const RESERVATION_BUSY_MESSAGE = '신청이 몰려 예약을 처리 중입니다. 잠시 후 다시 시도해주세요.'

function logReservationInfo(payload: ReturnType<typeof createReservationLogPayload>) {
  console.info('[reservation]', JSON.stringify(payload))
}

function logReservationWarn(payload: ReturnType<typeof createReservationLogPayload>) {
  console.warn('[reservation]', JSON.stringify(payload))
}

function logReservationError(payload: ReturnType<typeof createReservationLogPayload>) {
  console.error('[reservation]', JSON.stringify(payload))
}

interface ReservationSlotPayload {
  start_time: string
  end_time: string
  grade: string
  participant_count: number
  location: string
  slot_order: number
}

interface ReservationRequestBody {
  regionId: number
  date: string
  slots: ReservationSlotPayload[]
}

async function fallbackCreateReservation(
  userId: string,
  regionId: number,
  date: string,
  slots: ReservationSlotPayload[]
) {
  const targetDate = new Date(date)
  const year = targetDate.getFullYear()
  const month = targetDate.getMonth() + 1
  const lastDayOfMonth = new Date(year, month, 0).getDate()
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`

  const [{ data: settings }, { data: reservations, error: reservationsError }, { data: blockedDates, error: blockedDatesError }] = await Promise.all([
    supabaseAdmin
      .from('reservation_settings')
      .select('*')
      .eq('region_id', regionId)
      .eq('year', year)
      .eq('month', month)
      .maybeSingle(),
    supabaseAdmin
      .from('reservations')
      .select('date')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .in('status', ['pending', 'approved', 'cancel_requested']),
    supabaseAdmin
      .from('blocked_dates')
      .select('*')
      .eq('region_id', regionId)
      .eq('date', date)
  ])

  if (reservationsError) {
    throw reservationsError
  }

  if (blockedDatesError) {
    throw blockedDatesError
  }

  const existingReservationOnDate = reservations?.find(reservation => reservation.date === date)
  if (existingReservationOnDate) {
    return { status: 409, body: { error: '이미 해당 날짜에 예약이 존재합니다. 같은 날짜에 중복 예약은 불가능합니다.' } }
  }

  const uniqueDatesThisMonth = new Set((reservations || []).map(reservation => reservation.date))
  const maxDaysPerMonth = settings?.max_days_per_month || 4
  if (uniqueDatesThisMonth.size >= maxDaysPerMonth) {
    return { status: 409, body: { error: `월 예약 한도를 초과했습니다. (${uniqueDatesThisMonth.size}/${maxDaysPerMonth}일)` } }
  }

  for (const blocked of blockedDates || []) {
    if (!blocked.start_time || !blocked.end_time) {
      return { status: 409, body: { error: `${date}은(는) 예약이 차단된 날짜입니다. 사유: ${blocked.reason || '관리자 설정'}` } }
    }

    for (const slot of slots) {
      if (slot.start_time < blocked.end_time && slot.end_time > blocked.start_time) {
        return {
          status: 409,
          body: {
            error: `${date} ${blocked.start_time}~${blocked.end_time}는 예약이 차단된 시간대입니다. 사유: ${blocked.reason || '관리자 설정'}`
          }
        }
      }
    }
  }

  const { data: reservation, error: reservationError } = await supabaseAdmin
    .from('reservations')
    .insert([{
      user_id: userId,
      region_id: regionId,
      date,
      status: 'pending'
    }])
    .select()
    .single()

  if (reservationError) {
    const isCapacityError = reservationError.message?.includes('예약이 마감되었습니다') ||
      reservationError.message?.includes('신청이 몰려 예약을 처리 중입니다') ||
      reservationError.code === 'P0001' ||
      reservationError.code === '23505'

    return {
      status: isCapacityError ? 409 : 400,
      body: {
        error: reservationError.message?.includes('신청이 몰려 예약을 처리 중입니다')
          ? RESERVATION_BUSY_MESSAGE
          : isCapacityError
            ? '예약이 마감되었습니다. 다른 날짜를 선택해주세요.'
            : reservationError.message
      }
    }
  }

  const { data: createdSlots, error: slotsError } = await supabaseAdmin
    .from('reservation_slots')
    .insert(slots.map(slot => ({
      ...slot,
      reservation_id: reservation.id
    })))
    .select()

  if (slotsError) {
    await supabaseAdmin
      .from('reservations')
      .delete()
      .eq('id', reservation.id)

    return { status: 400, body: { error: slotsError.message || '예약 시간 저장에 실패했습니다.' } }
  }

  return {
    status: 200,
    body: {
      data: {
        ...reservation,
        reservation_slots: createdSlots || []
      }
    }
  }
}

export async function POST(request: NextRequest) {
  const requestStartedAt = Date.now()
  try {
    const authResult = await validateUserApiRequest(request)
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as ReservationRequestBody
    const slots = Array.isArray(body.slots) ? body.slots : []

    if (!body.regionId || !body.date || slots.length === 0) {
      return NextResponse.json({ error: '예약 요청 정보가 올바르지 않습니다.' }, { status: 400 })
    }

    if (body.regionId !== 1 && body.regionId !== 2) {
      return NextResponse.json({ error: '잘못된 지역 정보입니다.' }, { status: 400 })
    }

    // 퇴장(신청 제한) 회원 차단 — 제한월(KST 기준 현재 월) 동안 모든 신청 불가
    const penaltyResult = await getUserPenaltyStatus(authResult.user.id)
    if (penaltyResult.data?.restricted) {
      const restrictedLabel = formatYearMonthLabel(penaltyResult.data.restrictedMonth || '')
      const resumeLabel = formatYearMonthLabel(penaltyResult.data.resumeMonth || '')
      return NextResponse.json(
        { error: `퇴장 조치로 인해 ${restrictedLabel} 신청이 제한되었습니다. ${resumeLabel}부터 신청이 가능합니다.` },
        { status: 403 }
      )
    }

    const startTimes = slots.map(slot => slot.start_time)
    if (new Set(startTimes).size !== startTimes.length) {
      return NextResponse.json({ error: '시작 시간이 중복됩니다. 각 타임의 시작 시간은 서로 달라야 합니다.' }, { status: 400 })
    }

    if (startTimes.some(startTime => !isReservationStartTimeAllowed(startTime))) {
      return NextResponse.json(
        { error: `예약 시작 시간은 ${RESERVATION_MIN_START_TIME}부터 ${RESERVATION_MAX_START_TIME}까지 선택할 수 있습니다.` },
        { status: 400 }
      )
    }

    const userTierResponse = await withTimeout(
      supabaseAdmin
        .from('users')
        .select('tier')
        .eq('id', authResult.user.id)
        .single(),
      RESERVATION_ROUTE_TIMEOUT_MS,
      '예약 요청 처리 시간이 초과되었습니다.'
    )

    if (userTierResponse.error || !userTierResponse.data) {
      return NextResponse.json(
        { error: userTierResponse.error?.message || '사용자 티어 정보를 불러오지 못했습니다.' },
        { status: 400 }
      )
    }

    const regionCode = body.regionId === 2 ? 'north' : 'south'
    const targetYearMonth = getTierReservationWindowKey(body.date)
    const activeMonthResult = await getActiveReservationMonthForRegion(regionCode)
    if (activeMonthResult.error) {
      return NextResponse.json({ error: activeMonthResult.error.message }, { status: 400 })
    }

    if (activeMonthResult.data?.yearMonth !== targetYearMonth) {
      logReservationWarn(createReservationLogPayload({
        phase: 'request',
        outcome: 'tier_closed',
        userId: authResult.user.id,
        regionId: body.regionId,
        date: body.date,
        slotCount: slots.length,
        durationMs: Date.now() - requestStartedAt,
        message: '신청기간이 아닙니다. 공지사항의 신청기간을 확인해주세요.',
      }))
      return NextResponse.json(
        { error: '신청기간이 아닙니다. 공지사항의 신청기간을 확인해주세요.' },
        { status: 409 }
      )
    }

    const tierSettingResponse = await withTimeout(
      supabaseAdmin
        .from('tier_reservation_settings')
        .select('is_open')
        .eq('region_code', regionCode)
        .eq('year_month', targetYearMonth)
        .eq('tier_id', getTierIdFromName(userTierResponse.data.tier))
        .maybeSingle(),
      RESERVATION_ROUTE_TIMEOUT_MS,
      '예약 요청 처리 시간이 초과되었습니다.'
    )

    if (tierSettingResponse.error) {
      return NextResponse.json({ error: tierSettingResponse.error.message }, { status: 400 })
    }

    if (!tierSettingResponse.data?.is_open) {
      logReservationWarn(createReservationLogPayload({
        phase: 'request',
        outcome: 'tier_closed',
        userId: authResult.user.id,
        regionId: body.regionId,
        date: body.date,
        slotCount: slots.length,
        durationMs: Date.now() - requestStartedAt,
        message: '신청기간이 아닙니다. 공지사항의 신청기간을 확인해주세요.',
      }))
      return NextResponse.json(
        { error: '신청기간이 아닙니다. 공지사항의 신청기간을 확인해주세요.' },
        { status: 409 }
      )
    }

    try {
      const rpcResponse = await withTimeout(
        (supabaseAdmin as any).rpc('create_reservation_atomic', {
          p_user_id: authResult.user.id,
          p_region_id: body.regionId,
          p_date: body.date,
          p_slots: slots
        }),
        RESERVATION_ROUTE_TIMEOUT_MS,
        '예약 요청 처리 시간이 초과되었습니다.'
      ) as { data: any; error: any }

      if (!rpcResponse.error && rpcResponse.data?.success) {
        logReservationInfo(createReservationLogPayload({
          phase: 'rpc',
          outcome: 'success',
          userId: authResult.user.id,
          regionId: body.regionId,
          date: body.date,
          slotCount: slots.length,
          durationMs: Date.now() - requestStartedAt,
        }))
        return NextResponse.json({ data: rpcResponse.data.reservation })
      }

      if (!rpcResponse.error && rpcResponse.data && rpcResponse.data.success === false) {
        logReservationWarn(createReservationLogPayload({
          phase: 'rpc',
          outcome: classifyReservationOutcome(rpcResponse.data.message),
          userId: authResult.user.id,
          regionId: body.regionId,
          date: body.date,
          slotCount: slots.length,
          durationMs: Date.now() - requestStartedAt,
          message: rpcResponse.data.message || '예약에 실패했습니다.',
        }))
        return NextResponse.json({ error: rpcResponse.data.message || '예약에 실패했습니다.' }, { status: 409 })
      }

      const shouldFallback = shouldFallbackAfterRpcFailure(rpcResponse.error)
      if (!shouldFallback && rpcResponse.error) {
        console.error('create_reservation_atomic RPC 오류:', rpcResponse.error)
        throw rpcResponse.error
      }
    } catch (rpcError) {
      if (!shouldFallbackAfterRpcFailure(rpcError)) {
        throw rpcError
      }

      console.error('예약 RPC 호출 예외:', rpcError)
    }

    const fallbackResult = await withTimeout(
      fallbackCreateReservation(authResult.user.id, body.regionId, body.date, slots),
      RESERVATION_ROUTE_TIMEOUT_MS,
      '예약 요청 처리 시간이 초과되었습니다.'
    )

    const fallbackOutcome = fallbackResult.status === 200
      ? 'success'
      : classifyReservationOutcome(fallbackResult.body.error)
    const logFn = fallbackResult.status === 200 ? logReservationInfo : logReservationWarn
    logFn(createReservationLogPayload({
      phase: 'fallback',
      outcome: fallbackOutcome,
      userId: authResult.user.id,
      regionId: body.regionId,
      date: body.date,
      slotCount: slots.length,
      durationMs: Date.now() - requestStartedAt,
      message: fallbackResult.body.error,
    }))

    return NextResponse.json(fallbackResult.body, { status: fallbackResult.status })
  } catch (error) {
    console.error('예약 API 오류:', error)
    if (isReservationTimeoutError(error)) {
      logReservationWarn(createReservationLogPayload({
        phase: 'request',
        outcome: 'timeout',
        userId: 'unknown',
        regionId: 0,
        date: 'unknown',
        slotCount: 0,
        durationMs: Date.now() - requestStartedAt,
        message: `${RESERVATION_BUSY_MESSAGE} 잠시 후 내 예약에서 접수 여부를 확인해주세요.`,
      }))
      return NextResponse.json(
        { error: `${RESERVATION_BUSY_MESSAGE} 잠시 후 내 예약에서 접수 여부를 확인해주세요.` },
        { status: 409 }
      )
    }
    logReservationError(createReservationLogPayload({
      phase: 'request',
      outcome: classifyReservationOutcome(getErrorMessage(error, '예약 요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.')),
      userId: 'unknown',
      regionId: 0,
      date: 'unknown',
      slotCount: 0,
      durationMs: Date.now() - requestStartedAt,
      message: getErrorMessage(error, '예약 요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.'),
    }))
    return NextResponse.json(
      { error: getErrorMessage(error, '예약 요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.') },
      { status: 500 }
    )
  }
}
