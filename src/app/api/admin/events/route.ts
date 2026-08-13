import { NextRequest, NextResponse } from 'next/server'
import { validateApiRequest, isAdmin, type AuthResult } from '@/lib/auth'
import { validateEventInput, type NormalizedEventInput } from '@/lib/eventAdminHelpers'
import { resolveReservationRegionScope } from '@/lib/reservationManagementHelpers'
import {
  createEventOnServer,
  updateEventOnServer,
  deleteEventOnServer,
  listEventsOnServer,
  regionIdForAdminRole,
} from '@/lib/eventServer'
import { getErrorMessage } from '@/lib/requestUtils'

// 요청 본문의 thumbnail_path를 3-state로 해석한다.
// - 문자열: 명시적으로 새 값을 설정
// - null: 명시적으로 제거
// - 그 외(키 없음 등): undefined (수정 시 기존 값 유지, 생성 시 값 없음과 동일)
function extractThumbnailPath(body: Record<string, unknown>): string | null | undefined {
  if (typeof body.thumbnail_path === 'string') return body.thumbnail_path
  if (body.thumbnail_path === null) return null
  return undefined
}

type AdminUser = NonNullable<AuthResult['user']>

async function requireAdmin(
  request: NextRequest
): Promise<{ ok: true; user: AdminUser } | { ok: false; response: NextResponse }> {
  const auth = await validateApiRequest(request)
  if (!auth.authenticated || !auth.user || !isAdmin(auth.user)) {
    return {
      ok: false,
      response: NextResponse.json({ error: auth.error || '권한이 없습니다.' }, { status: 401 }),
    }
  }
  return { ok: true, user: auth.user }
}

// 지역관리자는 전체 대상 이벤트를 만들 수 없고, region 대상은 본인 지역으로 강제된다.
// 반환값: 강제된(effective) 대상 지역 코드가 적용된 입력값, 실패 시 에러 응답.
function resolveEffectiveEventInput(
  user: AdminUser,
  value: NormalizedEventInput
): { ok: true; value: NormalizedEventInput } | { ok: false; response: NextResponse } {
  if (user.role !== 'super' && value.target_type === 'all') {
    return {
      ok: false,
      response: NextResponse.json(
        { error: { message: '지역관리자는 전체 대상 이벤트를 생성할 수 없습니다.' } },
        { status: 403 }
      ),
    }
  }

  if (value.target_type === 'region') {
    const scope = resolveReservationRegionScope(user.role, value.target_region_code)
    if (scope.error) {
      return {
        ok: false,
        response: NextResponse.json({ error: scope.error }, { status: 403 }),
      }
    }
    return { ok: true, value: { ...value, target_region_code: scope.regionCode } }
  }

  return { ok: true, value }
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin.ok) return admin.response

  try {
    const regionId =
      admin.user.role === 'south' || admin.user.role === 'north'
        ? await regionIdForAdminRole(admin.user.role)
        : null

    const result = await listEventsOnServer({ role: admin.user.role, regionId })
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 })
    }
    return NextResponse.json({ data: result.data })
  } catch (e) {
    return NextResponse.json(
      { error: { message: getErrorMessage(e, '이벤트 목록을 불러오는 중 오류가 발생했습니다.') } },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin.ok) return admin.response

  try {
    const body = await request.json()
    const parsed = validateEventInput(body)
    if (!parsed.ok) {
      return NextResponse.json({ error: { message: parsed.message } }, { status: 400 })
    }

    const effective = resolveEffectiveEventInput(admin.user, parsed.value)
    if (!effective.ok) return effective.response

    const thumbnailPath = extractThumbnailPath(body)
    const result = await createEventOnServer(effective.value, admin.user.id, thumbnailPath)
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 })
    }
    return NextResponse.json({ data: result.data })
  } catch (e) {
    return NextResponse.json(
      { error: { message: getErrorMessage(e, '이벤트 생성 중 오류가 발생했습니다.') } },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin.ok) return admin.response

  try {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: { message: 'ID가 필요합니다.' } }, { status: 400 })
    }

    const body = await request.json()
    const parsed = validateEventInput(body)
    if (!parsed.ok) {
      return NextResponse.json({ error: { message: parsed.message } }, { status: 400 })
    }

    const effective = resolveEffectiveEventInput(admin.user, parsed.value)
    if (!effective.ok) return effective.response

    const thumbnailPath = extractThumbnailPath(body)
    const result = await updateEventOnServer(
      id,
      effective.value,
      { id: admin.user.id, role: admin.user.role },
      thumbnailPath
    )
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 })
    }
    return NextResponse.json({ data: result.data })
  } catch (e) {
    return NextResponse.json(
      { error: { message: getErrorMessage(e, '이벤트 수정 중 오류가 발생했습니다.') } },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin.ok) return admin.response

  try {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: { message: 'ID가 필요합니다.' } }, { status: 400 })
    }

    const result = await deleteEventOnServer(id, { id: admin.user.id, role: admin.user.role })
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 })
    }
    return NextResponse.json({ data: result.data })
  } catch (e) {
    return NextResponse.json(
      { error: { message: getErrorMessage(e, '이벤트 삭제 중 오류가 발생했습니다.') } },
      { status: 500 }
    )
  }
}
