import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { validateApiRequest } from '@/lib/auth'
import { getErrorMessage, withTimeout } from '@/lib/requestUtils'
import { isReservationTimeoutError } from '@/lib/reservationError'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false
  }
})

const RESERVATION_ROUTE_TIMEOUT_MS = 10000
const RESERVATION_BUSY_MESSAGE = '신청이 몰려 예약을 처리 중입니다. 잠시 후 다시 시도해주세요.'

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
  try {
    const authResult = await validateApiRequest(request)
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 401 })
    }

    if (authResult.user.role !== 'user') {
      return NextResponse.json({ error: '일반 사용자만 예약할 수 있습니다.' }, { status: 403 })
    }

    const body = await request.json() as ReservationRequestBody
    const slots = Array.isArray(body.slots) ? body.slots : []

    if (!body.regionId || !body.date || slots.length === 0) {
      return NextResponse.json({ error: '예약 요청 정보가 올바르지 않습니다.' }, { status: 400 })
    }

    const startTimes = slots.map(slot => slot.start_time)
    if (new Set(startTimes).size !== startTimes.length) {
      return NextResponse.json({ error: '시작 시간이 중복됩니다. 각 타임의 시작 시간은 서로 달라야 합니다.' }, { status: 400 })
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
        return NextResponse.json({ data: rpcResponse.data.reservation })
      }

      if (!rpcResponse.error && rpcResponse.data && rpcResponse.data.success === false) {
        return NextResponse.json({ error: rpcResponse.data.message || '예약에 실패했습니다.' }, { status: 409 })
      }

      const functionMissing = rpcResponse.error?.code === 'PGRST202' || rpcResponse.error?.message?.includes('create_reservation_atomic')
      if (!functionMissing && rpcResponse.error) {
        console.error('create_reservation_atomic RPC 오류:', rpcResponse.error)
      }
    } catch (rpcError) {
      console.error('예약 RPC 호출 예외:', rpcError)
    }

    const fallbackResult = await withTimeout(
      fallbackCreateReservation(authResult.user.id, body.regionId, body.date, slots),
      RESERVATION_ROUTE_TIMEOUT_MS,
      '예약 요청 처리 시간이 초과되었습니다.'
    )

    return NextResponse.json(fallbackResult.body, { status: fallbackResult.status })
  } catch (error) {
    console.error('예약 API 오류:', error)
    if (isReservationTimeoutError(error)) {
      return NextResponse.json(
        { error: `${RESERVATION_BUSY_MESSAGE} 잠시 후 내 예약에서 접수 여부를 확인해주세요.` },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: getErrorMessage(error, '예약 요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.') },
      { status: 500 }
    )
  }
}
