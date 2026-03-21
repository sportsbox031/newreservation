import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { validateUserApiRequest } from '@/lib/auth'
import { changeUserPasswordOnServer, updateUserProfileOnServer } from '@/lib/memberAdminServer'
import { getErrorMessage } from '@/lib/requestUtils'

const updateUserProfileSchema = z.object({
  action: z.literal('profile'),
  manager_name: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  email: z.string().email().optional(),
  student_count: z.number().int().nonnegative().optional(),
  class_count: z.number().int().nonnegative().optional(),
})

const updateUserPasswordSchema = z.object({
  action: z.literal('password'),
  currentPassword: z.string().min(1),
  newPassword: z.string().min(1),
})

const userAccountSchema = z.union([updateUserProfileSchema, updateUserPasswordSchema])

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await validateUserApiRequest(request)
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const payload = userAccountSchema.parse(body)

    const result = payload.action === 'profile'
      ? await updateUserProfileOnServer(authResult.user.id, {
          manager_name: payload.manager_name,
          phone: payload.phone,
          email: payload.email,
          student_count: payload.student_count,
          class_count: payload.class_count,
        })
      : await changeUserPasswordOnServer(authResult.user.id, payload.currentPassword, payload.newPassword)

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ data: result.data ?? [] })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: { message: '잘못된 계정 수정 요청입니다.' } }, { status: 400 })
    }

    console.error('사용자 계정 관리 API 오류:', error)
    return NextResponse.json(
      { error: { message: getErrorMessage(error, '계정 수정 중 오류가 발생했습니다.') } },
      { status: 500 }
    )
  }
}
