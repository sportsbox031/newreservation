// src/lib/eventSubmissionServer.ts
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { getErrorMessage, withTimeout } from '@/lib/requestUtils'
import { canSubmit } from '@/lib/eventSubmissionHelpers'
import { validateFileMetadata, validateAttachmentCount, sanitizeFileName, EVENT_DOCUMENT_EXTENSIONS } from '@/lib/fileValidation'
import type { ServerResult } from '@/lib/eventApplicationServer'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
const T = 8000
const BUCKET = 'event-files'
const MAX_SUBMISSIONS = 10

export type SubmissionRow = {
  id: string
  application_id: string
  file_name: string
  file_size: number
  file_type: string
  storage_path: string
  uploaded_at: string
}
export type AdminSubmissionGroup = {
  application_id: string
  org_name: string
  manager_name: string | null
  phone: string | null
  status: string
  submissions: SubmissionRow[]
}

// 신청건을 소유한 사용자인지 + 상태를 확인해 반환
async function loadOwnedApplication(applicationId: string, userId: string): Promise<{ status: string } | null> {
  const { data } = await withTimeout(
    supabaseAdmin.from('event_applications').select('id, user_id, status').eq('id', applicationId).maybeSingle(),
    T, '신청 정보를 확인하는 중 시간이 초과되었습니다.'
  )
  if (!data || data.user_id !== userId) return null
  return { status: data.status }
}

export async function uploadSubmissionOnServer(applicationId: string, userId: string, file: File): Promise<ServerResult<SubmissionRow>> {
  try {
    const app = await loadOwnedApplication(applicationId, userId)
    if (!app) return { data: null, error: { message: '본인 신청건에만 서류를 제출할 수 있습니다.' }, status: 403 }
    if (!canSubmit(app.status)) return { data: null, error: { message: '취소된 신청건에는 서류를 제출할 수 없습니다.' }, status: 400 }

    const { data: existing, error: cErr } = await withTimeout(
      supabaseAdmin.from('event_submissions').select('id').eq('application_id', applicationId),
      T, '제출 서류 개수를 확인하는 중 시간이 초과되었습니다.'
    )
    if (cErr) return { data: null, error: { message: '제출 서류 개수를 확인할 수 없습니다.' }, status: 500 }
    const countCheck = validateAttachmentCount(existing?.length || 0, MAX_SUBMISSIONS)
    if (!countCheck.valid) return { data: null, error: { message: countCheck.error || '제출 개수를 초과했습니다.' }, status: 400 }

    const fileCheck = validateFileMetadata(file.name, file.size, file.type, EVENT_DOCUMENT_EXTENSIONS)
    if (!fileCheck.valid) return { data: null, error: { message: fileCheck.error || '허용되지 않는 파일입니다.' }, status: 400 }

    const timestamp = Date.now()
    const filePath = `submissions/${applicationId}/${timestamp}_${sanitizeFileName(file.name)}`

    let uploadErr = (await supabaseAdmin.storage.from(BUCKET).upload(filePath, file, { cacheControl: '3600', upsert: false })).error
    if (uploadErr && /bucket.*not.*found/i.test(uploadErr.message || '')) {
      const { error: createErr } = await supabaseAdmin.storage.createBucket(BUCKET, { public: false })
      if (createErr) return { data: null, error: { message: '파일 저장소를 준비할 수 없습니다.' }, status: 500 }
      uploadErr = (await supabaseAdmin.storage.from(BUCKET).upload(filePath, file, { cacheControl: '3600', upsert: false })).error
    }
    if (uploadErr) return { data: null, error: { message: '파일 업로드에 실패했습니다.' }, status: 500 }

    const { data: row, error: insErr } = await withTimeout(
      supabaseAdmin.from('event_submissions').insert([{
        application_id: applicationId, file_name: file.name, file_size: file.size, file_type: file.type, storage_path: filePath,
      }]).select().single(),
      T, '서류 정보를 저장하는 중 시간이 초과되었습니다.'
    )
    if (insErr || !row) {
      await supabaseAdmin.storage.from(BUCKET).remove([filePath])
      return { data: null, error: { message: '서류를 등록할 수 없습니다.' }, status: 400 }
    }
    return { data: row as SubmissionRow, error: null }
  } catch (e) {
    return { data: null, error: { message: getErrorMessage(e, '서류 제출 중 오류가 발생했습니다.') }, status: 500 }
  }
}

async function loadOwnedSubmission(id: string, userId: string): Promise<SubmissionRow | null> {
  const { data } = await withTimeout(
    supabaseAdmin.from('event_submissions').select('*, event_applications!inner(user_id)').eq('id', id).maybeSingle(),
    T, '서류 정보를 확인하는 중 시간이 초과되었습니다.'
  )
  if (!data) return null
  const owner = (data as Record<string, unknown>).event_applications as { user_id?: string } | null
  if (!owner || owner.user_id !== userId) return null
  const { event_applications, ...row } = data as Record<string, unknown>
  void event_applications
  return row as SubmissionRow
}

