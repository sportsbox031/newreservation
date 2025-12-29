'use client'

import { useState, useEffect } from 'react'
import { X, User, Mail, Phone, MapPin, Building } from 'lucide-react'
import { memberAPI, adminAPI } from '@/lib/supabase'

interface AccountManagementModalProps {
  isOpen: boolean
  onClose: () => void
  userType: 'admin' | 'user'
}

export default function AccountManagementModal({ isOpen, onClose, userType }: AccountManagementModalProps) {
  const [formData, setFormData] = useState({
    organization_name: '',
    manager_name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    city_id: '',
    current_password: ''
  })
  const [loading, setLoading] = useState(false)
  const [showPasswordFields, setShowPasswordFields] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadCurrentUserData()
    }
  }, [isOpen, userType])

  const loadCurrentUserData = () => {
    try {
      const storageKey = userType === 'admin' ? 'adminInfo' : 'currentUser'
      const userData = localStorage.getItem(storageKey)
      
      if (userData) {
        const parsed = JSON.parse(userData)
        setFormData({
          organization_name: parsed.organization_name || '',
          manager_name: parsed.manager_name || parsed.username || '',
          phone: parsed.phone || '',
          email: parsed.email || '',
          password: '',
          confirmPassword: '',
          city_id: parsed.city_id || '',
          current_password: ''
        })
      }
    } catch (error) {
      console.error('사용자 데이터 로드 오류:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (showPasswordFields && formData.password !== formData.confirmPassword) {
      alert('비밀번호가 일치하지 않습니다.')
      return
    }

    setLoading(true)

    try {
      // 관리자 계정 업데이트
      if (userType === 'admin') {
        const storageKey = 'adminInfo'
        const adminData = localStorage.getItem(storageKey)
        if (!adminData) {
          alert('로그인 정보를 찾을 수 없습니다.')
          return
        }

        const parsed = JSON.parse(adminData)
        console.log('📦 localStorage에서 가져온 adminInfo:', parsed)

        const adminId = parsed.id
        console.log('🆔 추출한 adminId:', adminId, '(타입:', typeof adminId, ')')

        if (!adminId || typeof adminId !== 'string' || adminId.length < 30) {
          alert('관리자 ID가 유효하지 않습니다. 다시 로그인해주세요.')
          localStorage.removeItem('adminInfo')
          window.location.href = '/auth/login'
          return
        }

        // 1. 일반 정보 업데이트 (username은 로그인 ID이므로 변경하지 않음)
        console.log('🔍 업데이트 요청 데이터:', {
          adminId,
          phone: formData.phone,
          email: formData.email
        })

        const updatePayload = {
          phone: formData.phone || '',
          email: formData.email || ''
        }

        const { data: updatedAdmin, error: updateError } = await adminAPI.updateAdminInfo(adminId, updatePayload)

        console.log('📊 업데이트 응답:', { data: updatedAdmin, error: updateError })

        if (updateError) {
          console.error('정보 업데이트 오류:', updateError)
          console.error('오류 타입:', typeof updateError)
          console.error('오류 키:', Object.keys(updateError))
          alert('정보 업데이트 중 오류가 발생했습니다.')
          return
        }

        console.log('✅ 관리자 정보 업데이트 성공:', updatedAdmin)

        // 2. 비밀번호 변경 (선택사항)
        if (showPasswordFields && formData.current_password && formData.password) {
          const { data: passwordData, error: passwordError } = await adminAPI.changeAdminPassword(
            adminId,
            formData.current_password,
            formData.password
          )

          if (passwordError) {
            console.error('비밀번호 변경 오류:', passwordError)
            alert(passwordError.message || '비밀번호 변경 중 오류가 발생했습니다.')
            return
          }
        }

        // 3. 로컬스토리지 업데이트
        if (updatedAdmin && updatedAdmin.length > 0) {
          const updated = {
            ...parsed,
            username: updatedAdmin[0].username,
            phone: updatedAdmin[0].phone,
            email: updatedAdmin[0].email
          }
          localStorage.setItem(storageKey, JSON.stringify(updated))
        }

        alert('계정 정보가 업데이트되었습니다.')
        onClose()
        return
      }

      // 일반 사용자는 DB 업데이트
      const currentUser = localStorage.getItem('currentUser')
      if (!currentUser) {
        alert('로그인 정보를 찾을 수 없습니다.')
        return
      }

      const userData = JSON.parse(currentUser)
      const userId = userData.id

      // 1. 일반 정보 업데이트
      const { data: updatedUser, error: updateError } = await memberAPI.updateUserInfo(userId, {
        manager_name: formData.manager_name,
        phone: formData.phone,
        email: formData.email
      })

      if (updateError) {
        console.error('정보 업데이트 오류:', updateError)
        alert('정보 업데이트 중 오류가 발생했습니다.')
        return
      }

      // 2. 비밀번호 변경 (선택사항)
      if (showPasswordFields && formData.current_password && formData.password) {
        const { data: passwordData, error: passwordError } = await memberAPI.changePassword(
          userId,
          formData.current_password,
          formData.password
        )

        if (passwordError) {
          console.error('비밀번호 변경 오류:', passwordError)
          alert(passwordError.message || '비밀번호 변경 중 오류가 발생했습니다.')
          return
        }
      }

      // 3. 로컬스토리지 업데이트
      if (updatedUser && updatedUser.length > 0) {
        const updated = {
          ...userData,
          manager_name: updatedUser[0].manager_name,
          phone: updatedUser[0].phone,
          email: updatedUser[0].email
        }
        localStorage.setItem('currentUser', JSON.stringify(updated))
      }

      alert('계정 정보가 업데이트되었습니다.')
      onClose()
    } catch (error) {
      console.error('계정 업데이트 오류:', error)
      alert('계정 정보 업데이트 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-900">계정 관리</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 단체명 (수정 불가) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Building className="w-4 h-4 inline mr-1" />
                {userType === 'admin' ? '관리자명' : '단체명'}
              </label>
              <input
                type="text"
                value={formData.organization_name}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">이 필드는 수정할 수 없습니다.</p>
            </div>

            {/* 담당자명/관리자명 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <User className="w-4 h-4 inline mr-1" />
                {userType === 'admin' ? '사용자명 (로그인 ID)' : '담당자명'}
              </label>
              <input
                type="text"
                value={formData.manager_name}
                onChange={(e) => handleInputChange('manager_name', e.target.value)}
                disabled={userType === 'admin'}
                required
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${
                  userType === 'admin'
                    ? 'bg-gray-50 text-gray-500 cursor-not-allowed'
                    : 'focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                }`}
              />
              {userType === 'admin' && (
                <p className="text-xs text-gray-500 mt-1">로그인 ID는 변경할 수 없습니다.</p>
              )}
            </div>

            {/* 전화번호 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Phone className="w-4 h-4 inline mr-1" />
                전화번호
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* 이메일 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Mail className="w-4 h-4 inline mr-1" />
                이메일
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* 비밀번호 변경 토글 */}
            <div className="border-t pt-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showPasswordFields}
                  onChange={(e) => setShowPasswordFields(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">비밀번호 변경</span>
              </label>
            </div>

            {/* 비밀번호 필드들 */}
            {showPasswordFields && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    현재 비밀번호
                  </label>
                  <input
                    type="password"
                    value={formData.current_password}
                    onChange={(e) => handleInputChange('current_password', e.target.value)}
                    required={showPasswordFields}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    새 비밀번호
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    required={showPasswordFields}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    새 비밀번호 확인
                  </label>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    required={showPasswordFields}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}

            <div className="flex space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors"
              >
                {loading ? '저장 중...' : '저장'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}