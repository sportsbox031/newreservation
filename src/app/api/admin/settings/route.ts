import { NextRequest, NextResponse } from 'next/server'

import { isAdmin, validateApiRequest } from '@/lib/auth'
import {
  addBlockedDateForRegion,
  getAllDailyReservationLimitsForRegion,
  getBlockedDatesForRegion,
  getMonthReservationStatusForRegion,
  getReservationSettingsForRegionMonth,
  removeBlockedDateById,
  removeDailyReservationLimitForRegion,
  setDailyReservationLimitForRegion,
  updateReservationSettingsForRegionMonth,
} from '@/lib/reservationSettingsServer'
import { getErrorMessage } from '@/lib/requestUtils'
import { resolveReservationRegionScope } from '@/lib/reservationManagementHelpers'

async function validateAdminRequest(request: NextRequest) {
  const authResult = await validateApiRequest(request)
  if (!authResult.authenticated || !authResult.user || !isAdmin(authResult.user)) {
    return { ok: false as const, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  return { ok: true as const, user: authResult.user }
}

function getAllowedRegionCode(adminRole: string, requestedRegionCode: string | null) {
  const scope = resolveReservationRegionScope(adminRole, requestedRegionCode)
  if (scope.error) {
    return { regionCode: null, error: scope.error }
  }

  if (!scope.regionCode) {
    return { regionCode: null, error: { message: 'regionCode가 필요합니다.' } }
  }

  return { regionCode: scope.regionCode, error: null }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await validateAdminRequest(request)
    if (!auth.ok) {
      return auth.response
    }

    const action = request.nextUrl.searchParams.get('action')
    const requestedRegionCode = request.nextUrl.searchParams.get('regionCode')
    const region = getAllowedRegionCode(auth.user.role, requestedRegionCode)
    if (region.error) {
      return NextResponse.json({ error: region.error }, { status: 400 })
    }

    if (action === 'reservation-settings') {
      const year = Number(request.nextUrl.searchParams.get('year'))
      const month = Number(request.nextUrl.searchParams.get('month'))
      const result = await getReservationSettingsForRegionMonth(region.regionCode!, year, month)
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
      return NextResponse.json({ data: result.data })
    }

    if (action === 'month-status') {
      const year = Number(request.nextUrl.searchParams.get('year'))
      const month = Number(request.nextUrl.searchParams.get('month'))
      const result = await getMonthReservationStatusForRegion(region.regionCode!, year, month)
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
      return NextResponse.json({ data: result.data })
    }

    if (action === 'blocked-dates') {
      const result = await getBlockedDatesForRegion(region.regionCode!)
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
      return NextResponse.json({ data: result.data ?? [] })
    }

    if (action === 'daily-limits') {
      const result = await getAllDailyReservationLimitsForRegion(region.regionCode!)
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
      return NextResponse.json({ data: result.data ?? [] })
    }

    return NextResponse.json({ error: { message: '지원하지 않는 조회입니다.' } }, { status: 400 })
  } catch (error) {
    console.error('관리자 설정 조회 API 오류:', error)
    return NextResponse.json(
      { error: { message: getErrorMessage(error, '설정 정보를 불러오는 중 오류가 발생했습니다.') } },
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
    const action = typeof body?.action === 'string' ? body.action : ''
    const region = getAllowedRegionCode(auth.user.role, body?.regionCode ?? null)
    if (region.error) {
      return NextResponse.json({ error: region.error }, { status: 400 })
    }

    const result = action === 'reservation-settings'
      ? await updateReservationSettingsForRegionMonth(region.regionCode!, body.year, body.month, {
          is_open: body.is_open,
          max_days_per_month: body.max_days_per_month,
          max_reservations_per_day: body.max_reservations_per_day,
        })
      : action === 'daily-limit'
        ? await setDailyReservationLimitForRegion(region.regionCode!, body.date, body.max_reservations)
        : null

    if (!result) {
      return NextResponse.json({ error: { message: '지원하지 않는 수정입니다.' } }, { status: 400 })
    }

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ data: result.data ?? [] })
  } catch (error) {
    console.error('관리자 설정 수정 API 오류:', error)
    return NextResponse.json(
      { error: { message: getErrorMessage(error, '설정 수정 중 오류가 발생했습니다.') } },
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
    const region = getAllowedRegionCode(auth.user.role, body?.regionCode ?? null)
    if (region.error) {
      return NextResponse.json({ error: region.error }, { status: 400 })
    }

    const result = await addBlockedDateForRegion(
      region.regionCode!,
      body.date,
      body.reason,
      body.start_time ?? null,
      body.end_time ?? null
    )

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ data: result.data ?? [] })
  } catch (error) {
    console.error('관리자 차단일 추가 API 오류:', error)
    return NextResponse.json(
      { error: { message: getErrorMessage(error, '차단 일정 추가 중 오류가 발생했습니다.') } },
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

    const action = request.nextUrl.searchParams.get('action')
    if (action === 'blocked-date') {
      const id = Number(request.nextUrl.searchParams.get('id'))
      const result = await removeBlockedDateById(id)
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
      return NextResponse.json({ data: result.data ?? [] })
    }

    if (action === 'daily-limit') {
      const region = getAllowedRegionCode(auth.user.role, request.nextUrl.searchParams.get('regionCode'))
      if (region.error) {
        return NextResponse.json({ error: region.error }, { status: 400 })
      }

      const date = request.nextUrl.searchParams.get('date')
      if (!date) {
        return NextResponse.json({ error: { message: 'date가 필요합니다.' } }, { status: 400 })
      }

      const result = await removeDailyReservationLimitForRegion(region.regionCode!, date)
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
      return NextResponse.json({ data: result.data ?? [] })
    }

    return NextResponse.json({ error: { message: '지원하지 않는 삭제입니다.' } }, { status: 400 })
  } catch (error) {
    console.error('관리자 설정 삭제 API 오류:', error)
    return NextResponse.json(
      { error: { message: getErrorMessage(error, '설정 삭제 중 오류가 발생했습니다.') } },
      { status: 500 }
    )
  }
}
