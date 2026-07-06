'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { popupAPI } from '@/lib/supabase'
import { Bell, Plus, Edit, Trash2, Eye, EyeOff, Calendar, User, Type, Image as ImageIcon } from 'lucide-react'
import Spinner from '@/components/Spinner'
import RichTextEditor, { sanitizeHtml, markdownToHtml } from '@/components/RichTextEditor'
import AdminNavigation from '@/components/AdminNavigation'
import { getAnnouncementAuthorName } from '@/lib/announcementAuthors'
import { formatDateTimeKST as formatDate } from '@/lib/formatDate'
import { modalOverlayClass } from '@/components/ModalOverlay'

// datetime-local 입력은 한국 시간(KST) 기준으로 표시/입력한다.
// 1) 표시: 특정 시각(instant)을 KST 벽시계 기준 YYYY-MM-DDTHH:MM 문자열로 변환
const toKSTInputValue = (date: Date) => {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 16)
}

// 2) 저장: KST 기준 datetime-local 문자열을 저장용 UTC ISO 문자열로 변환
const kstInputToISO = (value: string) => {
  if (!value) return value
  return new Date(`${value}:00+09:00`).toISOString()
}

// '이미지' 팝업은 DB 스키마 변경 없이 content_type='html' + 단일 <img> 태그로 저장한다.
// (homepage_popups.content_type의 CHECK 제약이 html/markdown/text만 허용하기 때문)
type FormContentType = 'html' | 'markdown' | 'text' | 'image'

const IMAGE_ONLY_CONTENT_REGEX = /^\s*<img\s[^>]*\/?>\s*$/i

const isImageOnlyContent = (content: string) => IMAGE_ONLY_CONTENT_REGEX.test(content)

const extractImageSrc = (content: string) => {
  const match = content.match(/src="([^"]+)"/i)
  return match ? match[1] : null
}

