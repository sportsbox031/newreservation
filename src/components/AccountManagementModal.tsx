'use client'

import { useState, useEffect } from 'react'
import { X, User, Mail, Phone, MapPin, Building } from 'lucide-react'

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
      // TODO: API 호출 구현
      console.log('계정 정보 업데이트:', formData)
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
                {userType === 'admin' ? '관리자명' : '담당자명'}
              </label>
              <input
                type="text"
                value={formData.manager_name}
                onChange={(e) => handleInputChange('manager_name', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
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