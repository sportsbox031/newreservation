'use client'

import { Bell, Calendar, AlertCircle, Users, MapPin } from 'lucide-react'
import { useState } from 'react'

interface Announcement {
  id: string
  title: string
  content: string
  target_type: 'all' | 'region'
  is_important: boolean
  created_at: string
  admins: {
    username: string
  }
  regions?: {
    name: string
  }
}

interface AnnouncementCardProps {
  announcement: Announcement
  onView?: (announcement: Announcement) => void
  showContent?: boolean
  maxContentLength?: number
}

export default function AnnouncementCard({ 
  announcement, 
  onView, 
  showContent = true,
  maxContentLength = 100 
}: AnnouncementCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  const stripHtml = (html: string) => {
    // HTML 태그 제거하고 엔터티 디코딩 - 클라이언트 사이드에서만 실행
    if (typeof window !== 'undefined') {
      const tmp = document.createElement('div')
      tmp.innerHTML = html
      return tmp.textContent || tmp.innerText || ''
    }

    // 서버 사이드에서는 더 강력한 HTML 태그 제거
    let text = html
      // 스타일 태그와 내용 완전 제거
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      // 스크립트 태그와 내용 완전 제거
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      // 모든 HTML 태그 제거
      .replace(/<[^>]*>/g, '')
      // HTML 엔터티 디코딩
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&[^;]+;/g, ' ')
      // 여러 공백을 하나로 정리
      .replace(/\s+/g, ' ')
      // 앞뒤 공백 제거
      .trim()

    return text
  }

  const truncateContent = (content: string, maxLength: number) => {
    // HTML 태그를 제거한 후 텍스트만 추출
    const plainText = stripHtml(content)
    if (plainText.length <= maxLength) return plainText
    return plainText.substring(0, maxLength) + '...'
  }

  const handleClick = () => {
    if (onView) {
      onView(announcement)
    }
  }

  return (
    <div
      onClick={handleClick}
      className={`
        bg-white rounded-lg shadow-sm border border-gray-200 p-6 
        ${onView ? 'hover:shadow-md hover:border-blue-200 cursor-pointer' : ''}
        transition-all duration-200
        ${announcement.is_important ? 'ring-2 ring-red-100 border-red-200' : ''}
      `}
    >
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          {/* 뱃지들 */}
          <div className="flex items-center gap-2 mb-3">
            {announcement.is_important && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                <AlertCircle className="w-3 h-3" />
                중요
              </span>
            )}
            {announcement.target_type === 'all' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                <Users className="w-3 h-3" />
                전체 공지
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                <MapPin className="w-3 h-3" />
                {announcement.regions?.name || '지역'} 공지
              </span>
            )}
          </div>
          
          {/* 제목 */}
          <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-1">
            {announcement.title}
          </h3>
          
          {/* 내용 */}
          {showContent && (
            <div className="text-gray-600 text-sm mb-3 line-clamp-2">
              {truncateContent(announcement.content, maxContentLength)}
            </div>
          )}
          
          {/* 메타 정보 */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{formatDate(announcement.created_at)}</span>
            </div>
            <span>작성자: {announcement.admins.username}</span>
          </div>
        </div>
        
        {/* 날짜 (오른쪽) */}
        <div className="text-right text-sm text-gray-500 whitespace-nowrap">
          <div>{formatDate(announcement.created_at)}</div>
        </div>
      </div>
    </div>
  )
}