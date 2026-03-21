import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { validateApiRequest, isAdmin } from '@/lib/auth'
import {
  deleteMemberOnServer,
  getMembersForAdmin,
  resetMemberPasswordOnServer,
  updateMemberStatusOnServer,
  updateMemberTierOnServer,
} from '@/lib/memberAdminServer'
import { getErrorMessage } from '@/lib/requestUtils'

const memberStatusSchema = z.object({
  action: z.literal('status'),
  memberId: z.string().min(1),
  status: z.enum(['approved', 'rejected']),
})

const memberTierSchema = z.object({
  action: z.literal('tier'),
  memberId: z.string().min(1),
  tier: z.enum(['Priority', 'Standard']),
})

const memberResetPasswordSchema = z.object({
  action: z.literal('reset_password'),
  memberId: z.string().min(1),
  newPassword: z.string().min(1),
})

const memberActionSchema = z.union([
  memberStatusSchema,
  memberTierSchema,
  memberResetPasswordSchema,
])

async function validateAdminRequest(request: NextRequest) {
  const authResult = await validateApiRequest(request)
  if (!authResult.authenticated || !authResult.user || !isAdmin(authResult.user)) {
    return { ok: false as const, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  return { ok: true as const, user: authResult.user }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await validateAdminRequest(request)
    if (!auth.ok) {
      return auth.response
    }

    const regionCode = request.nextUrl.searchParams.get('regionCode')
    const status = request.nextUrl.searchParams.get('status')
    const result = await getMembersForAdmin(auth.user.role, regionCode, status)
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ data: result.data ?? [] })
  } catch (error) {
    console.error('관리자 회원 조회 API 오류:', error)
    return NextResponse.json(
      { error: { message: getErrorMessage(error, '회원 정보를 불러오는 중 오류가 발생했습니다.') } },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await validateAdminRequest(request)
    if (!auth.ok) {
      return auth.response
    }

    const body = await request.json()
    const payload = memberActionSchema.parse(body)

    const result = payload.action === 'status'
      ? await updateMemberStatusOnServer(auth.user.role, payload.memberId, payload.status)
      : payload.action === 'tier'
        ? await updateMemberTierOnServer(auth.user.role, payload.memberId, payload.tier)
        : await resetMemberPasswordOnServer(auth.user.role, payload.memberId, payload.newPassword)

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ data: result.data ?? [] })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: { message: '잘못된 회원 관리 요청입니다.' } }, { status: 400 })
    }

    console.error('관리자 회원 수정 API 오류:', error)
    return NextResponse.json(
      { error: { message: getErrorMessage(error, '회원 수정 중 오류가 발생했습니다.') } },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await validateAdminRequest(request)
    if (!auth.ok) {
      return auth.response
    }

    const memberId = request.nextUrl.searchParams.get('memberId')
    if (!memberId) {
      return NextResponse.json({ error: { message: 'memberId가 필요합니다.' } }, { status: 400 })
    }

    const result = await deleteMemberOnServer(auth.user.role, memberId)
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ data: result.data ?? [] })
  } catch (error) {
    console.error('관리자 회원 삭제 API 오류:', error)
    return NextResponse.json(
      { error: { message: getErrorMessage(error, '회원 삭제 중 오류가 발생했습니다.') } },
      { status: 500 }
    )
  }
}
