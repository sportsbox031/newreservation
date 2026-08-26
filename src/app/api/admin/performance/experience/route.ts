import { NextRequest, NextResponse } from 'next/server'
import { isAdmin, validateApiRequest } from '@/lib/auth'
import { createExperienceRecord, type ExperienceInput } from '@/lib/performanceServer'
import { getErrorMessage } from '@/lib/requestUtils'

function parseInput(body: any): { input: ExperienceInput | null; message: string | null } {
  const date = typeof body?.date === 'string' ? body.date : ''
  const organization_name = typeof body?.organization_name === 'string' ? body.organization_name.trim() : ''
  if (!date || !organization_name) return { input: null, message: '날짜와 단체명은 필수입니다.' }
  const count = Number(body?.participant_count)
  return {
    input: {
      date,
      organization_name,
      region_id: body?.region_id != null ? Number(body.region_id) : null,
      city_id: body?.city_id != null ? Number(body.city_id) : null,
      grade: typeof body?.grade === 'string' && body.grade.trim() ? body.grade.trim() : null,
      participant_count: Number.isFinite(count) && count >= 0 ? Math.floor(count) : 0,
      memo: typeof body?.memo === 'string' && body.memo.trim() ? body.memo.trim() : null,
    },
    message: null,
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await validateApiRequest(request)
    if (!auth.authenticated || !auth.user || !isAdmin(auth.user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json()
    const { input, message } = parseInput(body)
    if (!input) return NextResponse.json({ error: { message } }, { status: 400 })
    const result = await createExperienceRecord(auth.user.id, auth.user.role, input)
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json({ data: result.data })
  } catch (error) {
    console.error('체험존 실적 생성 API 오류:', error)
    return NextResponse.json(
      { error: { message: getErrorMessage(error, '체험존 실적 저장 중 오류가 발생했습니다.') } },
      { status: 500 }
    )
  }
}
