import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { validateApiRequest, isAdmin } from '@/lib/auth'
import { PENALTY_REASONS } from '@/lib/penalty'
import {
  deletePenaltyOnServer,
  getPenaltyStatusSummaries,
  issuePenaltyOnServer,
  listUserPenalties,
} from '@/lib/penaltyServer'
import { getErrorMessage } from '@/lib/requestUtils'

const issuePenaltySchema = z.object({
  userId: z.string().min(1),
  type: z.enum(['warning', 'ejection']),
  reason: z.enum(PENALTY_REASONS),
})

async function validateAdminRequest(request: NextRequest) {
  const authResult = await validateApiRequest(request)
  if (!authResult.authenticated || !authResult.user || !isAdmin(authResult.user)) {
    return { ok: false as const, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  return { ok: true as const, user: authResult.user }
}

// GET /api/admin/penalties            → 전체 사용자 패널티 상태 요약 (뱃지용)
// GET /api/admin/penalties?userId=... → 해당 사용자의 올해 패널티 내역
export async function GET(request: NextRequest) {
  try {
    const auth = await validateAdminRequest(request)
    if (!auth.ok) {
      return auth.response
    }

    const userId = request.nextUrl.searchParams.get('userId')
    const result = userId
      ? await listUserPenalties(userId)
      : await getPenaltyStatusSummaries()

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ data: result.data })
  } catch (error) {
    console.error('패널티 조회 API 오류:', error)
    return NextResponse.json(
      { error: getErrorMessage(error, '패널티 정보를 불러오는 중 오류가 발생했습니다.') },
      { status: 500 }
    )
  }
}

// POST /api/admin/penalties { userId, type, reason }
export async function POST(request: NextRequest) {
  try {
    const auth = await validateAdminRequest(request)
    if (!auth.ok) {
      return auth.response
    }

    const body = await request.json()
    const payload = issuePenaltySchema.parse(body)

    const result = await issuePenaltyOnServer({
      adminRole: auth.user.role,
      adminUsername: auth.user.organization_name,
      userId: payload.userId,
      type: payload.type,
      reason: payload.reason,
    })

    if (result.error || !result.data) {
      return NextResponse.json({ error: result.error || '패널티 부여에 실패했습니다.' }, { status: 400 })
    }

    return NextResponse.json({ data: result.data })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: '잘못된 패널티 요청입니다.' }, { status: 400 })
    }

    console.error('패널티 부여 API 오류:', error)
    return NextResponse.json(
      { error: getErrorMessage(error, '패널티 부여 중 오류가 발생했습니다.') },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/penalties?id=... → 패널티 취소
export async function DELETE(request: NextRequest) {
  try {
    const auth = await validateAdminRequest(request)
    if (!auth.ok) {
      return auth.response
    }

    const penaltyId = request.nextUrl.searchParams.get('id')
    if (!penaltyId) {
      return NextResponse.json({ error: '패널티 ID가 필요합니다.' }, { status: 400 })
    }

    const result = await deletePenaltyOnServer(penaltyId, auth.user.role)
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ data: true })
  } catch (error) {
    console.error('패널티 취소 API 오류:', error)
    return NextResponse.json(
      { error: getErrorMessage(error, '패널티 취소 중 오류가 발생했습니다.') },
      { status: 500 }
    )
  }
}
