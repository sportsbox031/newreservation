import { NextRequest, NextResponse } from 'next/server'
import { isAdmin, validateApiRequest } from '@/lib/auth'
import { listCitiesForAdmin } from '@/lib/performanceServer'
import { getErrorMessage } from '@/lib/requestUtils'

export async function GET(request: NextRequest) {
  try {
    const auth = await validateApiRequest(request)
    if (!auth.authenticated || !auth.user || !isAdmin(auth.user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const result = await listCitiesForAdmin(auth.user.role)
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json({ data: result.data })
  } catch (error) {
    console.error('시/군 목록 API 오류:', error)
    return NextResponse.json(
      { error: { message: getErrorMessage(error, '시/군 목록 조회 중 오류가 발생했습니다.') } },
      { status: 500 }
    )
  }
}
