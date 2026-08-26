import { NextRequest, NextResponse } from 'next/server'
import { isAdmin, validateApiRequest } from '@/lib/auth'
import { parsePerformanceFilters } from '@/lib/performanceFilters'
import { getPerformanceRecords } from '@/lib/performanceServer'
import { getErrorMessage } from '@/lib/requestUtils'

export async function GET(request: NextRequest) {
  try {
    const auth = await validateApiRequest(request)
    if (!auth.authenticated || !auth.user || !isAdmin(auth.user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { filters, error } = parsePerformanceFilters(request.nextUrl.searchParams, auth.user.role)
    if (error) return NextResponse.json({ error }, { status: 403 })
    const result = await getPerformanceRecords(auth.user.role, filters)
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json({ data: result.data })
  } catch (error) {
    console.error('실적 목록 API 오류:', error)
    return NextResponse.json(
      { error: { message: getErrorMessage(error, '실적 목록을 불러오는 중 오류가 발생했습니다.') } },
      { status: 500 }
    )
  }
}
