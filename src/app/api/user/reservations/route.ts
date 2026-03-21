import { NextRequest, NextResponse } from 'next/server'

import { validateUserApiRequest } from '@/lib/auth'
import {
  deleteUserReservationOnServer,
  getUserReservationsOnServer,
  requestReservationCancellationOnServer,
} from '@/lib/reservationSettingsServer'
import { getErrorMessage } from '@/lib/requestUtils'

export async function GET(request: NextRequest) {
  try {
    const authResult = await validateUserApiRequest(request)
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 401 })
    }

    const result = await getUserReservationsOnServer(authResult.user.id)
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ data: result.data ?? [] })
  } catch (error) {
    console.error('사용자 예약 조회 API 오류:', error)
    return NextResponse.json(
      { error: { message: getErrorMessage(error, '예약 정보를 불러오는 중 오류가 발생했습니다.') } },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await validateUserApiRequest(request)
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const reservationId = typeof body?.reservationId === 'string' ? body.reservationId : ''
    if (!reservationId) {
      return NextResponse.json({ error: { message: 'reservationId가 필요합니다.' } }, { status: 400 })
    }

    const result = await requestReservationCancellationOnServer(authResult.user.id, reservationId)
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ data: result.data ?? [] })
  } catch (error) {
    console.error('사용자 예약 취소 요청 API 오류:', error)
    return NextResponse.json(
      { error: { message: getErrorMessage(error, '취소 요청 중 오류가 발생했습니다.') } },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await validateUserApiRequest(request)
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 401 })
    }

    const reservationId = request.nextUrl.searchParams.get('reservationId')
    if (!reservationId) {
      return NextResponse.json({ error: { message: 'reservationId가 필요합니다.' } }, { status: 400 })
    }

    const result = await deleteUserReservationOnServer(authResult.user.id, reservationId)
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ data: result.data ?? [] })
  } catch (error) {
    console.error('사용자 예약 삭제 API 오류:', error)
    return NextResponse.json(
      { error: { message: getErrorMessage(error, '예약 삭제 중 오류가 발생했습니다.') } },
      { status: 500 }
    )
  }
}
