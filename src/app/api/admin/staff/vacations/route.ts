import { NextRequest, NextResponse } from 'next/server'

import { isAdmin, validateApiRequest } from '@/lib/auth'
import {
  addStaffVacation,
  getStaffVacations,
  removeStaffVacation,
} from '@/lib/staffServer'
import { resolveReservationRegionScope } from '@/lib/reservationManagementHelpers'
import { getErrorMessage } from '@/lib/requestUtils'

async function validateAdminRequest(request: NextRequest) {
  const authResult = await validateApiRequest(request)
  if (!authResult.authenticated || !authResult.user || !isAdmin(authResult.user)) {
    return { ok: false as const, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  return { ok: true as const, user: authResult.user }
}

function resolveRegion(adminRole: string, regionCode: string | null) {
  const regionScope = resolveReservationRegionScope(adminRole, regionCode)
  if (regionScope.error || !regionScope.regionCode) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: regionScope.error || { message: 'regionCode가 필요합니다.' } }, { status: 400 }),
    }
  }
  return { ok: true as const, regionCode: regionScope.regionCode }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await validateAdminRequest(request)
    if (!auth.ok) {
      return auth.response
    }

    const region = resolveRegion(auth.user.role, request.nextUrl.searchParams.get('regionCode'))
    if (!region.ok) {
      return region.response
    }

    const yearMonth = request.nextUrl.searchParams.get('yearMonth')
    if (!yearMonth) {
      return NextResponse.json({ error: { message: 'yearMonth가 필요합니다.' } }, { status: 400 })
    }

    const result = await getStaffVacations(region.regionCode, yearMonth)
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ data: result.data ?? [] })
  } catch (error) {
    console.error('휴가 조회 API 오류:', error)
    return NextResponse.json(
      { error: { message: getErrorMessage(error, '휴가 목록을 불러오는 중 오류가 발생했습니다.') } },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await validateAdminRequest(request)
    if (!auth.ok) {
      return auth.response
    }

    const body = await request.json()
    const region = resolveRegion(auth.user.role, body?.regionCode ?? null)
    if (!region.ok) {
      return region.response
    }

    const staffId = Number(body?.staffId)
    if (!Number.isInteger(staffId) || staffId <= 0) {
      return NextResponse.json({ error: { message: '잘못된 담당자 ID입니다.' } }, { status: 400 })
    }

    const result = await addStaffVacation(staffId, region.regionCode, body?.date ?? '')
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ data: result.data })
  } catch (error) {
    console.error('휴가 등록 API 오류:', error)
    return NextResponse.json(
      { error: { message: getErrorMessage(error, '휴가 등록 중 오류가 발생했습니다.') } },
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

    const region = resolveRegion(auth.user.role, request.nextUrl.searchParams.get('regionCode'))
    if (!region.ok) {
      return region.response
    }

    const vacationId = Number(request.nextUrl.searchParams.get('id'))
    if (!Number.isInteger(vacationId) || vacationId <= 0) {
      return NextResponse.json({ error: { message: '잘못된 휴가 ID입니다.' } }, { status: 400 })
    }

    const result = await removeStaffVacation(vacationId, region.regionCode)
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ data: result.data })
  } catch (error) {
    console.error('휴가 삭제 API 오류:', error)
    return NextResponse.json(
      { error: { message: getErrorMessage(error, '휴가 삭제 중 오류가 발생했습니다.') } },
      { status: 500 }
    )
  }
}
