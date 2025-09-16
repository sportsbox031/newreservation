import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

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

    // 공지사항 생성
    const insertData = {
      title: data.title,
      content: data.content,
      target_type: data.target_type,
      target_region_id: data.target_region_id || null,
      is_important: data.is_important || false,
      is_published: data.is_published || true,
      author_id: authorId
    }

    const { data: announcement, error } = await supabaseAdmin
      .from('announcements')
      .insert([insertData])
      .select(`
        *,
        admins(username),
        regions(name)
      `)

    if (error) {
      console.error('공지사항 생성 오류:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data: announcement })
  } catch (error) {
    console.error('API 오류:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'ID가 필요합니다.' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('announcements')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('공지사항 삭제 오류:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API 오류:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'ID가 필요합니다.' }, { status: 400 })
    }

    const data = await request.json()
    
    const updateData = {
      title: data.title,
      content: data.content,
      target_type: data.target_type,
      target_region_id: data.target_region_id || null,
      is_important: data.is_important || false,
      is_published: data.is_published || true,
      updated_at: new Date().toISOString()
    }

    const { data: announcement, error } = await supabaseAdmin
      .from('announcements')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        admins(username),
        regions(name)
      `)

    if (error) {
      console.error('공지사항 수정 오류:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data: announcement })
  } catch (error) {
    console.error('API 오류:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}