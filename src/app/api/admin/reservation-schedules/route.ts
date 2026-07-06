import { NextRequest, NextResponse } from 'next/server'

import { isAdmin, validateApiRequest } from '@/lib/auth'
import {
  createReservationSchedule,
  deleteReservationSchedule,
  listReservationSchedules,
  processDueReservationSchedules,
} from '@/lib/reservationScheduleServer'
import { resolveReservationRegionScope } from '@/lib/reservationManagementHelpers'
import { getErrorMessage } from '@/lib/requestUtils'

async function validateAdminRequest(request: NextRequest) {
  const authResult = await validateApiRequest(request)
  if (!authResult.authenticated || !authResult.user || !isAdmin(authResult.user)) {
    return { ok: false as const, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  return { ok: true as const, user: authResult.user }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await validateAdminRequest(request)
    if (!auth.ok) {
      return auth.response
    }

    const regionScope = resolveReservationRegionScope(auth.user.role, request.nextUrl.searchParams.get('regionCode'))
    if (regionScope.error || !regionScope.regionCode) {
      return NextResponse.json({ error: regionScope.error || { message: 'regionCode가 필요합니다.' } }, { status: 400 })
    }

    // 관리자가 목록을 볼 때는 기한 지난 스케줄을 즉시 반영해 최신 상태를 보여준다
    await processDueReservationSchedules({ force: true })

    const result = await listReservationSchedules(regionScope.regionCode)
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ data: result.data })
  } catch (error) {
    console.error('예약 스케줄 조회 API 오류:', error)
    return NextResponse.json(
      { error: { message: getErrorMessage(error, '예약 스케줄을 불러오는 중 오류가 발생했습니다.') } },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await validateAdminRequest(request)
    if (!auth.ok) {
      return auth.response
    }

    const body = await request.json()
    const regionScope = resolveReservationRegionScope(auth.user.role, body?.regionCode ?? null)
    if (regionScope.error || !regionScope.regionCode) {
      return NextResponse.json({ error: regionScope.error || { message: 'regionCode가 필요합니다.' } }, { status: 400 })
    }

    const tierId = body?.tierId === null || body?.tierId === undefined ? null : Number(body.tierId)

    const result = await createReservationSchedule({
      regionCode: regionScope.regionCode,
      yearMonth: body?.yearMonth,
      tierId,
      action: body?.action,
      scheduledAtKst: body?.scheduledAtKst,
      adminId: auth.user.id,
    })

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ data: result.data })
  } catch (error) {
    console.error('예약 스케줄 등록 API 오류:', error)
    return NextResponse.json(
      { error: { message: getErrorMessage(error, '예약 스케줄 등록 중 오류가 발생했습니다.') } },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await validateAdminRequest(request)
    if (!auth.ok) {
      return auth.response
    }

    const scheduleId = Number(request.nextUrl.searchParams.get('id'))
    if (!Number.isInteger(scheduleId) || scheduleId <= 0) {
      return NextResponse.json({ error: { message: '잘못된 스케줄 ID입니다.' } }, { status: 400 })
    }

    const regionScope = resolveReservationRegionScope(auth.user.role, request.nextUrl.searchParams.get('regionCode'))
    if (regionScope.error || !regionScope.regionCode) {
      return NextResponse.json({ error: regionScope.error || { message: 'regionCode가 필요합니다.' } }, { status: 400 })
    }

    const result = await deleteReservationSchedule(scheduleId, regionScope.regionCode)
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ data: result.data })
  } catch (error) {
    console.error('예약 스케줄 삭제 API 오류:', error)
    return NextResponse.json(
      { error: { message: getErrorMessage(error, '예약 스케줄 삭제 중 오류가 발생했습니다.') } },
      { status: 500 }
    )
  }
}
