import { NextRequest, NextResponse } from 'next/server'
import { isAdmin, validateApiRequest } from '@/lib/auth'
import { updateExperienceRecord, deleteExperienceRecord } from '@/lib/performanceServer'
import { getErrorMessage } from '@/lib/requestUtils'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await validateApiRequest(request)
    if (!auth.authenticated || !auth.user || !isAdmin(auth.user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await params
    const body = await request.json()
    const patch: any = {}
    if (typeof body?.date === 'string') patch.date = body.date
    if (typeof body?.organization_name === 'string') patch.organization_name = body.organization_name.trim()
    if ('region_id' in body) patch.region_id = body.region_id != null ? Number(body.region_id) : null
    if ('city_id' in body) patch.city_id = body.city_id != null ? Number(body.city_id) : null
    if ('grade' in body) patch.grade = body.grade?.trim() || null
    if ('participant_count' in body) patch.participant_count = Math.max(0, Math.floor(Number(body.participant_count) || 0))
    if ('memo' in body) patch.memo = body.memo?.trim() || null
    const result = await updateExperienceRecord(auth.user.role, id, patch)
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json({ data: result.data })
  } catch (error) {
    console.error('체험존 실적 수정 API 오류:', error)
    return NextResponse.json(
      { error: { message: getErrorMessage(error, '체험존 실적 수정 중 오류가 발생했습니다.') } },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await validateApiRequest(request)
    if (!auth.authenticated || !auth.user || !isAdmin(auth.user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await params
    const result = await deleteExperienceRecord(auth.user.role, id)
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json({ data: result.data })
  } catch (error) {
    console.error('체험존 실적 삭제 API 오류:', error)
    return NextResponse.json(
      { error: { message: getErrorMessage(error, '체험존 실적 삭제 중 오류가 발생했습니다.') } },
      { status: 500 }
    )
  }
}
