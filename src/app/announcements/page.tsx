'use client'

import { useState, useEffect } from 'react'
import { announcementAPI } from '@/lib/supabase'
import { Bell, Calendar, AlertCircle } from 'lucide-react'
import { sanitizeHtml } from '@/components/RichTextEditor'

interface Announcement {
  id: string
  title: string
  content: string
  target_type: 'all' | 'region'
  is_important: boolean
  created_at: string
  updated_at: string
  admins: {
    username: string
  }
  regions?: {
    name: string
  }
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    loadAnnouncements()
  }, [])

  const loadAnnouncements = async () => {
    try {
      // 현재 로그인한 사용자 정보 가져오기
      const userInfo = localStorage.getItem('userInfo')
      
      if (!userInfo) {
        // 사용자 정보가 없으면 전체 공지만 가져오기
        const { data, error } = await announcementAPI.getPublicAnnouncements()
        
        if (error) {
          console.error('공지사항 로드 오류:', error)
        } else {
          setAnnouncements(data || [])
        }
        return
      }
      
      const userData = JSON.parse(userInfo)
      const { data, error } = await announcementAPI.getAnnouncementsForUser(userData.id)
      
      if (error) {
        console.error('공지사항 로드 오류:', error)
      } else {
        setAnnouncements(data || [])
      }
    } catch (error) {
      console.error('공지사항 로드 예외:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAnnouncementClick = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement)
    setShowModal(true)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  const truncateContent = (content: string, maxLength: number = 100) => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength) + '...'
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Bell className="w-7 h-7 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">공지사항</h1>
        </div>
        <p className="text-gray-600">스포츠박스 관련 중요한 소식을 확인하세요.</p>
      </div>

      <div className="space-y-4">
        {announcements.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Bell className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>등록된 공지사항이 없습니다.</p>
          </div>
        ) : (
          announcements.map((announcement) => (
            <div
              key={announcement.id}
              onClick={() => handleAnnouncementClick(announcement)}
              className={`
                bg-white rounded-lg shadow-sm border border-gray-200 p-6 
                hover:shadow-md hover:border-blue-200 cursor-pointer transition-all duration-200
                ${announcement.is_important ? 'ring-2 ring-red-100 border-red-200' : ''}
              `}
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {announcement.is_important && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                        <AlertCircle className="w-3 h-3" />
                        중요
                      </span>
                    )}
                    {announcement.target_type === 'all' ? (
                      <span className="inline-flex px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                        전체 공지
                      </span>
                    ) : (
                      <span className="inline-flex px-2.5 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                        {announcement.regions?.name || '지역'} 공지
                      </span>
                    )}
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-1">
                    {announcement.title}
                  </h3>
                  
                  <div
                    className="text-gray-600 text-sm mb-3 line-clamp-2 prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: sanitizeHtml(truncateContent(announcement.content))
                    }}
                  />
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(announcement.created_at)}</span>
                    </div>
                    <span>작성자: {announcement.admins.username}</span>
                  </div>
                </div>
                
                <div className="text-right text-sm text-gray-500">
                  <div>{formatDate(announcement.created_at)}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 공지사항 상세 모달 */}
      {showModal && selectedAnnouncement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {selectedAnnouncement.is_important && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                        <AlertCircle className="w-3 h-3" />
                        중요
                      </span>
                    )}
                    {selectedAnnouncement.target_type === 'all' ? (
                      <span className="inline-flex px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                        전체 공지
                      </span>
                    ) : (
                      <span className="inline-flex px-2.5 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                        {selectedAnnouncement.regions?.name || '지역'} 공지
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    {selectedAnnouncement.title}
                  </h2>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>작성자: {selectedAnnouncement.admins.username}</span>
                    <span>작성일: {formatDate(selectedAnnouncement.created_at)}</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-xl font-semibold"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="prose max-w-none">
                <div
                  className="text-gray-700 leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(selectedAnnouncement.content)
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}