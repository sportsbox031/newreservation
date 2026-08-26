import { NextRequest, NextResponse } from 'next/server'
import { isAdmin, validateApiRequest } from '@/lib/auth'
import { upsertPerformanceOverride, type OverrideFields } from '@/lib/performanceServer'
import { getErrorMessage } from '@/lib/requestUtils'

export async function PATCH(request: NextRequest) {
  try {
    const auth = await validateApiRequest(request)
    if (!auth.authenticated || !auth.user || !isAdmin(auth.user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json()
    const sourceType = body?.source_type
    const sourceId = typeof body?.source_id === 'string' ? body.source_id : ''
    if ((sourceType !== 'sports_class' && sourceType !== 'sports_event') || !sourceId) {
      return NextResponse.json({ error: { message: 'source_type/source_id가 올바르지 않습니다.' } }, { status: 400 })
    }
    const fields: OverrideFields = {
      grade: typeof body?.grade === 'string' && body.grade.trim() ? body.grade.trim() : null,
      participant_count: body?.participant_count != null && body.participant_count !== ''
        ? Math.max(0, Math.floor(Number(body.participant_count)))
        : null,
      memo: typeof body?.memo === 'string' && body.memo.trim() ? body.memo.trim() : null,
      excluded: body?.excluded === true,
    }
    const result = await upsertPerformanceOverride(auth.user.id, auth.user.role, sourceType, sourceId, fields)
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json({ data: result.data })
  } catch (error) {
    console.error('실적 override API 오류:', error)
    return NextResponse.json(
      { error: { message: getErrorMessage(error, '실적 수정 중 오류가 발생했습니다.') } },
      { status: 500 }
    )
  }
}
