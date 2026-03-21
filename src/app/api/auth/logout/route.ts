import { NextRequest, NextResponse } from 'next/server'

import {
  buildClearedSessionCookieOptions,
  getAuthTokenFromRequest,
  getSessionCookieName,
} from '@/lib/authCookies'
import { logoutSessionOnServer } from '@/lib/authServer'
import { getErrorMessage } from '@/lib/requestUtils'

export async function POST(request: NextRequest) {
  try {
    const token = getAuthTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: { message: '세션 토큰이 없습니다.' } }, { status: 401 })
    }

    const result = await logoutSessionOnServer(token)
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    const response = NextResponse.json({ data: result.data ?? [] })
    response.cookies.set(getSessionCookieName('user'), '', buildClearedSessionCookieOptions())
    response.cookies.set(getSessionCookieName('admin'), '', buildClearedSessionCookieOptions())
    return response
  } catch (error) {
    console.error('로그아웃 API 오류:', error)
    return NextResponse.json(
      { error: { message: getErrorMessage(error, '로그아웃 중 오류가 발생했습니다.') } },
      { status: 500 }
    )
  }
}
