import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { registerMemberOnServer } from '@/lib/authServer'
import { getErrorMessage } from '@/lib/requestUtils'

const registerSchema = z.object({
  organization_type: z.enum(['school', 'welfare']),
  organization_name: z.string().min(1),
  password: z.string().min(1),
  manager_name: z.string().min(1),
  city_name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email(),
  student_count: z.number().int().nonnegative(),
  class_count: z.number().int().nonnegative(),
  privacy_consent: z.boolean(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const payload = registerSchema.parse(body)

    const result = await registerMemberOnServer(payload)
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ data: result.data })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { message: '잘못된 회원가입 요청입니다.' } },
        { status: 400 }
      )
    }

    console.error('회원가입 API 오류:', error)
    return NextResponse.json(
      { error: { message: getErrorMessage(error, '회원가입 중 오류가 발생했습니다.') } },
      { status: 500 }
    )
  }
}