export async function deleteSubmissionOnServer(id: string, userId: string): Promise<ServerResult<{ id: string }>> {
  try {
    const sub = await loadOwnedSubmission(id, userId)
    if (!sub) return { data: null, error: { message: '본인 제출 서류만 삭제할 수 있습니다.' }, status: 403 }
    // DB 행(소스 오브 트루스)을 먼저 삭제하고, 성공 후 스토리지 객체를 정리한다.
    // (역순이면 스토리지만 지워지고 DB 삭제가 실패할 때 실체 없는 dangling 행이 남는다)
    const { error } = await withTimeout(
      supabaseAdmin.from('event_submissions').delete().eq('id', id), T, '서류 삭제 중 시간이 초과되었습니다.'
    )
    if (error) return { data: null, error: { message: getErrorMessage(error, '서류 삭제에 실패했습니다.') }, status: 400 }
    await supabaseAdmin.storage.from(BUCKET).remove([sub.storage_path])
    return { data: { id }, error: null }
  } catch (e) {
    return { data: null, error: { message: getErrorMessage(e, '서류 삭제 중 오류가 발생했습니다.') }, status: 500 }
  }
}

export async function listMySubmissionsOnServer(applicationId: string, userId: string): Promise<ServerResult<SubmissionRow[]>> {
  try {
    const app = await loadOwnedApplication(applicationId, userId)
    if (!app) return { data: null, error: { message: '본인 신청건만 조회할 수 있습니다.' }, status: 403 }
    const { data, error } = await withTimeout(
      supabaseAdmin.from('event_submissions').select('*').eq('application_id', applicationId).order('uploaded_at', { ascending: true }),
      T, '제출 서류를 불러오는 중 시간이 초과되었습니다.'
    )
    if (error) return { data: null, error: { message: getErrorMessage(error, '제출 서류를 불러오는데 실패했습니다.') }, status: 400 }
    return { data: (data ?? []) as SubmissionRow[], error: null }
  } catch (e) {
    return { data: null, error: { message: getErrorMessage(e, '제출 서류 조회 중 오류가 발생했습니다.') }, status: 500 }
  }
}

export async function signedUrlForOwnSubmissionOnServer(id: string, userId: string): Promise<ServerResult<{ url: string }>> {
  try {
    const sub = await loadOwnedSubmission(id, userId)
    if (!sub) return { data: null, error: { message: '본인 제출 서류만 다운로드할 수 있습니다.' }, status: 403 }
    return await signUrl(sub.storage_path, sub.file_name)
  } catch (e) {
    return { data: null, error: { message: getErrorMessage(e, '다운로드 링크 생성 중 오류가 발생했습니다.') }, status: 500 }
  }
}

export async function signedUrlForSubmissionOnServer(id: string): Promise<ServerResult<{ url: string }>> {
  try {
    const { data } = await withTimeout(
      supabaseAdmin.from('event_submissions').select('storage_path, file_name').eq('id', id).maybeSingle(),
      T, '서류 정보를 확인하는 중 시간이 초과되었습니다.'
    )
    if (!data) return { data: null, error: { message: '서류를 찾을 수 없습니다.' }, status: 404 }
    return await signUrl(data.storage_path, data.file_name)
  } catch (e) {
    return { data: null, error: { message: getErrorMessage(e, '다운로드 링크 생성 중 오류가 발생했습니다.') }, status: 500 }
  }
}

async function signUrl(path: string, fileName: string): Promise<ServerResult<{ url: string }>> {
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(path, 3600, { download: fileName })
  if (error || !data?.signedUrl) return { data: null, error: { message: '다운로드 링크를 생성할 수 없습니다.' }, status: 400 }
  return { data: { url: data.signedUrl }, error: null }
}

export async function listSubmissionsForEventOnServer(eventId: string): Promise<ServerResult<AdminSubmissionGroup[]>> {
  try {
    const { data: apps, error } = await withTimeout(
      supabaseAdmin.from('event_applications')
        .select('id, applicant_org_name, applicant_manager_name, applicant_phone, status, event_submissions(*)')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true }),
      T, '신청/서류를 불러오는 중 시간이 초과되었습니다.'
    )
    if (error) return { data: null, error: { message: getErrorMessage(error, '서류 목록을 불러오는데 실패했습니다.') }, status: 400 }
    const groups: AdminSubmissionGroup[] = (apps ?? []).map((a: Record<string, unknown>) => ({
      application_id: a.id as string,
      org_name: (a.applicant_org_name as string) ?? '(단체명 없음)',
      manager_name: (a.applicant_manager_name as string) ?? null,
      phone: (a.applicant_phone as string) ?? null,
      status: a.status as string,
      submissions: ((a.event_submissions as SubmissionRow[]) ?? []),
    }))
    return { data: groups, error: null }
  } catch (e) {
    return { data: null, error: { message: getErrorMessage(e, '서류 목록 조회 중 오류가 발생했습니다.') }, status: 500 }
  }
}
