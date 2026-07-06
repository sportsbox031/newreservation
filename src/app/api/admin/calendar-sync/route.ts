import { NextRequest, NextResponse } from 'next/server'

import { isAdmin, validateApiRequest } from '@/lib/auth'
import { syncMonthAssignmentsToCalendar } from '@/lib/calendarSyncServer'
import { resolveReservationRegionScope } from '@/lib/reservationManagementHelpers'
import { getErrorMessage } from '@/lib/requestUtils'

// 월 전체 동기화는 이벤트 수만큼 구글 API 호출이 필요하므로 여유 있게 설정
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const authResult = await validateApiRequest(request)
    if (!authResult.authenticated || !authResult.user || !isAdmin(authResult.user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const regionScope = resolveReservationRegionScope(authResult.user.role, body?.regionCode ?? null)
    if (regionScope.error || !regionScope.regionCode) {
      return NextResponse.json({ error: regionScope.error || { message: 'regionCode가 필요합니다.' } }, { status: 400 })
    }

    const result = await syncMonthAssignmentsToCalendar({
      regionCode: regionScope.regionCode,
      year: Number(body?.year),
      month: Number(body?.month),
    })

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ data: result.data })
  } catch (error) {
    console.error('구글캘린더 동기화 API 오류:', error)
    return NextResponse.json(
      { error: { message: getErrorMessage(error, '구글캘린더 동기화 중 오류가 발생했습니다.') } },
      { status: 500 }
    )
  }
}
