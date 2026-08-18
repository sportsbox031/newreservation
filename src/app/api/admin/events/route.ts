import { NextRequest, NextResponse } from 'next/server'
import { validateApiRequest, isAdmin, type AuthResult } from '@/lib/auth'
import { validateEventInput } from '@/lib/eventAdminHelpers'
import {
  createEventOnServer,
  updateEventOnServer,
  deleteEventOnServer,
  listEventsOnServer,
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

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin.ok) return admin.response

  try {
    // 이벤트는 지역 구분이 없으므로 모든 관리자가 전체 이벤트를 조회한다.
    const result = await listEventsOnServer()
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
    const body = await request.json().catch(() => null)
    const parsed = validateEventInput(body)
    if (!parsed.ok) {
      return NextResponse.json({ error: { message: parsed.message } }, { status: 400 })
    }

    const thumbnailPath = extractThumbnailPath((body ?? {}) as Record<string, unknown>)
    const result = await createEventOnServer(parsed.value, admin.user.id, thumbnailPath)
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

    const body = await request.json().catch(() => null)
    const parsed = validateEventInput(body)
    if (!parsed.ok) {
      return NextResponse.json({ error: { message: parsed.message } }, { status: 400 })
    }

    const thumbnailPath = extractThumbnailPath((body ?? {}) as Record<string, unknown>)
    const result = await updateEventOnServer(
      id,
      parsed.value,
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
