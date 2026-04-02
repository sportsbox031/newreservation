import { NextRequest, NextResponse } from 'next/server'

import { validateUserApiRequest } from '@/lib/auth'
import { getActiveReservationMonthForRegion } from '@/lib/reservationSettingsServer'
import { getErrorMessage } from '@/lib/requestUtils'

export async function GET(request: NextRequest) {
  try {
    const authResult = await validateUserApiRequest(request)
    if (!authResult.authenticated || !authResult.user?.region_code) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 401 })
    }

    const result = await getActiveReservationMonthForRegion(authResult.user.region_code)
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ data: result.data })
  } catch (error) {
    console.error('대시보드 활성 예약 월 API 오류:', error)
    return NextResponse.json(
      { error: getErrorMessage(error, '활성 예약 월을 불러오지 못했습니다.') },
      { status: 500 }
    )
  }
}
