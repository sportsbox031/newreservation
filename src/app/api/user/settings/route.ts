import { NextRequest, NextResponse } from 'next/server'

import { validateUserApiRequest } from '@/lib/auth'
import {
  getBlockedDatesForRegion,
  getDateReservationStatusForRegion,
  getMonthReservationStatusForRegion,
} from '@/lib/reservationSettingsServer'
import { getErrorMessage } from '@/lib/requestUtils'

export async function GET(request: NextRequest) {
  try {
    const authResult = await validateUserApiRequest(request)
    if (!authResult.authenticated || !authResult.user || !authResult.user.region_code) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 401 })
    }

    const action = request.nextUrl.searchParams.get('action')
    const regionCode = authResult.user.region_code

    if (action === 'month-status') {
      const year = Number(request.nextUrl.searchParams.get('year'))
      const month = Number(request.nextUrl.searchParams.get('month'))
      const result = await getMonthReservationStatusForRegion(regionCode, year, month)
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
      return NextResponse.json({ data: result.data })
    }

    if (action === 'date-status') {
      const date = request.nextUrl.searchParams.get('date')
      if (!date) {
        return NextResponse.json({ error: { message: 'date가 필요합니다.' } }, { status: 400 })
      }

      const result = await getDateReservationStatusForRegion(regionCode, date)
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
      return NextResponse.json({ data: result.data })
    }

    if (action === 'blocked-dates') {
      const result = await getBlockedDatesForRegion(regionCode)
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
      return NextResponse.json({ data: result.data ?? [] })
    }

    return NextResponse.json({ error: { message: '지원하지 않는 조회입니다.' } }, { status: 400 })
  } catch (error) {
    console.error('사용자 설정 조회 API 오류:', error)
    return NextResponse.json(
      { error: { message: getErrorMessage(error, '설정 정보를 불러오는 중 오류가 발생했습니다.') } },
      { status: 500 }
    )
  }
}
