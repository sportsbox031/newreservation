import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { validateApiRequest, isAdmin } from '@/lib/auth'

// 서버측에서 서비스 롤 키 사용
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false
  }
})

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
    
    // 기본 관리자 ID 가져오기 (실제 존재하는 관리자 사용)
    let authorId = data.author_id
    
    if (!authorId) {
      // 첫 번째 관리자를 기본값으로 사용
      const { data: adminData } = await supabaseAdmin
        .from('admins')
        .select('id')
        .limit(1)
        .single()
      
      authorId = adminData?.id || null
    }

    // 팝업 생성
    const insertData = {
      title: data.title,
      content: data.content,
      content_type: data.content_type || 'html',
      is_active: data.is_active !== undefined ? data.is_active : true,
      start_date: data.start_date,
      end_date: data.end_date || null,
      author_id: authorId,
      display_order: data.display_order || 0
    }

    const { data: popup, error } = await supabaseAdmin
      .from('homepage_popups')
      .insert([insertData])
      .select(`
        *,
        admins(id, username)
      `)

    if (error) {
      console.error('팝업 생성 오류:', error)
      return NextResponse.json({ error: '팝업을 생성할 수 없습니다' }, { status: 400 })
    }

    return NextResponse.json({ data: popup })
  } catch (error) {
    console.error('API 오류:', error)
    return NextResponse.json({ error: '요청을 처리할 수 없습니다' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabaseAdmin
      .from('homepage_popups')
      .select(`
        *,
        admins(id, username)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('팝업 조회 오류:', error)
      return NextResponse.json({ error: '팝업을 조회할 수 없습니다' }, { status: 400 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('API 오류:', error)
    return NextResponse.json({ error: '요청을 처리할 수 없습니다' }, { status: 500 })
  }
}

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
      return NextResponse.json({ error: 'ID가 필요합니다.' }, { status: 400 })
    }

    // 팝업 조회하여 작성자 확인
    const { data: popup } = await supabaseAdmin
      .from('homepage_popups')
      .select('author_id')
      .eq('id', id)
      .single()

    if (!popup) {
      return NextResponse.json({ error: '팝업을 찾을 수 없습니다' }, { status: 404 })
    }

    // super 관리자가 아니면 본인이 작성한 팝업만 삭제 가능
    if (authResult.user.role !== 'super' && popup.author_id !== authResult.user.id) {
      return NextResponse.json({ error: '본인이 작성한 팝업만 삭제할 수 있습니다' }, { status: 403 })
    }

    const { error } = await supabaseAdmin
      .from('homepage_popups')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('팝업 삭제 오류:', error)
      return NextResponse.json({ error: '팝업을 삭제할 수 없습니다' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API 오류:', error)
    return NextResponse.json({ error: '요청을 처리할 수 없습니다' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
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
      return NextResponse.json({ error: 'ID가 필요합니다.' }, { status: 400 })
    }

    // 팝업 조회하여 작성자 확인
    const { data: existingPopup } = await supabaseAdmin
      .from('homepage_popups')
      .select('author_id')
      .eq('id', id)
      .single()

    if (!existingPopup) {
      return NextResponse.json({ error: '팝업을 찾을 수 없습니다' }, { status: 404 })
    }

    // super 관리자가 아니면 본인이 작성한 팝업만 수정 가능
    if (authResult.user.role !== 'super' && existingPopup.author_id !== authResult.user.id) {
      return NextResponse.json({ error: '본인이 작성한 팝업만 수정할 수 있습니다' }, { status: 403 })
    }

    const data = await request.json()

    const updateData = {
      title: data.title,
      content: data.content,
      content_type: data.content_type || 'html',
      is_active: data.is_active !== undefined ? data.is_active : true,
      start_date: data.start_date,
      end_date: data.end_date || null,
      display_order: data.display_order || 0,
      updated_at: new Date().toISOString()
    }

    const { data: popup, error } = await supabaseAdmin
      .from('homepage_popups')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        admins(id, username)
      `)

    if (error) {
      console.error('팝업 수정 오류:', error)
      return NextResponse.json({ error: '팝업을 수정할 수 없습니다' }, { status: 400 })
    }

    return NextResponse.json({ data: popup })
  } catch (error) {
    console.error('API 오류:', error)
    return NextResponse.json({ error: '요청을 처리할 수 없습니다' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
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
      return NextResponse.json({ error: 'ID가 필요합니다.' }, { status: 400 })
    }

    // 팝업 조회하여 작성자 확인
    const { data: existingPopup } = await supabaseAdmin
      .from('homepage_popups')
      .select('author_id')
      .eq('id', id)
      .single()

    if (!existingPopup) {
      return NextResponse.json({ error: '팝업을 찾을 수 없습니다' }, { status: 404 })
    }

    // super 관리자가 아니면 본인이 작성한 팝업만 상태 변경 가능
    if (authResult.user.role !== 'super' && existingPopup.author_id !== authResult.user.id) {
      return NextResponse.json({ error: '본인이 작성한 팝업만 상태를 변경할 수 있습니다' }, { status: 403 })
    }

    const data = await request.json()

    // 상태 토글용 업데이트 - is_active 필드만 업데이트
    const updateData = {
      is_active: data.is_active,
      updated_at: new Date().toISOString()
    }

    const { data: popup, error } = await supabaseAdmin
      .from('homepage_popups')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        admins(id, username)
      `)

    if (error) {
      console.error('팝업 상태 변경 오류:', error)
      return NextResponse.json({ error: '팝업 상태를 변경할 수 없습니다' }, { status: 400 })
    }

    return NextResponse.json({ data: popup })
  } catch (error) {
    console.error('API 오류:', error)
    return NextResponse.json({ error: '요청을 처리할 수 없습니다' }, { status: 500 })
  }
}