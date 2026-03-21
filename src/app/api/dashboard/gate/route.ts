import { NextRequest, NextResponse } from 'next/server'

import { validateUserApiRequest } from '@/lib/auth'
import {
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

    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: '잘못된 연도 또는 월입니다.' }, { status: 400 })
    }

    const userMetaResult = await getDashboardUserMetaContext(authResult.user.id, year, month, authResult.user)
    if (userMetaResult.error || !userMetaResult.data) {
      return NextResponse.json({ error: userMetaResult.error || '사용자 정보를 불러오지 못했습니다.' }, { status: 400 })
    }

    const { userTierId, userMeta, yearMonth } = userMetaResult.data
    const tierOpenResult = await getDashboardTierOpenState(userMeta.region_code, userTierId, yearMonth)
    if (tierOpenResult.error) {
      return NextResponse.json({ error: tierOpenResult.error }, { status: 400 })
    }

    return NextResponse.json({
      data: {
        is_open: tierOpenResult.data === true,
        tier: userMeta.tier,
        region_code: userMeta.region_code,
      }
    })
  } catch (error) {
    console.error('대시보드 gate API 오류:', error)
    return NextResponse.json(
      { error: getErrorMessage(error, '예약 오픈 상태를 불러오지 못했습니다.') },
      { status: 500 }
    )
  }
}
