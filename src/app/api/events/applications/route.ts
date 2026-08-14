// src/app/api/events/applications/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { validateUserApiRequest } from '@/lib/auth'
import { validateApplicationInput } from '@/lib/eventApplicationHelpers'
import {
  createApplicationOnServer,
  listMyApplicationsOnServer,
  cancelApplicationOnServer,
} from '@/lib/eventApplicationServer'
import { getErrorMessage } from '@/lib/requestUtils'

async function requireUser(request: NextRequest) {
  const auth = await validateUserApiRequest(request)
  if (!auth.authenticated || !auth.user) {
    return { ok: false as const, response: NextResponse.json({ error: { message: auth.error || '로그인이 필요합니다.' } }, { status: 401 }) }
  }
  return { ok: true as const, user: auth.user }
}

export async function POST(request: NextRequest) {
  const u = await requireUser(request)
  if (!u.ok) return u.response
  try {
    const body = await request.json().catch(() => ({}))
    const parsed = validateApplicationInput(body)
    if (!parsed.ok) return NextResponse.json({ error: { message: parsed.message } }, { status: 400 })

    const result = await createApplicationOnServer(parsed.value, u.user.id, new Date().toISOString())
    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status ?? 400 })
    return NextResponse.json({ data: result.data })
  } catch (e) {
    return NextResponse.json({ error: { message: getErrorMessage(e, '신청 처리 중 오류가 발생했습니다.') } }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const u = await requireUser(request)
  if (!u.ok) return u.response
  try {
    const result = await listMyApplicationsOnServer(u.user.id)
    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status ?? 400 })
    return NextResponse.json({ data: result.data ?? [] })
  } catch (e) {
    return NextResponse.json({ error: { message: getErrorMessage(e, '신청 내역을 불러오는 중 오류가 발생했습니다.') } }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const u = await requireUser(request)
  if (!u.ok) return u.response
  try {
    const id = new URL(request.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: { message: 'ID가 필요합니다.' } }, { status: 400 })
    const result = await cancelApplicationOnServer(id, u.user.id)
    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status ?? 400 })
    return NextResponse.json({ data: result.data })
  } catch (e) {
    return NextResponse.json({ error: { message: getErrorMessage(e, '신청 취소 중 오류가 발생했습니다.') } }, { status: 500 })
  }
}
