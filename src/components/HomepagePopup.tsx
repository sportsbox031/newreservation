'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { popupAPI } from '@/lib/supabase'
import { sanitizeHtml } from '@/components/RichTextEditor'

interface HomepagePopup {
  id: string
  title: string
  content: string
  content_type: 'html' | 'markdown' | 'text'
  is_active: boolean
  start_date: string
  end_date: string | null
  display_order: number
  admins: {
    username: string
  }
}

export default function HomepagePopupComponent() {
  const [popups, setPopups] = useState<HomepagePopup[]>([])
  const [currentPopupIndex, setCurrentPopupIndex] = useState(0)
  const [showPopup, setShowPopup] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPopups()
  }, [])

  const loadPopups = async () => {
    try {
      const { data, error } = await popupAPI.getActivePopups()
      
      if (error) {
        console.error('팝업 로드 오류:', error)
        setLoading(false)
        return
      }

      const activePopups = data || []
      
      if (activePopups.length > 0) {
        // 24시간 내에 또 보지 않음 옵션을 확인
        const hasSeenToday = checkPopupSeenToday(activePopups[0].id)
        
        if (!hasSeenToday) {
          setPopups(activePopups)
          setCurrentPopupIndex(0)
          setShowPopup(true)
        }
      }
      
      setLoading(false)
    } catch (error) {
      console.error('팝업 로드 예외:', error)
      setLoading(false)
    }
  }

  // 24시간 내 팝업 본 여부 확인
  const checkPopupSeenToday = (popupId: string): boolean => {
    const seenPopups = JSON.parse(localStorage.getItem('seenPopups') || '{}')
    const today = new Date().toDateString()
    
    return seenPopups[popupId] === today
  }

  // 24시간 내 팝업 본 것으로 표시
  const markPopupAsSeen = (popupId: string) => {
    const seenPopups = JSON.parse(localStorage.getItem('seenPopups') || '{}')
    const today = new Date().toDateString()
    seenPopups[popupId] = today
    localStorage.setItem('seenPopups', JSON.stringify(seenPopups))
  }

  // 팝업 닫기
  const closePopup = () => {
    if (popups[currentPopupIndex]) {
      markPopupAsSeen(popups[currentPopupIndex].id)
    }
    setShowPopup(false)
  }

  // 다음 팝업으로 이동
  const nextPopup = () => {
    if (popups[currentPopupIndex]) {
      markPopupAsSeen(popups[currentPopupIndex].id)
    }
    
    if (currentPopupIndex < popups.length - 1) {
      setCurrentPopupIndex(currentPopupIndex + 1)
    } else {
      setShowPopup(false)
    }
  }

  // ESC 키로 닫기
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showPopup) {
        closePopup()
      }
    }

    if (showPopup) {
      document.addEventListener('keydown', handleKeyDown)
      // 배경 스크롤 방지
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [showPopup])

  // 마크다운을 HTML로 변환하는 간단한 함수
  const markdownToHtml = (markdown: string): string => {
    let html = markdown
    
    // 헤딩
    html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>')
    html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>')
    html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>')
    
    // 볼드
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    html = html.replace(/__(.*?)__/g, '<strong>$1</strong>')
    
    // 이탤릭
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>')
    html = html.replace(/_(.*?)_/g, '<em>$1</em>')
    
    // 링크
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    
    // 코드
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
    
    // 리스트
    html = html.replace(/^\* (.+)$/gm, '<li>$1</li>')
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>')
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    
    // 줄바꿈
    html = html.replace(/\n/g, '<br>')
    
    return html
  }

  const renderContent = (popup: HomepagePopup) => {
    if (popup.content_type === 'html') {
      return (
        <div
          className="prose max-w-none"
          dangerouslySetInnerHTML={{
            __html: sanitizeHtml(popup.content)
          }}
        />
      )
    } else if (popup.content_type === 'markdown') {
      return (
        <div
          className="prose max-w-none"
          dangerouslySetInnerHTML={{
            __html: sanitizeHtml(markdownToHtml(popup.content))
          }}
        />
      )
    } else {
      return (
        <div className="prose max-w-none whitespace-pre-wrap">
          {popup.content}
        </div>
      )
    }
  }

  if (loading || !showPopup || popups.length === 0) {
    return null
  }

  const currentPopup = popups[currentPopupIndex]
  
  if (!currentPopup) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {currentPopup.title}
              </h2>
              {popups.length > 1 && (
                <div className="flex items-center gap-2">
                  <div className="text-sm text-gray-500">
                    {currentPopupIndex + 1} / {popups.length}
                  </div>
                  <div className="flex gap-1">
                    {popups.map((_, index) => (
                      <div
                        key={index}
                        className={`w-2 h-2 rounded-full ${
                          index === currentPopupIndex 
                            ? 'bg-blue-600' 
                            : 'bg-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={closePopup}
              className="text-gray-400 hover:text-gray-600 text-2xl font-semibold p-1 hover:bg-gray-100 rounded-full transition-colors"
              title="닫기 (ESC)"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        {/* 콘텐츠 */}
        <div className="p-6">
          {renderContent(currentPopup)}
        </div>
        
        {/* 하단 버튼 */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4">
          <div className="flex justify-between items-center">
            <label className="flex items-center text-sm text-gray-600">
              <input
                type="checkbox"
                onChange={(e) => {
                  if (e.target.checked) {
                    closePopup()
                  }
                }}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-2"
              />
              24시간 내 다시 보지 않기
            </label>
            
            <div className="flex gap-3">
              {popups.length > 1 && currentPopupIndex < popups.length - 1 ? (
                <>
                  <button
                    onClick={closePopup}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                  >
                    닫기
                  </button>
                  <button
                    onClick={nextPopup}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                  >
                    다음
                  </button>
                </>
              ) : (
                <button
                  onClick={closePopup}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  확인
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}