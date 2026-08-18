import { NextRequest, NextResponse } from 'next/server'
import { validateApiRequest, isAdmin } from '@/lib/auth'
import { listSubmissionsForEventOnServer, signedUrlForSubmissionOnServer } from '@/lib/eventSubmissionServer'
import { getErrorMessage } from '@/lib/requestUtils'

export async function GET(request: NextRequest) {
  const auth = await validateApiRequest(request)
  if (!auth.authenticated || !auth.user || !isAdmin(auth.user)) {
    return NextResponse.json({ error: { message: auth.error || '권한이 없습니다.' } }, { status: 401 })
  }
  try {
    const sp = new URL(request.url).searchParams
    const downloadId = sp.get('download_id')
    if (downloadId) {
      const result = await signedUrlForSubmissionOnServer(downloadId)
      if (result.error) return NextResponse.json({ error: result.error }, { status: result.status ?? 400 })
      return NextResponse.json({ data: result.data })
    }
    const eventId = sp.get('event_id')
    if (!eventId) return NextResponse.json({ error: { message: 'event_id가 필요합니다.' } }, { status: 400 })
    const result = await listSubmissionsForEventOnServer(eventId)
    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status ?? 400 })
    return NextResponse.json({ data: result.data ?? [] })
  } catch (e) {
    return NextResponse.json({ error: { message: getErrorMessage(e, '서류 조회 중 오류가 발생했습니다.') } }, { status: 500 })
  }
}
