import { NextRequest, NextResponse } from 'next/server'
import { validateUserApiRequest } from '@/lib/auth'
import { listOpenEventsOnServer, getEventForUserOnServer } from '@/lib/eventUserServer'
import { getErrorMessage } from '@/lib/requestUtils'

export async function GET(request: NextRequest) {
  const authResult = await validateUserApiRequest(request)
  if (!authResult.authenticated || !authResult.user) {
    return NextResponse.json({ error: { message: authResult.error || '로그인이 필요합니다.' } }, { status: 401 })
  }

  try {
    const nowIso = new Date().toISOString()
    const id = new URL(request.url).searchParams.get('id')

    if (id) {
      const result = await getEventForUserOnServer(id, authResult.user.id, nowIso)
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: result.status ?? 400 })
      }
      return NextResponse.json({ data: result.data })
    }

    const result = await listOpenEventsOnServer(nowIso)
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    return NextResponse.json({ data: result.data ?? [] })
  } catch (e) {
    return NextResponse.json(
      { error: { message: getErrorMessage(e, '이벤트를 불러오는 중 오류가 발생했습니다.') } },
      { status: 500 }
    )
  }
}
