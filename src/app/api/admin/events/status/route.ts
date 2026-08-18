import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { validateApiRequest, isAdmin, type AuthResult } from '@/lib/auth'
import { withTimeout, getErrorMessage } from '@/lib/requestUtils'

type AdminUser = NonNullable<AuthResult['user']>

// 서버측에서 서비스 롤 키 사용 (src/lib/eventServer.ts 패턴과 동일)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
})

const QUERY_TIMEOUT_MS = 8000

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

// PATCH - 이벤트 예약 오픈/마감 수동 토글 (?id=) body: { is_open: boolean }
export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin.ok) return admin.response

  try {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: { message: 'ID가 필요합니다.' } }, { status: 400 })
    }

    const body = await request.json().catch(() => null)
    if (typeof body?.is_open !== 'boolean') {
      return NextResponse.json({ error: { message: 'is_open 값이 필요합니다.' } }, { status: 400 })
    }

    const { data: event, error: fetchError } = await withTimeout(
      supabaseAdmin
        .from('events')
        .select('id, reservation_start_at, reservation_end_at')
        .eq('id', id)
        .single(),
      QUERY_TIMEOUT_MS,
      '이벤트 정보를 불러오는 중 시간이 초과되었습니다.'
    )

    if (fetchError || !event) {
      return NextResponse.json({ error: { message: '이벤트를 찾을 수 없습니다.' } }, { status: 404 })
    }

    // 이벤트는 지역관리자도 전체관리자와 동일하게 모든 이벤트의 예약 상태를 토글할 수 있으므로 소유권 확인을 하지 않는다.

    // 자동 스케줄(예약 시작/종료 시각)이 설정된 이벤트는 수동 토글과 혼동될 수 있으므로 차단한다.
    // computeEffectiveOpen은 start/end 중 하나라도 있으면 "스케줄 있음"으로 보고 스케줄을 우선하므로,
    // 여기서도 동일하게 (start || end) 기준으로 막아야 읽기시점 계산과 일관된다.
    if (event.reservation_start_at || event.reservation_end_at) {
      return NextResponse.json(
        {
          error: {
            message: '자동 스케줄이 설정된 이벤트는 수동 토글할 수 없습니다. 스케줄을 먼저 해제하세요.'
          }
        },
        { status: 403 }
      )
    }

    const { data: updated, error } = await withTimeout(
      supabaseAdmin
        .from('events')
        .update({ is_open: body.is_open, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single(),
      QUERY_TIMEOUT_MS,
      '이벤트 상태 변경 중 시간이 초과되었습니다.'
    )

    if (error || !updated) {
      return NextResponse.json(
        { error: { message: getErrorMessage(error, '이벤트 상태를 변경할 수 없습니다.') } },
        { status: 400 }
      )
    }

    return NextResponse.json({ data: updated })
  } catch (e) {
    return NextResponse.json(
      { error: { message: getErrorMessage(e, '이벤트 상태 변경 중 오류가 발생했습니다.') } },
      { status: 500 }
    )
  }
}
