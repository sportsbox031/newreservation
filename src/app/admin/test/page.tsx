'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminTestPage() {
  const [adminAuth, setAdminAuth] = useState({
    isAuthenticated: false,
    role: null,
    adminInfo: null,
    loading: true
  })
  const router = useRouter()

  useEffect(() => {
    console.log('AdminTestPage: useEffect started')
    
    const checkAuth = () => {
      try {
        console.log('AdminTestPage: Checking localStorage...')
        const adminInfo = localStorage.getItem('adminInfo')
        console.log('AdminTestPage: localStorage adminInfo:', adminInfo)
        
        if (!adminInfo) {
          console.log('AdminTestPage: No adminInfo found')
          setAdminAuth(prev => ({ ...prev, loading: false }))
          return
        }
        
        const adminData = JSON.parse(adminInfo)
        console.log('AdminTestPage: Parsed adminData:', adminData)
        
        setAdminAuth({
          isAuthenticated: adminData.isAuthenticated || false,
          role: adminData.role || null,
          adminInfo: adminData,
          loading: false
        })
        
        console.log('AdminTestPage: Auth state updated')
      } catch (error) {
        console.error('AdminTestPage: Error:', error)
        setAdminAuth(prev => ({ ...prev, loading: false }))
      }
    }

    // 짧은 지연 후 실행하여 localStorage가 완전히 로드되도록 함
    const timer = setTimeout(checkAuth, 100)
    
    return () => clearTimeout(timer)
  }, [])

  const clearStorage = () => {
    localStorage.removeItem('adminInfo')
    setAdminAuth({
      isAuthenticated: false,
      role: null,
      adminInfo: null,
      loading: false
    })
    console.log('Storage cleared')
  }

  const goToLogin = () => {
    router.push('/auth/login')
  }

  const goToOriginalAdmin = () => {
    router.push('/admin')
  }

  if (adminAuth.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-center">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold mb-6 text-center">관리자 인증 테스트</h1>
        
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h2 className="font-semibold mb-2">현재 상태:</h2>
            <div className="space-y-1 text-sm">
              <p>Loading: <span className={adminAuth.loading ? 'text-yellow-600' : 'text-green-600'}>{adminAuth.loading ? 'True' : 'False'}</span></p>
              <p>Authenticated: <span className={adminAuth.isAuthenticated ? 'text-green-600' : 'text-red-600'}>{adminAuth.isAuthenticated ? 'True' : 'False'}</span></p>
              <p>Role: <span className="font-mono">{adminAuth.role || 'None'}</span></p>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <h2 className="font-semibold mb-2">AdminInfo Data:</h2>
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
              {JSON.stringify(adminAuth.adminInfo, null, 2)}
            </pre>
          </div>

          <div className="space-y-2">
            <button
              onClick={goToLogin}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
            >
              로그인 페이지로 이동
            </button>
            
            <button
              onClick={clearStorage}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors"
            >
              localStorage 클리어
            </button>
            
            <button
              onClick={goToOriginalAdmin}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors"
            >
              원래 관리자 페이지로 이동
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}