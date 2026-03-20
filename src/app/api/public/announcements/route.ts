import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getErrorMessage, withTimeout } from '@/lib/requestUtils'

const PUBLIC_ANNOUNCEMENTS_CACHE_TTL_MS = 60 * 1000
const PUBLIC_ANNOUNCEMENTS_TIMEOUT_MS = 15000

type PublicAnnouncementsCache = {
  data: unknown[]
  expiresAt: number
}

let publicAnnouncementsCache: PublicAnnouncementsCache | null = null

export async function GET() {
  const now = Date.now()

  if (publicAnnouncementsCache && publicAnnouncementsCache.expiresAt > now) {
    return NextResponse.json(
      { data: publicAnnouncementsCache.data, cached: true },
      {
        headers: {
          'Cache-Control': 's-maxage=60, stale-while-revalidate=300'
        }
      }
    )
  }

  try {
    const { data, error } = await withTimeout(
      supabase
        .from('announcements')
        .select(`
          *,
          admins(username),
          regions(name)
        `)
        .eq('is_published', true)
        .order('is_important', { ascending: false })
        .order('created_at', { ascending: false }),
      PUBLIC_ANNOUNCEMENTS_TIMEOUT_MS,
      '공지사항을 불러오는 중 시간이 초과되었습니다.'
    )

    if (error) {
      throw error
    }

    const responseData = data || []
    publicAnnouncementsCache = {
      data: responseData,
      expiresAt: now + PUBLIC_ANNOUNCEMENTS_CACHE_TTL_MS
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
    if (publicAnnouncementsCache) {
      return NextResponse.json(
        { data: publicAnnouncementsCache.data, cached: true, stale: true },
        {
          headers: {
            'Cache-Control': 's-maxage=60, stale-while-revalidate=300'
          }
        }
      )
    }

    return NextResponse.json(
      { error: getErrorMessage(error, '공지사항을 불러오는 중 오류가 발생했습니다.') },
      { status: 500 }
    )
  }
}
