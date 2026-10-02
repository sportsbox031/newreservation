import { NextRequest, NextResponse } from 'next/server'
import { isAdmin, validateApiRequest } from '@/lib/auth'
import { createExperienceRecord, type ExperienceInput } from '@/lib/performanceServer'
import { validateManualRecordInput } from '@/lib/performanceInput'
import { getErrorMessage } from '@/lib/requestUtils'

const PROGRAM_TYPES = ['sports_class', 'sports_event', 'experience_zone'] as const

function parseProgramType(value: unknown): ExperienceInput['program_type'] {
  return (PROGRAM_TYPES as readonly string[]).includes(value as string)
    ? (value as ExperienceInput['program_type'])
    : 'experience_zone'
}

function parseInput(body: any): { input: ExperienceInput | null; message: string | null } {
  const date = typeof body?.date === 'string' ? body.date : ''
  const organization_name = typeof body?.organization_name === 'string' ? body.organization_name.trim() : ''
  if (!date || !organization_name) return { input: null, message: '날짜와 단체명은 필수입니다.' }
  const count = Number(body?.participant_count)
  const program_type = parseProgramType(body?.program_type)
  const user_id = typeof body?.user_id === 'string' && body.user_id.trim() ? body.user_id.trim() : null
  const input: ExperienceInput = {
    date,
    organization_name,
    program_type,
    user_id,
    region_id: body?.region_id != null ? Number(body.region_id) : null,
    city_id: body?.city_id != null ? Number(body.city_id) : null,
    grade: typeof body?.grade === 'string' && body.grade.trim() ? body.grade.trim() : null,
    participant_count: Number.isFinite(count) && count >= 0 ? Math.floor(count) : 0,
    memo: typeof body?.memo === 'string' && body.memo.trim() ? body.memo.trim() : null,
  }
  const guard = validateManualRecordInput({ ...input, phone: null })
  if (guard) return { input: null, message: guard.message }
  return { input, message: null }
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
