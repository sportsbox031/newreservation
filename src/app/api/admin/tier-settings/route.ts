import { NextRequest, NextResponse } from 'next/server'

import { isAdmin, validateApiRequest } from '@/lib/auth'
import {
  getActiveTiersOnServer,
  getTierReservationSettingsOnServer,
  updateTierReservationStatusOnServer,
} from '@/lib/reservationSettingsServer'
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

    const action = request.nextUrl.searchParams.get('action')
    if (action === 'tiers') {
      const result = await getActiveTiersOnServer()
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
      return NextResponse.json({ data: result.data ?? [] })
    }

    const regionScope = resolveReservationRegionScope(auth.user.role, request.nextUrl.searchParams.get('regionCode'))
    if (regionScope.error || !regionScope.regionCode) {
      return NextResponse.json({ error: regionScope.error || { message: 'regionCode가 필요합니다.' } }, { status: 400 })
    }

    const yearMonth = request.nextUrl.searchParams.get('yearMonth')
    if (!yearMonth) {
      return NextResponse.json({ error: { message: 'yearMonth가 필요합니다.' } }, { status: 400 })
    }

    const result = await getTierReservationSettingsOnServer(regionScope.regionCode, yearMonth)
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ data: result.data ?? [] })
  } catch (error) {
    console.error('관리자 티어 설정 조회 API 오류:', error)
    return NextResponse.json(
      { error: { message: getErrorMessage(error, '티어 설정을 불러오는 중 오류가 발생했습니다.') } },
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
    const regionScope = resolveReservationRegionScope(auth.user.role, body?.regionCode ?? null)
    if (regionScope.error || !regionScope.regionCode) {
      return NextResponse.json({ error: regionScope.error || { message: 'regionCode가 필요합니다.' } }, { status: 400 })
    }

    const result = await updateTierReservationStatusOnServer(
      regionScope.regionCode,
      body.yearMonth,
      body.tierId,
      body.isOpen,
      auth.user.id
    )

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ data: result.data ?? [] })
  } catch (error) {
    console.error('관리자 티어 설정 수정 API 오류:', error)
    return NextResponse.json(
      { error: { message: getErrorMessage(error, '티어 설정 수정 중 오류가 발생했습니다.') } },
      { status: 500 }
    )
  }
}
