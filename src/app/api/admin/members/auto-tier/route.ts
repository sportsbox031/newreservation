import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { validateApiRequest, isAdmin } from '@/lib/auth'
import { autoAdjustMemberTiersOnServer } from '@/lib/memberAdminServer'
import { getErrorMessage } from '@/lib/requestUtils'

// preview: DB 변경 없이 변경 예정 내역만 계산, apply: 실제 반영
// memberIds: apply 시 체크박스로 선택한 회원만 반영 (없으면 전체 반영)
const autoTierSchema = z.object({
  mode: z.enum(['preview', 'apply']).default('preview'),
  memberIds: z.array(z.string().min(1)).max(1000).optional(),
})

// 학교알리미 API를 시군구 단위로 40~50회 호출하므로 기본 타임아웃보다 넉넉히 잡는다.
// (Vercel Hobby 플랜 상한이 60초)
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const authResult = await validateApiRequest(request)
    if (!authResult.authenticated || !authResult.user || !isAdmin(authResult.user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { mode, memberIds } = autoTierSchema.parse(body)

    const result = await autoAdjustMemberTiersOnServer(authResult.user.role, mode, memberIds)
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ data: result.data })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: { message: '잘못된 요청입니다.' } }, { status: 400 })
    }
    console.error('등급 자동조정 API 오류:', error)
    return NextResponse.json(
      { error: { message: getErrorMessage(error, '등급 자동조정 중 오류가 발생했습니다.') } },
      { status: 500 }
    )
  }
}
