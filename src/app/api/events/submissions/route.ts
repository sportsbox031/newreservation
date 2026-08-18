import { NextRequest, NextResponse } from 'next/server'
import { validateUserApiRequest } from '@/lib/auth'
import {
  uploadSubmissionOnServer,
  deleteSubmissionOnServer,
  listMySubmissionsOnServer,
  signedUrlForOwnSubmissionOnServer,
} from '@/lib/eventSubmissionServer'
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
    const form = await request.formData()
    const applicationId = form.get('application_id')
    const file = form.get('file')
    if (typeof applicationId !== 'string' || !applicationId) return NextResponse.json({ error: { message: '신청 정보가 필요합니다.' } }, { status: 400 })
    if (!(file instanceof File)) return NextResponse.json({ error: { message: '업로드할 파일이 없습니다.' } }, { status: 400 })
    const result = await uploadSubmissionOnServer(applicationId, u.user.id, file)
    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status ?? 400 })
    return NextResponse.json({ data: result.data })
  } catch (e) {
    return NextResponse.json({ error: { message: getErrorMessage(e, '서류 제출 중 오류가 발생했습니다.') } }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const u = await requireUser(request)
  if (!u.ok) return u.response
  try {
    const sp = new URL(request.url).searchParams
    const downloadId = sp.get('download_id')
    if (downloadId) {
      const result = await signedUrlForOwnSubmissionOnServer(downloadId, u.user.id)
      if (result.error) return NextResponse.json({ error: result.error }, { status: result.status ?? 400 })
      return NextResponse.json({ data: result.data })
    }
    const applicationId = sp.get('application_id')
    if (!applicationId) return NextResponse.json({ error: { message: 'application_id가 필요합니다.' } }, { status: 400 })
    const result = await listMySubmissionsOnServer(applicationId, u.user.id)
    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status ?? 400 })
    return NextResponse.json({ data: result.data ?? [] })
  } catch (e) {
    return NextResponse.json({ error: { message: getErrorMessage(e, '서류 조회 중 오류가 발생했습니다.') } }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const u = await requireUser(request)
  if (!u.ok) return u.response
  try {
    const id = new URL(request.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: { message: 'ID가 필요합니다.' } }, { status: 400 })
    const result = await deleteSubmissionOnServer(id, u.user.id)
    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status ?? 400 })
    return NextResponse.json({ data: result.data })
  } catch (e) {
    return NextResponse.json({ error: { message: getErrorMessage(e, '서류 삭제 중 오류가 발생했습니다.') } }, { status: 500 })
  }
}
