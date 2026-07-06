'use client'

import { useState, useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import { popupAPI } from '@/lib/supabase'
import { sanitizeHtml, markdownToHtml } from '@/components/RichTextEditor'

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

const HOMEPAGE_POPUP_CACHE_KEY = 'homepagePopupCache'
const HOMEPAGE_POPUP_CACHE_TTL_MS = 60 * 1000

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

// 개별 팝업 모달 컴포넌트
function PopupModal({
  popup,
  zIndex,
  onClose,
}: {
  popup: HomepagePopup
  zIndex: number
  onClose: () => void
}) {
  const [dontShowToday, setDontShowToday] = useState(false)

  const handleClose = useCallback(() => {
    if (dontShowToday) {
      markPopupAsSeen(popup.id)
    }
    onClose()
  }, [dontShowToday, popup.id, onClose])

  // ESC 키로 닫기
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleClose])

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-3 sm:p-4"
      style={{ zIndex }}
    >
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={handleClose}
      />

      {/* 모달 콘텐츠 */}
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative">
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6">
          <div className="flex justify-between items-start gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 break-words">
                {popup.title}
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-semibold p-1 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
              title="닫기 (ESC)"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        {/* 콘텐츠 */}
        <div className="p-4 sm:p-6">
          {renderContent(popup)}
        </div>

        {/* 하단 버튼 */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <label className="flex items-center text-xs sm:text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={dontShowToday}
                onChange={(e) => setDontShowToday(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-2 cursor-pointer flex-shrink-0"
              />
              <span className="whitespace-nowrap">24시간 내 다시 보지 않기</span>
            </label>

            <button
              onClick={handleClose}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 text-sm sm:text-base bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              확인
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HomepagePopupComponent() {
  const [visiblePopups, setVisiblePopups] = useState<HomepagePopup[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPopups()
  }, [])

  // 팝업이 하나라도 열려있으면 배경 스크롤 방지
  useEffect(() => {
    if (visiblePopups.length > 0) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [visiblePopups.length])

  const loadPopups = async () => {
    let stalePopups: HomepagePopup[] = []

    try {
      const cachedValue = sessionStorage.getItem(HOMEPAGE_POPUP_CACHE_KEY)
      if (cachedValue) {
        const cached = JSON.parse(cachedValue)
        stalePopups = cached.data || []
        if (Date.now() - cached.cachedAt < HOMEPAGE_POPUP_CACHE_TTL_MS) {
          const unseenCachedPopups = stalePopups.filter(
            (popup: HomepagePopup) => !checkPopupSeenToday(popup.id)
          )
          setVisiblePopups(unseenCachedPopups)
          setLoading(false)
          return
        }
      }

      const { data, error } = await popupAPI.getActivePopups()

      if (error) {
        if (stalePopups.length > 0) {
          const unseenCachedPopups = stalePopups.filter(
            (popup: HomepagePopup) => !checkPopupSeenToday(popup.id)
          )
          setVisiblePopups(unseenCachedPopups)
          console.warn('팝업 최신 데이터를 불러오지 못해 이전 캐시를 표시합니다:', error)
        } else {
          console.error('팝업 로드 오류:', error)
        }
        setLoading(false)
        return
      }

      const activePopups = data || []
      sessionStorage.setItem(HOMEPAGE_POPUP_CACHE_KEY, JSON.stringify({
        cachedAt: Date.now(),
        data: activePopups
      }))

      // 24시간 내 이미 본 팝업 필터링
      const unseenPopups = activePopups.filter(
        (popup: HomepagePopup) => !checkPopupSeenToday(popup.id)
      )

      setVisiblePopups(unseenPopups)
      setLoading(false)
    } catch (error) {
      const cachedValue = sessionStorage.getItem(HOMEPAGE_POPUP_CACHE_KEY)
      if (cachedValue) {
        const cached = JSON.parse(cachedValue)
        const unseenCachedPopups = (cached.data || []).filter(
          (popup: HomepagePopup) => !checkPopupSeenToday(popup.id)
        )
        setVisiblePopups(unseenCachedPopups)
        console.warn('팝업 로드 예외로 이전 캐시를 표시합니다:', error)
      } else {
        console.error('팝업 로드 예외:', error)
      }
      setLoading(false)
    }
  }

  const handleClosePopup = (popupId: string) => {
    setVisiblePopups((prev) => prev.filter((p) => p.id !== popupId))
  }

  if (loading || visiblePopups.length === 0) {
    return null
  }

  return (
    <>
      {visiblePopups.map((popup, index) => (
        <PopupModal
          key={popup.id}
          popup={popup}
          zIndex={9999 + (visiblePopups.length - index)}
          onClose={() => handleClosePopup(popup.id)}
        />
      ))}
    </>
  )
}
