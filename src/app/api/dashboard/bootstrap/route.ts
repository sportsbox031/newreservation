import { NextRequest, NextResponse } from 'next/server'

import { validateUserApiRequest } from '@/lib/auth'
import {
  buildClosedDashboardBootstrapData,
  buildOpenDashboardBootstrapData,
} from '@/lib/dashboardBootstrap'
import {
  getDashboardCalendarDataForMonth,
  getDashboardMeDataForMonth,
  getDashboardTierOpenState,
  getDashboardUserMetaContext,
} from '@/lib/dashboardServer'
import { getErrorMessage } from '@/lib/requestUtils'
import { processDueReservationSchedules } from '@/lib/reservationScheduleServer'

export async function GET(request: NextRequest) {
  try {
    const authResult = await validateUserApiRequest(request)
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 401 })
    }

    // 기한이 지난 예약 자동 시작/종료 스케줄을 반영 (내부 스로틀, 예외 없음)
    await processDueReservationSchedules()

    const searchParams = request.nextUrl.searchParams
    const year = Number(searchParams.get('year'))
    const month = Number(searchParams.get('month'))

    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: '잘못된 연도 또는 월입니다.' }, { status: 400 })
    }

    const userMetaResult = await getDashboardUserMetaContext(authResult.user.id, year, month, authResult.user)
    if (userMetaResult.error || !userMetaResult.data) {
      return NextResponse.json({ error: userMetaResult.error || '사용자 정보를 불러오지 못했습니다.' }, { status: 400 })
    }

    const { userMeta, regionId, userTierId, yearMonth } = userMetaResult.data
    const tierOpenResult = await getDashboardTierOpenState(userMeta.region_code, userTierId, yearMonth)
    if (tierOpenResult.error) {
      return NextResponse.json({ error: tierOpenResult.error }, { status: 400 })
    }

    const meResult = await getDashboardMeDataForMonth(authResult.user.id, userMeta, year, month)
    if (meResult.error || !meResult.data) {
      return NextResponse.json({ error: meResult.error || '내 예약 정보를 불러오지 못했습니다.' }, { status: 400 })
    }

    const tierIsOpen = tierOpenResult.data === true
    if (!tierIsOpen) {
      return NextResponse.json({
        data: buildClosedDashboardBootstrapData(userMeta, meResult.data.remainingDays)
      })
    }

    const calendarResult = await getDashboardCalendarDataForMonth(regionId, userTierId, year, month, tierIsOpen)
    if (calendarResult.error || !calendarResult.data) {
      return NextResponse.json({ error: calendarResult.error || '달력 정보를 불러오지 못했습니다.' }, { status: 400 })
    }

    return NextResponse.json({
      data: buildOpenDashboardBootstrapData(
        meResult.data.user,
        meResult.data.remainingDays,
        calendarResult.data.reservationStatus,
        calendarResult.data.blockedDates,
        tierIsOpen
      )
    })
  } catch (error) {
    console.error('대시보드 bootstrap API 오류:', error)
    return NextResponse.json(
      { error: getErrorMessage(error, '대시보드 정보를 불러오지 못했습니다.') },
      { status: 500 }
    )
  }
}
