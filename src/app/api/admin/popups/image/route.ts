import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateApiRequest, isAdmin } from '@/lib/auth'
import { sanitizeFileName } from '@/lib/fileValidation'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
})

// 팝업 이미지 전용 공개 버킷 (홈페이지 방문자 누구나 볼 수 있어야 함)
const POPUP_IMAGE_BUCKET = 'popup-images'

// 팝업 이미지는 이미지 형식만 허용
const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'] as const
const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB

// POST - 팝업 이미지 업로드 (multipart/form-data, field: file)
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
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: '업로드할 이미지 파일이 없습니다.' }, { status: 400 })
    }

    // 확장자 검증 (이미지만 허용)
    const extension = file.name.split('.').pop()?.toLowerCase() || ''
    if (!ALLOWED_IMAGE_EXTENSIONS.includes(extension as typeof ALLOWED_IMAGE_EXTENSIONS[number])) {
      return NextResponse.json(
        { error: `이미지 파일만 업로드할 수 있습니다. (${ALLOWED_IMAGE_EXTENSIONS.join(', ').toUpperCase()})` },
        { status: 400 }
      )
    }

    // MIME 검증 (브라우저가 MIME을 인식하지 못한 경우는 확장자만으로 허용)
    if (file.type && !file.type.startsWith('image/')) {
      return NextResponse.json({ error: '이미지 형식이 아닌 파일입니다.' }, { status: 400 })
    }

    // 크기 검증
    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: '이미지 크기는 5MB를 초과할 수 없습니다.' }, { status: 400 })
    }
    if (file.size === 0) {
      return NextResponse.json({ error: '빈 파일은 업로드할 수 없습니다.' }, { status: 400 })
    }

    const timestamp = Date.now()
    const safeFileName = sanitizeFileName(file.name)
    const filePath = `popups/${timestamp}_${safeFileName}`

    // 업로드 (버킷이 없으면 공개 버킷으로 자동 생성 후 재시도)
    let uploadError = (
      await supabaseAdmin.storage
        .from(POPUP_IMAGE_BUCKET)
        .upload(filePath, file, { cacheControl: '3600', upsert: false })
    ).error

    if (uploadError && /bucket.*not.*found/i.test(uploadError.message || '')) {
      const { error: createError } = await supabaseAdmin.storage.createBucket(POPUP_IMAGE_BUCKET, {
        public: true,
        fileSizeLimit: MAX_IMAGE_SIZE
      })

      if (createError) {
        console.error('팝업 이미지 버킷 생성 오류:', createError)
        return NextResponse.json({ error: '이미지 저장소를 준비할 수 없습니다.' }, { status: 500 })
      }

      uploadError = (
        await supabaseAdmin.storage
          .from(POPUP_IMAGE_BUCKET)
          .upload(filePath, file, { cacheControl: '3600', upsert: false })
      ).error
    }

    if (uploadError) {
      console.error('팝업 이미지 업로드 오류:', uploadError)
      return NextResponse.json({ error: '이미지 업로드에 실패했습니다.' }, { status: 500 })
    }

    // 공개 URL 반환 (public 버킷이므로 만료 없음)
    const { data: publicUrlData } = supabaseAdmin.storage
      .from(POPUP_IMAGE_BUCKET)
      .getPublicUrl(filePath)

    return NextResponse.json({
      data: {
        url: publicUrlData.publicUrl,
        path: filePath
      }
    })
  } catch (error) {
    console.error('팝업 이미지 업로드 API 오류:', error)
    return NextResponse.json({ error: '요청을 처리할 수 없습니다' }, { status: 500 })
  }
}
