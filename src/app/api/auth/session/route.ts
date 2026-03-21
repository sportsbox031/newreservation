import { NextRequest, NextResponse } from 'next/server'

import { getAuthTokenFromRequest } from '@/lib/authCookies'
import { refreshUserSessionOnServer, validateUserSessionOnServer } from '@/lib/authServer'
import { getErrorMessage } from '@/lib/requestUtils'

export async function GET(request: NextRequest) {
  try {
    const token = getAuthTokenFromRequest(request, ['user'])
    if (!token) {
      return NextResponse.json({ error: { message: '세션 토큰이 없습니다.' } }, { status: 401 })
    }

    const result = await validateUserSessionOnServer(token)
    if (result.error || !result.data) {
      return NextResponse.json(
        { error: result.error || { message: '세션이 만료되었거나 유효하지 않습니다.' } },
        { status: 401 }
      )
    }

    return NextResponse.json({ data: result.data })
  } catch (error) {
    console.error('세션 검증 API 오류:', error)
    return NextResponse.json(
      { error: { message: getErrorMessage(error, '세션 검증 중 오류가 발생했습니다.') } },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const token = getAuthTokenFromRequest(request, ['user'])
    if (!token) {
      return NextResponse.json({ error: { message: '세션 토큰이 없습니다.' } }, { status: 401 })
    }

    const result = await refreshUserSessionOnServer(token)
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ data: result.data })
  } catch (error) {
    console.error('세션 갱신 API 오류:', error)
    return NextResponse.json(
      { error: { message: getErrorMessage(error, '세션 갱신 중 오류가 발생했습니다.') } },
      { status: 500 }
    )
  }
}
