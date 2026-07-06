import { NextRequest, NextResponse } from 'next/server'

import { isAdmin, validateApiRequest } from '@/lib/auth'
import {
  createStaffMember,
  deleteStaffMember,
  getStaffMembers,
  updateStaffMember,
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

    const result = await getStaffMembers(region.regionCode)
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ data: result.data ?? [] })
  } catch (error) {
    console.error('담당자 조회 API 오류:', error)
    return NextResponse.json(
      { error: { message: getErrorMessage(error, '담당자 목록을 불러오는 중 오류가 발생했습니다.') } },
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

    const teamNo = body?.teamNo === null || body?.teamNo === undefined ? null : Number(body.teamNo)
    const result = await createStaffMember({
      regionCode: region.regionCode,
      name: body?.name ?? '',
      teamNo,
    })

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ data: result.data })
  } catch (error) {
    console.error('담당자 등록 API 오류:', error)
    return NextResponse.json(
      { error: { message: getErrorMessage(error, '담당자 등록 중 오류가 발생했습니다.') } },
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
    const region = resolveRegion(auth.user.role, body?.regionCode ?? null)
    if (!region.ok) {
      return region.response
    }

    const staffId = Number(body?.staffId)
    if (!Number.isInteger(staffId) || staffId <= 0) {
      return NextResponse.json({ error: { message: '잘못된 담당자 ID입니다.' } }, { status: 400 })
    }

    const updates: { name?: string; teamNo?: number | null; isActive?: boolean } = {}
    if (body?.name !== undefined) {
      updates.name = body.name
    }
    if (body?.teamNo !== undefined) {
      updates.teamNo = body.teamNo === null ? null : Number(body.teamNo)
    }
    if (body?.isActive !== undefined) {
      updates.isActive = Boolean(body.isActive)
    }

    const result = await updateStaffMember(staffId, region.regionCode, updates)
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ data: result.data })
  } catch (error) {
    console.error('담당자 수정 API 오류:', error)
    return NextResponse.json(
      { error: { message: getErrorMessage(error, '담당자 수정 중 오류가 발생했습니다.') } },
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

    const staffId = Number(request.nextUrl.searchParams.get('id'))
    if (!Number.isInteger(staffId) || staffId <= 0) {
      return NextResponse.json({ error: { message: '잘못된 담당자 ID입니다.' } }, { status: 400 })
    }

    const result = await deleteStaffMember(staffId, region.regionCode)
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ data: result.data })
  } catch (error) {
    console.error('담당자 삭제 API 오류:', error)
    return NextResponse.json(
      { error: { message: getErrorMessage(error, '담당자 삭제 중 오류가 발생했습니다.') } },
      { status: 500 }
    )
  }
}
