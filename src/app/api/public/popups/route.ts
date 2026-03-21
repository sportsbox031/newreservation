import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { getErrorMessage, withTimeout } from '@/lib/requestUtils'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false
  }
})

const PUBLIC_POPUPS_CACHE_TTL_MS = 60 * 1000
const PUBLIC_POPUPS_TIMEOUT_MS = 15000

type PublicPopupsCache = {
  data: unknown[]
  expiresAt: number
}

let publicPopupsCache: PublicPopupsCache | null = null

export async function GET() {
  const now = Date.now()

  if (publicPopupsCache && publicPopupsCache.expiresAt > now) {
    return NextResponse.json(
      { data: publicPopupsCache.data, cached: true },
      {
        headers: {
          'Cache-Control': 's-maxage=60, stale-while-revalidate=300'
        }
      }
    )
  }

  const currentTime = new Date().toISOString()

  try {
    const { data, error } = await withTimeout(
      supabaseAdmin
        .from('homepage_popups')
        .select(`
          *,
          admins(username)
        `)
        .eq('is_active', true)
        .lte('start_date', currentTime)
        .or(`end_date.is.null,end_date.gte.${currentTime}`)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false }),
      PUBLIC_POPUPS_TIMEOUT_MS,
      '팝업 정보를 불러오는 중 시간이 초과되었습니다.'
    )

    if (error) {
      throw error
    }

    const responseData = data || []
    publicPopupsCache = {
      data: responseData,
      expiresAt: now + PUBLIC_POPUPS_CACHE_TTL_MS
    }

    return NextResponse.json(
      { data: responseData, cached: false },
      {
        headers: {
          'Cache-Control': 's-maxage=60, stale-while-revalidate=300'
        }
      }
    )
  } catch (error) {
    if (publicPopupsCache) {
      return NextResponse.json(
        { data: publicPopupsCache.data, cached: true, stale: true },
        {
          headers: {
            'Cache-Control': 's-maxage=60, stale-while-revalidate=300'
          }
        }
      )
    }

    return NextResponse.json(
      { error: getErrorMessage(error, '팝업 정보를 불러오는 중 오류가 발생했습니다.') },
      { status: 500 }
    )
  }
}
