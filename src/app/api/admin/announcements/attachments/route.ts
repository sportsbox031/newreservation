import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateApiRequest, isAdmin } from '@/lib/auth'
import { validateFileMetadata, validateAttachmentCount } from '@/lib/fileValidation'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
})

// POST - 첨부파일 레코드 생성 (파일 업로드 후 메타데이터 저장)
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

    const data = await request.json()

    // 필수 필드 검증
    if (!data.announcement_id || !data.file_name || !data.file_size || !data.file_type || !data.storage_path) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 첨부파일 개수 확인 (최대 3개)
    const { data: existingAttachments } = await supabaseAdmin
      .from('announcement_attachments')
      .select('id')
      .eq('announcement_id', data.announcement_id)

    const countValidation = validateAttachmentCount(existingAttachments?.length || 0)
    if (!countValidation.valid) {
      return NextResponse.json({ error: countValidation.error }, { status: 400 })
    }

    // 서버 사이드 파일 메타데이터 검증
    const fileValidation = validateFileMetadata(
      data.file_name,
      data.file_size,
      data.file_type
    )

    if (!fileValidation.valid) {
      return NextResponse.json({ error: fileValidation.error }, { status: 400 })
    }

    // 첨부파일 레코드 생성
    const { data: attachment, error } = await supabaseAdmin
      .from('announcement_attachments')
      .insert([{
        announcement_id: data.announcement_id,
        file_name: data.file_name,
        file_size: data.file_size,
        file_type: data.file_type,
        storage_path: data.storage_path
      }])
      .select()
      .single()

    if (error) {
      console.error('Attachment creation error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data: attachment })
  } catch (error) {
    console.error('Attachment API error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// DELETE - 첨부파일 삭제
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
    const storagePath = url.searchParams.get('path')

    if (!id || !storagePath) {
      return NextResponse.json({ error: 'Missing id or path parameter' }, { status: 400 })
    }

    // Storage에서 파일 삭제
    const { error: storageError } = await supabaseAdmin.storage
      .from('announcement-attachments')
      .remove([storagePath])

    if (storageError) {
      console.error('Storage deletion error:', storageError)
      // Storage 삭제 실패해도 DB 레코드는 삭제 진행
    }

    // 데이터베이스에서 레코드 삭제
    const { error } = await supabaseAdmin
      .from('announcement_attachments')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Database deletion error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete API error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// GET - 특정 공지사항의 첨부파일 목록 조회
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const announcementId = url.searchParams.get('announcement_id')

    if (!announcementId) {
      return NextResponse.json({ error: 'Missing announcement_id parameter' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('announcement_attachments')
      .select('*')
      .eq('announcement_id', announcementId)
      .order('uploaded_at', { ascending: true })

    if (error) {
      console.error('Get attachments error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Get API error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
