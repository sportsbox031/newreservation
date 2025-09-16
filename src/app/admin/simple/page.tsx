'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Users, 
  Calendar, 
  Bell, 
  Settings, 
  LogOut,
  Home
} from 'lucide-react'

export default function SimpleAdminPage() {
  // 모든 useState 훅을 최상위에 선언
  const [adminAuth, setAdminAuth] = useState({
    isAuthenticated: false,
    role: null,
    adminInfo: null,
    loading: true
  })
  
  const router = useRouter()

  useEffect(() => {
    const checkAuth = () => {
      try {
        console.log('SimpleAdminPage: Checking auth...')
        const adminInfo = localStorage.getItem('adminInfo')
        
        if (!adminInfo) {
          console.log('SimpleAdminPage: No admin info')
          setAdminAuth(prev => ({ ...prev, loading: false }))
          router.push('/auth/login')
          return
        }
        
        const adminData = JSON.parse(adminInfo)
        console.log('SimpleAdminPage: Admin data:', adminData)
        
        if (!adminData.isAuthenticated) {
          console.log('SimpleAdminPage: Not authenticated')
          setAdminAuth(prev => ({ ...prev, loading: false }))
          router.push('/auth/login')
          return
        }
        
        setAdminAuth({
          isAuthenticated: true,
          role: adminData.role,
          adminInfo: adminData,
          loading: false
        })
        
        console.log('SimpleAdminPage: Auth success')
      } catch (error) {
        console.error('SimpleAdminPage: Auth error:', error)
        setAdminAuth(prev => ({ ...prev, loading: false }))
        localStorage.removeItem('adminInfo')
        router.push('/auth/login')
      }
    }

    const timer = setTimeout(checkAuth, 100)
    return () => clearTimeout(timer)
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('adminInfo')
    router.push('/auth/login')
  }

  // 로딩 중일 때
  if (adminAuth.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-center">관리자 인증 확인 중...</p>
        </div>
      </div>
    )
  }

  // 인증되지 않았을 때
  if (!adminAuth.isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <p className="text-center text-red-600">인증에 실패했습니다.</p>
          <button 
            onClick={() => router.push('/auth/login')}
            className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-lg"
          >
            로그인하기
          </button>
        </div>
      </div>
    )
  }

  // 정상 인증된 관리자 페이지
  return (
    <div className="min-h-screen bg-gray-100">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Home className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-semibold text-gray-900">관리자 패널</h1>
                <p className="text-sm text-gray-500">
                  {adminAuth.role === 'super' && '전체 관리자'}
                  {adminAuth.role === 'south' && '경기남부 관리자'}  
                  {adminAuth.role === 'north' && '경기북부 관리자'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {adminAuth.adminInfo?.username}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">로그아웃</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              관리자 대시보드
            </h1>
            <p className="text-lg text-gray-600">
              스포츠박스 예약시스템 관리
            </p>
          </div>

          {/* 메뉴 카드들 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* 공지사항 관리 */}
            <Link href="/admin/announcements" className="group">
              <div className="bg-white overflow-hidden shadow rounded-lg border-2 border-transparent group-hover:border-blue-200 transition-all duration-200">
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Bell className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">
                        공지사항 관리
                      </h3>
                      <p className="text-sm text-gray-500">
                        공지사항 작성 및 관리
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Link>

            {/* 회원 관리 */}
            <Link href="/admin" className="group">
              <div className="bg-white overflow-hidden shadow rounded-lg border-2 border-transparent group-hover:border-blue-200 transition-all duration-200">
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Users className="h-8 w-8 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">
                        회원 관리
                      </h3>
                      <p className="text-sm text-gray-500">
                        회원 승인 및 관리
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Link>

            {/* 예약 관리 */}
            <Link href="/admin" className="group">
              <div className="bg-white overflow-hidden shadow rounded-lg border-2 border-transparent group-hover:border-blue-200 transition-all duration-200">
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Calendar className="h-8 w-8 text-yellow-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">
                        예약 관리
                      </h3>
                      <p className="text-sm text-gray-500">
                        예약 승인 및 관리
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Link>

            {/* 설정 */}
            {adminAuth.role === 'super' && (
              <Link href="/admin" className="group">
                <div className="bg-white overflow-hidden shadow rounded-lg border-2 border-transparent group-hover:border-blue-200 transition-all duration-200">
                  <div className="p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Settings className="h-8 w-8 text-purple-600" />
                      </div>
                      <div className="ml-4">
                        <h3 className="text-lg font-medium text-gray-900">
                          시스템 설정
                        </h3>
                        <p className="text-sm text-gray-500">
                          예약 설정 및 관리
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            )}
          </div>

          {/* 디버그 정보 (개발용) */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">관리자 정보</h3>
            <pre className="text-xs text-gray-600">
              {JSON.stringify(adminAuth.adminInfo, null, 2)}
            </pre>
          </div>
        </div>
      </main>
    </div>
  )
}