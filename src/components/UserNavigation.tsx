'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { Award, CalendarCheck, LogOut } from 'lucide-react'

// 스포츠이벤트 사용자 페이지 공용 상단 네비게이션.
// 스포츠교실(대시보드) 헤더 디자인을 참고해 일관성을 맞추되, 교실 예약 로직/데이터와는 무관하다.
// - 로고/‘스포츠교실 예약’ 링크로 대시보드(/dashboard)로 이동
// - children으로 페이지별 액션(예: 내 신청내역, 목록으로) 주입
export default function UserNavigation({ children }: { children?: ReactNode }) {
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    } catch {
      // 서버 로그아웃 실패해도 클라이언트 상태는 정리하고 로그인으로 보낸다
    }
    try {
      localStorage.removeItem('currentUser')
      localStorage.removeItem('sessionToken')
      localStorage.removeItem('session_token')
    } catch {
      /* noop */
    }
    window.location.href = '/auth/login'
  }

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          <Link href="/dashboard" className="flex items-center space-x-2 sm:space-x-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 sports-box-gradient rounded-lg flex items-center justify-center">
              <Award className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">스포츠박스</h1>
              <p className="text-xs sm:text-sm text-blue-600">스포츠이벤트</p>
            </div>
          </Link>

          <div className="flex items-center space-x-2 sm:space-x-4">
            {children}
            <Link
              href="/dashboard"
              className="flex items-center space-x-1 text-gray-700 hover:text-blue-600 p-1 sm:p-0"
            >
              <CalendarCheck className="w-4 h-4" />
              <span className="hidden sm:inline text-sm">스포츠교실 예약</span>
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1 text-gray-700 hover:text-red-600 p-1 sm:p-0"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline text-sm">로그아웃</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
