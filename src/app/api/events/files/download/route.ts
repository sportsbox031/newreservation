import { NextRequest, NextResponse } from 'next/server'
import { validateUserApiRequest } from '@/lib/auth'
import { signedUrlForFormFileOnServer } from '@/lib/eventUserServer'
import { getErrorMessage } from '@/lib/requestUtils'

export async function GET(request: NextRequest) {
  const auth = await validateUserApiRequest(request)
  if (!auth.authenticated || !auth.user) {
    return NextResponse.json({ error: { message: auth.error || '로그인이 필요합니다.' } }, { status: 401 })
  }
  try {
    const id = new URL(request.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: { message: 'ID가 필요합니다.' } }, { status: 400 })
    const result = await signedUrlForFormFileOnServer(id, auth.user.id, new Date().toISOString())
    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status ?? 400 })
    return NextResponse.json({ data: result.data })
  } catch (e) {
    return NextResponse.json({ error: { message: getErrorMessage(e, '다운로드 처리 중 오류가 발생했습니다.') } }, { status: 500 })
  }
}
