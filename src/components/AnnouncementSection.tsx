'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { announcementAPI } from '@/lib/supabase'
import { Bell, ChevronRight } from 'lucide-react'
import AnnouncementCard from './AnnouncementCard'

interface Announcement {
  id: string
  title: string
  content: string
  target_type: 'all' | 'region'
  is_important: boolean
  view_count: number
  created_at: string
  admins: {
    username: string
  }
  regions?: {
    name: string
  }
}

interface AnnouncementSectionProps {
  userId?: string
  maxItems?: number
  showHeader?: boolean
  className?: string
}

export default function AnnouncementSection({ 
  userId,
  maxItems = 3,
  showHeader = true,
  className = ''
}: AnnouncementSectionProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userId) {
      loadAnnouncements()
    } else {
      setLoading(false)
    }
  }, [userId])

  const loadAnnouncements = async () => {
    if (!userId) return
    
    try {
      const { data, error } = await announcementAPI.getAnnouncementsForUser(userId)
      
      if (error) {
        console.error('공지사항 로드 오류:', error)
      } else {
        // 최대 개수만큼만 표시
        setAnnouncements((data || []).slice(0, maxItems))
      }
    } catch (error) {
      console.error('공지사항 로드 예외:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          {showHeader && (
            <div className="flex items-center justify-between mb-4">
              <div className="h-6 bg-gray-200 rounded w-24"></div>
              <div className="h-4 bg-gray-200 rounded w-16"></div>
            </div>
          )}
          <div className="space-y-3">
            {Array.from({ length: Math.min(3, maxItems) }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!userId) {
    return null
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {showHeader && (
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">공지사항</h2>
          </div>
          <Link 
            href="/announcements"
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            전체보기
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      <div className="p-6">
        {announcements.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Bell className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">등록된 공지사항이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement, index) => (
              <div key={announcement.id}>
                <Link href={`/announcements?id=${announcement.id}`}>
                  <AnnouncementCard 
                    announcement={announcement} 
                    showContent={false}
                    onView={async (announcement) => {
                      // 조회수 증가 처리
                      try {
                        await announcementAPI.incrementViewCount(announcement.id, userId)
                        // 상태 업데이트는 여기서는 하지 않음 (페이지 이동하므로)
                      } catch (error) {
                        console.error('조회수 증가 오류:', error)
                      }
                    }}
                  />
                </Link>
                {index < announcements.length - 1 && (
                  <hr className="my-4 border-gray-100" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}