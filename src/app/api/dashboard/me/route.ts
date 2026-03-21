import { NextRequest, NextResponse } from 'next/server'

import { validateUserApiRequest } from '@/lib/auth'
import {
  getDashboardMeDataForMonth,
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

    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: '잘못된 연도 또는 월입니다.' }, { status: 400 })
    }

    const userMetaResult = await getDashboardUserMetaContext(authResult.user.id, year, month, authResult.user)
    if (userMetaResult.error || !userMetaResult.data) {
      return NextResponse.json({ error: userMetaResult.error || '사용자 정보를 불러오지 못했습니다.' }, { status: 400 })
    }

    const meResult = await getDashboardMeDataForMonth(authResult.user.id, userMetaResult.data.userMeta, year, month)
    if (meResult.error || !meResult.data) {
      return NextResponse.json({ error: meResult.error || '내 예약 정보를 불러오지 못했습니다.' }, { status: 400 })
    }

    return NextResponse.json({ data: meResult.data })
  } catch (error) {
    console.error('대시보드 me API 오류:', error)
    return NextResponse.json(
      { error: getErrorMessage(error, '내 예약 정보를 불러오지 못했습니다.') },
      { status: 500 }
    )
  }
}
