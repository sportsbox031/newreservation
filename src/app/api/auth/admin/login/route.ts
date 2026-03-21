import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { buildSessionCookieConfig } from '@/lib/authCookies'
import { loginAdminOnServer } from '@/lib/authServer'
import { getErrorMessage } from '@/lib/requestUtils'

const adminLoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const payload = adminLoginSchema.parse(body)

    const result = await loginAdminOnServer(payload.username, payload.password, request.headers)
    if (result.error || !result.data) {
      return NextResponse.json(
        { error: result.error || { message: '관리자 로그인에 실패했습니다.' } },
        { status: 401 }
      )
    }

    const response = NextResponse.json({ data: result.data })
    response.cookies.set(
      buildSessionCookieConfig('admin', result.data.session_token, result.data.session_expires)
    )
    return response
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { message: '잘못된 로그인 요청입니다.' } },
        { status: 400 }
      )
    }

    console.error('관리자 로그인 API 오류:', error)
    return NextResponse.json(
      { error: { message: getErrorMessage(error, '로그인 중 오류가 발생했습니다.') } },
      { status: 500 }
    )
  }
}
