import { NextRequest, NextResponse } from 'next/server'

import { validateUserApiRequest } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { getErrorMessage, withTimeout } from '@/lib/requestUtils'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
  },
})
const QUERY_TIMEOUT_MS = 8000

export async function GET(request: NextRequest) {
  try {
    const authResult = await validateUserApiRequest(request)
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 401 })
    }

    const { data: userData, error: userError } = await withTimeout(
      supabaseAdmin
        .from('users')
        .select('cities!inner(region_id)')
        .eq('id', authResult.user.id)
        .single(),
      QUERY_TIMEOUT_MS,
      '사용자 공지사항 설정을 불러오는 중 시간이 초과되었습니다.'
    )

    if (userError) {
      return NextResponse.json({ error: userError }, { status: 400 })
    }

    const userRegionId = userData?.cities?.region_id

    let query = supabaseAdmin
      .from('announcements')
      .select(`
        *,
        admins(username),
        regions(name)
      `)
      .eq('is_published', true)

    if (userRegionId) {
      query = query.or(`target_type.eq.all,and(target_type.eq.region,target_region_id.eq.${userRegionId})`)
    } else {
      query = query.eq('target_type', 'all')
    }

    const { data, error } = await withTimeout(
      query
        .order('is_important', { ascending: false })
        .order('created_at', { ascending: false }),
      QUERY_TIMEOUT_MS,
      '공지사항 목록을 불러오는 중 시간이 초과되었습니다.'
    )

    if (error) {
      return NextResponse.json({ error }, { status: 400 })
    }

    return NextResponse.json({ data: data ?? [] })
  } catch (error) {
    console.error('사용자 공지사항 API 오류:', error)
    return NextResponse.json(
      { error: { message: getErrorMessage(error, '공지사항 목록을 불러오는 중 오류가 발생했습니다.') } },
      { status: 500 }
    )
  }
}
