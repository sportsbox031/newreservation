'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { popupAPI } from '@/lib/supabase'
import { Bell, Plus, Edit, Trash2, Eye, EyeOff, Calendar, User, Type } from 'lucide-react'
import RichTextEditor, { sanitizeHtml } from '@/components/RichTextEditor'
import AdminNavigation from '@/components/AdminNavigation'

interface HomepagePopup {
  id: string
  title: string
  content: string
  content_type: 'html' | 'markdown' | 'text'
  is_active: boolean
  start_date: string
  end_date: string | null
  display_order: number
  created_at: string
  updated_at: string
  admins: {
    username: string
  }
}

export default function PopupManagementPage() {
  const router = useRouter()
  const [popups, setPopups] = useState<HomepagePopup[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingPopup, setEditingPopup] = useState<HomepagePopup | null>(null)
  const [previewPopup, setPreviewPopup] = useState<HomepagePopup | null>(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [adminInfo, setAdminInfo] = useState<any>(null)

  // 폼 상태
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    content_type: 'text' as 'html' | 'markdown' | 'text',
    is_active: true,
    start_date: '',
    end_date: '',
    display_order: 0
  })

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = () => {
    const adminAuth = localStorage.getItem('adminInfo')
    if (!adminAuth) {
      router.push('/auth/login')
      return
    }
    
    const adminData = JSON.parse(adminAuth)
    setAdminInfo(adminData)
    loadData()
  }

  const loadData = async () => {
    try {
      const { data, error } = await popupAPI.getAllPopups()
      if (error) {
        console.error('팝업 로드 오류:', error)
        alert('팝업 로드 중 오류가 발생했습니다.')
      } else {
        setPopups(data || [])
      }
    } catch (error) {
      console.error('팝업 로드 예외:', error)
      alert('팝업 로드 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      content_type: 'text',
      is_active: true,
      start_date: '',
      end_date: '',
      display_order: 0
    })
  }

  const handleCreateClick = () => {
    resetForm()
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    setFormData(prev => ({
      ...prev,
      start_date: now.toISOString().slice(0, 16),
      end_date: tomorrow.toISOString().slice(0, 16)
    }))
    setEditingPopup(null)
    setShowCreateModal(true)
  }

  const handleEditClick = (popup: HomepagePopup) => {
    setFormData({
      title: popup.title,
      content: popup.content,
      content_type: popup.content_type,
      is_active: popup.is_active,
      start_date: new Date(popup.start_date).toISOString().slice(0, 16),
      end_date: popup.end_date ? new Date(popup.end_date).toISOString().slice(0, 16) : '',
      display_order: popup.display_order
    })
    setEditingPopup(popup)
    setShowCreateModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim() || !formData.content.trim() || !formData.start_date) {
      alert('제목, 내용, 시작 날짜는 필수 항목입니다.')
      return
    }

    try {
      const submitData = {
        ...formData,
        end_date: formData.end_date || null,
        author_id: 'admin' // API에서 기본값으로 설정
      }

      if (editingPopup) {
        // 수정
        const { error } = await popupAPI.updatePopup(editingPopup.id, submitData)
        if (error) {
          alert('팝업 수정 중 오류가 발생했습니다.')
          return
        }
      } else {
        // 생성
        const { error } = await popupAPI.createPopup(submitData)
        if (error) {
          alert('팝업 생성 중 오류가 발생했습니다.')
          return
        }
      }

      setShowCreateModal(false)
      setEditingPopup(null)
      loadData()
    } catch (error) {
      console.error('팝업 저장 오류:', error)
      alert('팝업 저장 중 오류가 발생했습니다.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('정말 이 팝업을 삭제하시겠습니까?')) {
      return
    }

    try {
      const { error } = await popupAPI.deletePopup(id)
      if (error) {
        alert('팝업 삭제 중 오류가 발생했습니다.')
        return
      }
      loadData()
    } catch (error) {
      console.error('팝업 삭제 오류:', error)
      alert('팝업 삭제 중 오류가 발생했습니다.')
    }
  }

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await popupAPI.togglePopupStatus(id, !currentStatus)
      if (error) {
        alert('팝업 상태 변경 중 오류가 발생했습니다.')
        return
      }
      loadData()
    } catch (error) {
      console.error('팝업 상태 변경 오류:', error)
      alert('팝업 상태 변경 중 오류가 발생했습니다.')
    }
  }

  const handlePreview = (popup: HomepagePopup) => {
    setPreviewPopup(popup)
    setShowPreviewModal(true)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getContentTypeLabel = (type: string) => {
    switch (type) {
      case 'html': return 'HTML'
      case 'markdown': return '마크다운'
      case 'text': return '일반 텍스트'
      default: return type
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNavigation adminRole={adminInfo?.role} />
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation adminRole={adminInfo?.role} />
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Bell className="w-7 h-7 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">홈페이지 팝업 관리</h1>
            </div>
            <p className="text-gray-600">홈페이지 초기 팝업을 관리하고 설정하세요.</p>
          </div>
          <button
            onClick={handleCreateClick}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            새 팝업 만들기
          </button>
        </div>
      </div>

      {popups.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">등록된 팝업이 없습니다</h3>
          <p className="text-gray-600 mb-6">첫 번째 팝업을 만들어 보세요.</p>
          <button
            onClick={handleCreateClick}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto"
          >
            <Plus className="w-5 h-5" />
            새 팝업 만들기
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {popups.map((popup) => (
            <div
              key={popup.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {popup.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        popup.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {popup.is_active ? '활성' : '비활성'}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                        <Type className="w-3 h-3 mr-1" />
                        {getContentTypeLabel(popup.content_type)}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                        순서: {popup.display_order}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {popup.content_type === 'html' 
                      ? popup.content.replace(/<[^>]*>/g, '').substring(0, 100) + '...'
                      : popup.content.substring(0, 100) + '...'
                    }
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>시작: {formatDate(popup.start_date)}</span>
                    </div>
                    {popup.end_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>종료: {formatDate(popup.end_date)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      <span>작성자: {popup.admins.username}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handlePreview(popup)}
                    className="p-2 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors"
                    title="미리보기"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleToggleStatus(popup.id, popup.is_active)}
                    className={`p-2 rounded-lg transition-colors ${
                      popup.is_active 
                        ? 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                        : 'text-green-600 hover:text-green-800 hover:bg-green-50'
                    }`}
                    title={popup.is_active ? '비활성화' : '활성화'}
                  >
                    {popup.is_active ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => handleEditClick(popup)}
                    className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                    title="수정"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(popup.id)}
                    className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                    title="삭제"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 팝업 생성/수정 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[95vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900">
                {editingPopup ? '팝업 수정' : '새 팝업 만들기'}
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    제목 *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="팝업 제목을 입력하세요"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    콘텐츠 타입
                  </label>
                  <select
                    value={formData.content_type}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      content_type: e.target.value as 'html' | 'markdown' | 'text' 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="html">HTML</option>
                    <option value="markdown">마크다운</option>
                    <option value="text">일반 텍스트</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    시작 날짜 *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    종료 날짜 (선택사항)
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.end_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    표시 순서
                  </label>
                  <input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                  />
                </div>
                
                <div className="flex items-center pt-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">활성 상태</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  내용 *
                </label>
                {formData.content_type === 'html' ? (
                  <RichTextEditor
                    value={formData.content}
                    onChange={(value) => setFormData(prev => ({ ...prev, content: value }))}
                    placeholder="팝업 내용을 입력하세요..."
                  />
                ) : (
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={10}
                    placeholder={
                      formData.content_type === 'markdown'
                        ? '마크다운 형식으로 입력하세요...\n\n예시:\n# 제목\n**굵은글씨**\n*기울임*\n[링크](http://example.com)'
                        : '일반 텍스트로 입력하세요...'
                    }
                    required
                  />
                )}
              </div>

              <div className="flex justify-end gap-4 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setEditingPopup(null)
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  {editingPopup ? '수정' : '만들기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 미리보기 모달 */}
      {showPreviewModal && previewPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    {previewPopup.title}
                  </h2>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      previewPopup.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {previewPopup.is_active ? '활성' : '비활성'}
                    </span>
                    <span>·</span>
                    <span>{getContentTypeLabel(previewPopup.content_type)}</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-xl font-semibold"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {previewPopup.content_type === 'html' ? (
                <div 
                  className="prose max-w-none"
                  style={{
                    isolation: 'isolate',
                    contain: 'layout style'
                  }}
                  dangerouslySetInnerHTML={{ 
                    __html: sanitizeHtml(previewPopup.content)
                  }}
                />
              ) : previewPopup.content_type === 'markdown' ? (
                <div className="prose max-w-none whitespace-pre-wrap">
                  {previewPopup.content}
                </div>
              ) : (
                <div className="prose max-w-none whitespace-pre-wrap">
                  {previewPopup.content}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}