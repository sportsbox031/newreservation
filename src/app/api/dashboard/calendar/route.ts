import { NextRequest, NextResponse } from 'next/server'

import { validateUserApiRequest } from '@/lib/auth'
import {
  buildDashboardCalendarData,
} from '@/lib/dashboardBootstrap'
import {
  getDashboardCalendarDataForMonth,
  getDashboardTierOpenState,
  getDashboardUserMetaContext,
} from '@/lib/dashboardServer'
import { getErrorMessage } from '@/lib/requestUtils'

export async function GET(request: NextRequest) {
  try {
    const authResult = await validateUserApiRequest(request)
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const year = Number(searchParams.get('year'))
    const month = Number(searchParams.get('month'))
    const bypassCache = searchParams.get('bypassCache') === '1'

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

    const tierIsOpen = tierOpenResult.data === true
    if (!tierIsOpen) {
      return NextResponse.json({
        data: buildDashboardCalendarData({}, [], false)
      })
    }

    const calendarResult = await getDashboardCalendarDataForMonth(regionId, userTierId, year, month, tierIsOpen, {
      bypassCache,
    })
    if (calendarResult.error || !calendarResult.data) {
      return NextResponse.json({ error: calendarResult.error || '달력 정보를 불러오지 못했습니다.' }, { status: 400 })
    }

    return NextResponse.json({ data: calendarResult.data })
  } catch (error) {
    console.error('대시보드 calendar API 오류:', error)
    return NextResponse.json(
      { error: getErrorMessage(error, '달력 정보를 불러오지 못했습니다.') },
      { status: 500 }
    )
  }
}
