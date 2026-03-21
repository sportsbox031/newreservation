import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { validateApiRequest, isAdmin } from '@/lib/auth'
import { changeAdminPasswordOnServer, updateAdminProfileOnServer } from '@/lib/memberAdminServer'
import { getErrorMessage } from '@/lib/requestUtils'

const updateAdminProfileSchema = z.object({
  action: z.literal('profile'),
  phone: z.string().min(1).optional(),
  email: z.string().email().optional(),
})

const updateAdminPasswordSchema = z.object({
  action: z.literal('password'),
  currentPassword: z.string().min(1),
  newPassword: z.string().min(1),
})

const adminAccountSchema = z.union([updateAdminProfileSchema, updateAdminPasswordSchema])

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await validateApiRequest(request)
    if (!authResult.authenticated || !authResult.user || !isAdmin(authResult.user)) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const payload = adminAccountSchema.parse(body)

    const result = payload.action === 'profile'
      ? await updateAdminProfileOnServer(authResult.user.id, {
          phone: payload.phone,
          email: payload.email,
        })
      : await changeAdminPasswordOnServer(authResult.user.id, payload.currentPassword, payload.newPassword)

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ data: result.data ?? [] })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: { message: '잘못된 계정 수정 요청입니다.' } }, { status: 400 })
    }

    console.error('관리자 계정 관리 API 오류:', error)
    return NextResponse.json(
      { error: { message: getErrorMessage(error, '계정 수정 중 오류가 발생했습니다.') } },
      { status: 500 }
    )
  }
}
