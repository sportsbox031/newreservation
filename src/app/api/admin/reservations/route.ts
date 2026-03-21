import { NextRequest, NextResponse } from 'next/server'

import { isAdmin, validateApiRequest } from '@/lib/auth'
import {
  deleteReservationOnServer,
  forceCancelReservationOnServer,
  getReservationsForAdmin,
  updateReservationStatusOnServer,
} from '@/lib/reservationSettingsServer'
import { getErrorMessage } from '@/lib/requestUtils'
import { type ReservationScope } from '@/lib/reservationManagementHelpers'

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

    const regionCode = request.nextUrl.searchParams.get('regionCode')
    const date = request.nextUrl.searchParams.get('date')
    const scope = (request.nextUrl.searchParams.get('scope') || 'all') as ReservationScope

    const result = await getReservationsForAdmin(auth.user.role, regionCode, scope, date)
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ data: result.data ?? [] })
  } catch (error) {
    console.error('관리자 예약 조회 API 오류:', error)
    return NextResponse.json(
      { error: { message: getErrorMessage(error, '예약 정보를 불러오는 중 오류가 발생했습니다.') } },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await validateAdminRequest(request)
    if (!auth.ok) {
      return auth.response
    }

    const body = await request.json()
    const reservationId = typeof body?.reservationId === 'string' ? body.reservationId : ''
    const action = typeof body?.action === 'string' ? body.action : 'status'

    if (!reservationId) {
      return NextResponse.json({ error: { message: 'reservationId가 필요합니다.' } }, { status: 400 })
    }

    const result = action === 'force_cancel'
      ? await forceCancelReservationOnServer(auth.user.role, reservationId)
      : await updateReservationStatusOnServer(auth.user.role, reservationId, body.status)

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ data: result.data ?? [] })
  } catch (error) {
    console.error('관리자 예약 수정 API 오류:', error)
    return NextResponse.json(
      { error: { message: getErrorMessage(error, '예약 상태 변경 중 오류가 발생했습니다.') } },
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

    const reservationId = request.nextUrl.searchParams.get('reservationId')
    if (!reservationId) {
      return NextResponse.json({ error: { message: 'reservationId가 필요합니다.' } }, { status: 400 })
    }

    const result = await deleteReservationOnServer(auth.user.role, reservationId)
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ data: result.data ?? [] })
  } catch (error) {
    console.error('관리자 예약 삭제 API 오류:', error)
    return NextResponse.json(
      { error: { message: getErrorMessage(error, '예약 삭제 중 오류가 발생했습니다.') } },
      { status: 500 }
    )
  }
}
