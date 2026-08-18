import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateApiRequest, isAdmin } from '@/lib/auth'
import { validateFileMetadata, validateAttachmentCount, sanitizeFileName, EVENT_DOCUMENT_EXTENSIONS } from '@/lib/fileValidation'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
})

// 이벤트 서류양식 전용 비공개 버킷 (관리자만 업로드/다운로드 가능해야 함)
const EVENT_FILES_BUCKET = 'event-files'

// 이벤트당 최대 서류양식 파일 개수
const MAX_FILES_PER_EVENT = 5

// POST - 이벤트 서류양식 파일 업로드 (multipart/form-data, fields: event_id, file)
export async function POST(request: NextRequest) {
  try {
    // 인증 검증
    const authResult = await validateApiRequest(request)
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 401 })
    }

    // 관리자 권한 검증
    if (!isAdmin(authResult.user)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const formData = await request.formData()
    const eventId = formData.get('event_id')
    const file = formData.get('file')

    if (typeof eventId !== 'string' || !eventId) {
      return NextResponse.json({ error: { message: '이벤트 ID가 필요합니다.' } }, { status: 400 })
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: { message: '업로드할 파일이 없습니다.' } }, { status: 400 })
    }

    // 이벤트당 최대 서류양식 개수 확인
    const { data: existingFiles, error: countError } = await supabaseAdmin
      .from('event_form_files')
      .select('id')
      .eq('event_id', eventId)

    if (countError) {
      console.error('서류양식 개수 조회 오류:', countError)
      return NextResponse.json({ error: { message: '서류양식 개수를 확인할 수 없습니다.' } }, { status: 500 })
    }

    const countValidation = validateAttachmentCount(existingFiles?.length || 0, MAX_FILES_PER_EVENT)
    if (!countValidation.valid) {
      return NextResponse.json({ error: { message: countValidation.error } }, { status: 400 })
    }

    // 서버 사이드 파일 메타데이터 검증
    const fileValidation = validateFileMetadata(file.name, file.size, file.type, EVENT_DOCUMENT_EXTENSIONS)
    if (!fileValidation.valid) {
      return NextResponse.json({ error: { message: fileValidation.error } }, { status: 400 })
    }

    const timestamp = Date.now()
    const safeFileName = sanitizeFileName(file.name)
    const filePath = `templates/${eventId}/${timestamp}_${safeFileName}`

    // 업로드 (버킷이 없으면 비공개 버킷으로 자동 생성 후 재시도)
    let uploadError = (
      await supabaseAdmin.storage
        .from(EVENT_FILES_BUCKET)
        .upload(filePath, file, { cacheControl: '3600', upsert: false })
    ).error

    if (uploadError && /bucket.*not.*found/i.test(uploadError.message || '')) {
      const { error: createError } = await supabaseAdmin.storage.createBucket(EVENT_FILES_BUCKET, {
        public: false
      })

      if (createError) {
        console.error('서류양식 버킷 생성 오류:', createError)
        return NextResponse.json({ error: { message: '파일 저장소를 준비할 수 없습니다.' } }, { status: 500 })
      }

      uploadError = (
        await supabaseAdmin.storage
          .from(EVENT_FILES_BUCKET)
          .upload(filePath, file, { cacheControl: '3600', upsert: false })
      ).error
    }

    if (uploadError) {
      console.error('서류양식 업로드 오류:', uploadError)
      return NextResponse.json({ error: { message: '파일 업로드에 실패했습니다.' } }, { status: 500 })
    }

    // 서류양식 메타데이터 레코드 생성
    const { data: formFile, error } = await supabaseAdmin
      .from('event_form_files')
      .insert([{
        event_id: eventId,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        storage_path: filePath
      }])
      .select()
      .single()

    if (error) {
      console.error('서류양식 레코드 생성 오류:', error)
      // 메타데이터 저장에 실패하면 이미 업로드된 스토리지 객체를 정리한다
      await supabaseAdmin.storage.from(EVENT_FILES_BUCKET).remove([filePath])
      return NextResponse.json({ error: { message: '서류양식을 등록할 수 없습니다.' } }, { status: 400 })
    }

    return NextResponse.json({ data: formFile })
  } catch (error) {
    console.error('서류양식 업로드 API 오류:', error)
    return NextResponse.json({ error: { message: '요청을 처리할 수 없습니다.' } }, { status: 500 })
  }
}

// DELETE - 이벤트 서류양식 파일 삭제 (?id=&path=)
export async function DELETE(request: NextRequest) {
  try {
    // 인증 검증
    const authResult = await validateApiRequest(request)
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 401 })
    }

    // 관리자 권한 검증
    if (!isAdmin(authResult.user)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: { message: 'id 파라미터가 필요합니다.' } }, { status: 400 })
    }

    // storage_path는 클라이언트가 보낸 값을 신뢰하지 않고 레코드에서 직접 조회한다.
    // (클라이언트 path를 그대로 쓰면 인증된 관리자가 같은 버킷의 임의 객체(예: 사용자 제출 서류)를
    //  삭제하거나 DB-스토리지 불일치를 유발할 수 있음)
    const { data: formFile, error: fetchError } = await supabaseAdmin
      .from('event_form_files')
      .select('id, storage_path')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) {
      console.error('서류양식 조회 오류:', fetchError)
      return NextResponse.json({ error: { message: '서류양식 정보를 확인할 수 없습니다.' } }, { status: 500 })
    }
    if (!formFile) {
      return NextResponse.json({ error: { message: '서류양식을 찾을 수 없습니다.' } }, { status: 404 })
    }

    // 데이터베이스 레코드를 먼저 삭제한다(레코드가 소스 오브 트루스).
    const { error } = await supabaseAdmin
      .from('event_form_files')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('서류양식 DB 삭제 오류:', error)
      return NextResponse.json({ error: { message: '서류양식을 삭제할 수 없습니다.' } }, { status: 400 })
    }

    // DB 삭제 성공 후 스토리지 객체 정리(실패해도 orphan 파일만 남으므로 응답은 성공)
    const { error: storageError } = await supabaseAdmin.storage
      .from(EVENT_FILES_BUCKET)
      .remove([formFile.storage_path])

    if (storageError) {
      console.error('서류양식 스토리지 삭제 오류:', storageError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('서류양식 삭제 API 오류:', error)
    return NextResponse.json({ error: { message: '요청을 처리할 수 없습니다.' } }, { status: 500 })
  }
}
