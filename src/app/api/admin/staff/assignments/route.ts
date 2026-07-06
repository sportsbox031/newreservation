import { NextRequest, NextResponse } from 'next/server'

import { isAdmin, validateApiRequest } from '@/lib/auth'
import {
  assignStaffRandomly,
  assignStaffRandomlyForMonth,
  getAssignmentsForMonth,
  setManualAssignment,
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

    const year = Number(request.nextUrl.searchParams.get('year'))
    const month = Number(request.nextUrl.searchParams.get('month'))
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: { message: '잘못된 연도 또는 월입니다.' } }, { status: 400 })
    }

    const result = await getAssignmentsForMonth(region.regionCode, year, month)
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ data: result.data ?? [] })
  } catch (error) {
    console.error('담당자 배정 조회 API 오류:', error)
    return NextResponse.json(
      { error: { message: getErrorMessage(error, '담당자 배정 정보를 불러오는 중 오류가 발생했습니다.') } },
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

    // 월 전체 랜덤 배정: { action: 'random_month', year, month, method }
    if (body?.action === 'random_month') {
      const result = await assignStaffRandomlyForMonth({
        regionCode: region.regionCode,
        year: Number(body?.year),
        month: Number(body?.month),
        method: body?.method,
        adminId: auth.user.id,
      })

      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }

      return NextResponse.json({ data: result.data })
    }

    // 특정 날짜 랜덤 배정: { action: 'random', date, method }
    if (body?.action === 'random') {
      const result = await assignStaffRandomly({
        regionCode: region.regionCode,
        date: body?.date ?? '',
        method: body?.method,
        adminId: auth.user.id,
      })

      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }

      return NextResponse.json({ data: result.data })
    }

    // 수동 배정: { action: 'manual', reservationId, staffIds }
    if (body?.action === 'manual') {
      const staffIds = Array.isArray(body?.staffIds)
        ? body.staffIds.map((id: unknown) => Number(id)).filter((id: number) => Number.isInteger(id) && id > 0)
        : []

      if (typeof body?.reservationId !== 'string' || !body.reservationId) {
        return NextResponse.json({ error: { message: '잘못된 예약 ID입니다.' } }, { status: 400 })
      }

      const result = await setManualAssignment({
        regionCode: region.regionCode,
        reservationId: body.reservationId,
        staffIds,
        adminId: auth.user.id,
      })

      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }

      return NextResponse.json({ data: result.data })
    }

    return NextResponse.json({ error: { message: '잘못된 요청입니다. (action: random_month | random | manual)' } }, { status: 400 })
  } catch (error) {
    console.error('담당자 배정 API 오류:', error)
    return NextResponse.json(
      { error: { message: getErrorMessage(error, '담당자 배정 중 오류가 발생했습니다.') } },
      { status: 500 }
    )
  }
}