const buildImageContent = (url: string, title: string) => {
  const altText = (title || '팝업 이미지').replace(/"/g, '&quot;')
  return `<img src="${url}" alt="${altText}" style="max-width: 100%; height: auto; display: block; margin: 0 auto;">`
}

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
  author_id: string
  admins: {
    id: string
    username: string
  } | null
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
    content_type: 'text' as FormContentType,
    is_active: true,
    start_date: '',
    end_date: '',
    display_order: 0
  })
  const [imageUploading, setImageUploading] = useState(false)

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
      content_type: 'image', // 새 팝업 기본 타입은 이미지 (가장 눈에 잘 띄는 형식)
      is_active: true,
      start_date: '',
      end_date: '',
      display_order: 0
    })
    setImageUploading(false)
  }

  const handleCreateClick = () => {
    resetForm()
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    setFormData(prev => ({
      ...prev,
      start_date: toKSTInputValue(now),
      end_date: toKSTInputValue(tomorrow)
    }))
    setEditingPopup(null)
    setShowCreateModal(true)
  }

  const handleEditClick = (popup: HomepagePopup) => {
    setFormData({
      title: popup.title,
      content: popup.content,
      // 이미지 전용 HTML 팝업은 UI에서 '이미지' 타입으로 표시
      content_type: popup.content_type === 'html' && isImageOnlyContent(popup.content)
        ? 'image'
        : popup.content_type,
      is_active: popup.is_active,
      start_date: toKSTInputValue(new Date(popup.start_date)),
      end_date: popup.end_date ? toKSTInputValue(new Date(popup.end_date)) : '',
      display_order: popup.display_order
    })
    setEditingPopup(popup)
    setShowCreateModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.content_type === 'image' && !extractImageSrc(formData.content)) {
      alert('팝업에 표시할 이미지를 업로드해주세요.')
      return
    }

    if (!formData.title.trim() || !formData.content.trim() || !formData.start_date) {
      alert('제목, 내용, 시작 날짜는 필수 항목입니다.')
      return
    }

    if (imageUploading) {
      alert('이미지 업로드가 끝난 후 저장해주세요.')
      return
    }

    try {
      const submitData = {
        ...formData,
        // 이미지 타입은 DB에 html로 저장 (내용은 <img> 태그)
        content_type: formData.content_type === 'image' ? ('html' as const) : formData.content_type,
        start_date: kstInputToISO(formData.start_date),
        end_date: formData.end_date ? kstInputToISO(formData.end_date) : null,
        author_id: adminInfo?.id // 로그인한 관리자 ID 사용
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

  // 이미지 파일 선택 → 즉시 업로드 → <img> 태그로 내용 구성
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target
    const file = input.files?.[0]
    if (!file) return

    setImageUploading(true)
    try {
      const uploadData = new FormData()
      uploadData.append('file', file)

      const response = await fetch('/api/admin/popups/image', {
        method: 'POST',
        credentials: 'include',
        body: uploadData
      })

      const result = await response.json()

      if (!response.ok) {
        alert(result.error || '이미지 업로드에 실패했습니다.')
        return
      }

      setFormData(prev => ({
        ...prev,
        content: buildImageContent(result.data.url, prev.title)
      }))
    } catch (error) {
      console.error('팝업 이미지 업로드 오류:', error)
      alert('이미지 업로드 중 오류가 발생했습니다.')
    } finally {
      setImageUploading(false)
      input.value = ''
    }
  }

  const getContentTypeLabel = (type: string) => {
    switch (type) {
      case 'html': return 'HTML'
      case 'markdown': return '마크다운'
      case 'text': return '일반 텍스트'
      case 'image': return '이미지'
      default: return type
    }
  }

  // 이미지 전용 HTML 팝업은 '이미지'로 표시
  const getPopupTypeLabel = (popup: HomepagePopup) => {
    return popup.content_type === 'html' && isImageOnlyContent(popup.content)
      ? '이미지'
      : getContentTypeLabel(popup.content_type)
  }

  const canEditPopup = (popup: HomepagePopup) => {
    if (adminInfo?.role === 'super') return true
    // 지역 관리자는 자신이 작성한 팝업만 수정 가능
    return popup.author_id === adminInfo?.id
  }

  const canDeletePopup = (popup: HomepagePopup) => {
    if (adminInfo?.role === 'super') return true
    // 지역 관리자는 자신이 작성한 팝업만 삭제 가능
    return popup.author_id === adminInfo?.id
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
                        {getPopupTypeLabel(popup)}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                        순서: {popup.display_order}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {(() => {
                      if (popup.content_type === 'html' && isImageOnlyContent(popup.content)) {
                        return '[이미지 팝업]'
                      }
                      const plain = popup.content_type === 'html'
                        ? popup.content.replace(/<[^>]*>/g, '')
                        : popup.content
                      return plain.length > 100 ? plain.substring(0, 100) + '...' : plain
                    })()}
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
                      <span>작성자: {getAnnouncementAuthorName(popup)}</span>
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
                  {canEditPopup(popup) && (
                    <>
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
                    </>
                  )}
                  {canDeletePopup(popup) && (
                    <button
                      onClick={() => handleDelete(popup.id)}
                      className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                      title="삭제"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 팝업 생성/수정 모달 */}
      {showCreateModal && (
        <div className={modalOverlayClass()}>
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
                      content_type: e.target.value as FormContentType
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="image">이미지 (JPG/PNG)</option>
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
                {formData.content_type === 'image' ? (
                  <div className="space-y-3">
                    {extractImageSrc(formData.content) ? (
                      <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={extractImageSrc(formData.content)!}
                          alt="팝업 이미지 미리보기"
                          className="max-h-64 mx-auto rounded"
                        />
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">
                        팝업에 표시할 이미지를 업로드하세요. (JPG, JPEG, PNG, GIF, WEBP · 최대 5MB)
                      </p>
                    )}
                    <div className="flex items-center gap-3">
                      <label className={`inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 text-sm font-medium text-gray-700 ${imageUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                        <ImageIcon className="w-4 h-4" />
                        {extractImageSrc(formData.content) ? '이미지 변경' : '이미지 선택'}
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp"
                          className="hidden"
                          onChange={handleImageFileChange}
                          disabled={imageUploading}
                        />
                      </label>
                      {imageUploading && (
                        <span className="text-sm text-blue-600 flex items-center gap-2">
                          <Spinner size="sm" />
                          업로드 중...
                        </span>
                      )}
                    </div>
                  </div>
                ) : formData.content_type === 'html' ? (
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
        <div className={modalOverlayClass()}>
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
                    <span>{getPopupTypeLabel(previewPopup)}</span>
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
                // 실제 홈페이지 팝업과 동일하게 마크다운을 변환해서 표시
                <div
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(markdownToHtml(previewPopup.content))
                  }}
                />
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
