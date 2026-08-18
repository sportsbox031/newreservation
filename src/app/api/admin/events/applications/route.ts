import { NextRequest, NextResponse } from 'next/server'
import { validateApiRequest, isAdmin } from '@/lib/auth'
import { listApplicationsForEventOnServer, setApplicationStatusOnServer } from '@/lib/eventAdminApplicationServer'
import { getErrorMessage } from '@/lib/requestUtils'

async function requireAdmin(request: NextRequest) {
  const auth = await validateApiRequest(request)
  if (!auth.authenticated || !auth.user || !isAdmin(auth.user)) {
    return { ok: false as const, response: NextResponse.json({ error: { message: auth.error || '권한이 없습니다.' } }, { status: 401 }) }
  }
  return { ok: true as const }
}

export async function GET(request: NextRequest) {
  const a = await requireAdmin(request)
  if (!a.ok) return a.response
  try {
    const eventId = new URL(request.url).searchParams.get('event_id')
    if (!eventId) return NextResponse.json({ error: { message: 'event_id가 필요합니다.' } }, { status: 400 })
    const result = await listApplicationsForEventOnServer(eventId)
    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status ?? 400 })
    return NextResponse.json({ data: result.data ?? [] })
  } catch (e) {
    return NextResponse.json({ error: { message: getErrorMessage(e, '신청자 목록 조회 중 오류가 발생했습니다.') } }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const a = await requireAdmin(request)
  if (!a.ok) return a.response
  try {
    const id = new URL(request.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: { message: 'ID가 필요합니다.' } }, { status: 400 })
    const body = await request.json().catch(() => ({}))
    if (typeof body?.status !== 'string') return NextResponse.json({ error: { message: 'status 값이 필요합니다.' } }, { status: 400 })
    const result = await setApplicationStatusOnServer(id, body.status)
    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status ?? 400 })
    return NextResponse.json({ data: result.data })
  } catch (e) {
    return NextResponse.json({ error: { message: getErrorMessage(e, '상태 변경 중 오류가 발생했습니다.') } }, { status: 500 })
  }
}
