'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { announcementAPI, utilityAPI } from '@/lib/supabase'
import { 
  Bell, 
  Plus, 
  Edit2, 
  Trash2, 
  Eye, 
  Calendar, 
  AlertCircle,
  Users,
  MapPin,
  Search
} from 'lucide-react'
import RichTextEditor, { sanitizeHtml } from '@/components/RichTextEditor'
import AdminNavigation from '@/components/AdminNavigation'

interface Announcement {
  id: string
  title: string
  content: string
  target_type: 'all' | 'region'
  target_region_id?: number
  is_important: boolean
  is_published: boolean
  view_count: number
  created_at: string
  updated_at: string
  admins: {
    username: string
  }
  regions?: {
    name: string
  }
}

interface Region {
  id: number
  name: string
  code: string
}

export default function AdminAnnouncementsPage() {
  const router = useRouter()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [adminInfo, setAdminInfo] = useState<any>(null)
  
  // Form states
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    target_type: 'all' as 'all' | 'region',
    target_region_id: '',
    is_important: false,
    is_published: true
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
    loadData(adminData)
  }

  const loadData = async (adminData?: any) => {
    setLoading(true)
    try {
      // 공지사항 로드
      const { data: announcementData, error: announcementError } = await announcementAPI.getAnnouncementsForAdmin(
        adminData?.role || 'super', 
        adminData?.region_id || null
      )
      
      if (announcementError) {
        console.error('공지사항 로드 오류:', announcementError)
      } else {
        setAnnouncements(announcementData || [])
      }

      // 지역 정보 로드
      const { data: regionsData, error: regionsError } = await utilityAPI.getRegions()
      if (regionsError) {
        console.error('지역 정보 로드 오류:', regionsError)
      } else {
        setRegions(regionsData || [])
      }
    } catch (error) {
      console.error('데이터 로드 예외:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setFormData({
      title: '',
      content: '',
      target_type: 'all',
      target_region_id: '',
      is_important: false,
      is_published: true
    })
    setShowCreateModal(true)
  }

  const handleEdit = (announcement: Announcement) => {
    setFormData({
      title: announcement.title,
      content: announcement.content,
      target_type: announcement.target_type,
      target_region_id: announcement.target_region_id?.toString() || '',
      is_important: announcement.is_important,
      is_published: announcement.is_published
    })
    setEditingAnnouncement(announcement)
    setShowCreateModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const submitData = {
        title: formData.title,
        content: formData.content,
        target_type: formData.target_type,
        target_region_id: formData.target_type === 'region' ? parseInt(formData.target_region_id) : undefined,
        is_important: formData.is_important,
        is_published: formData.is_published,
        // Temporarily removing author_id to avoid foreign key constraint
        // author_id: adminInfo.id
      }

      if (editingAnnouncement) {
        // 수정
        const { error } = await announcementAPI.updateAnnouncement(editingAnnouncement.id, submitData)
        if (error) {
          alert('공지사항 수정 중 오류가 발생했습니다.')
          return
        }
      } else {
        // 생성
        const { error } = await announcementAPI.createAnnouncement(submitData)
        if (error) {
          alert('공지사항 생성 중 오류가 발생했습니다.')
          return
        }
      }

      setShowCreateModal(false)
      setEditingAnnouncement(null)
      loadData()
    } catch (error) {
      console.error('공지사항 저장 오류:', error)
      alert('공지사항 저장 중 오류가 발생했습니다.')
    }
  }

  const handleDelete = async (announcement: Announcement) => {
    if (!confirm('정말로 이 공지사항을 삭제하시겠습니까?')) return

    try {
      const { error } = await announcementAPI.deleteAnnouncement(announcement.id)
      if (error) {
        alert('공지사항 삭제 중 오류가 발생했습니다.')
        return
      }
      loadData()
    } catch (error) {
      console.error('공지사항 삭제 오류:', error)
      alert('공지사항 삭제 중 오류가 발생했습니다.')
    }
  }

  const filteredAnnouncements = announcements.filter(announcement =>
    announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    announcement.content.toLowerCase().includes(searchTerm.toLowerCase())
  )

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

  // 권한 확인 함수들
  const canCreateAnnouncement = () => {
    // 모든 관리자가 공지사항 작성 가능
    return adminInfo?.role === 'super' || adminInfo?.role === 'south' || adminInfo?.role === 'north'
  }

  const canEditAnnouncement = (announcement: Announcement) => {
    if (adminInfo?.role === 'super') return true
    // 지역 관리자는 자신이 작성한 공지사항만 수정 가능
    return announcement.admins.username === adminInfo?.username
  }

  const canDeleteAnnouncement = (announcement: Announcement) => {
    if (adminInfo?.role === 'super') return true
    // 지역 관리자는 자신이 작성한 공지사항만 삭제 가능
    return announcement.admins.username === adminInfo?.username
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNavigation adminRole={adminInfo?.role} />
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
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
      {/* 헤더 */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="w-7 h-7 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">공지사항 관리</h1>
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            새 공지사항
          </button>
        </div>
      </div>

      {/* 검색 */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="공지사항 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* 공지사항 목록 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {filteredAnnouncements.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Bell className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>등록된 공지사항이 없습니다.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredAnnouncements.map((announcement) => (
              <div key={announcement.id} className="p-6 hover:bg-gray-50 transition-colors">
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
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                          <Users className="w-3 h-3" />
                          전체 공지
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                          <MapPin className="w-3 h-3" />
                          {announcement.regions?.name || '지역'} 공지
                        </span>
                      )}
                      {!announcement.is_published && (
                        <span className="inline-flex px-2.5 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded-full">
                          비공개
                        </span>
                      )}
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {announcement.title}
                    </h3>
                    
                    <div
                      className="text-gray-600 text-sm mb-3 line-clamp-2 prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeHtml(
                          announcement.content.length > 100
                            ? announcement.content.substring(0, 100) + '...'
                            : announcement.content
                        )
                      }}
                    />
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(announcement.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        <span>{announcement.view_count}회 조회</span>
                      </div>
                      <span>작성자: {announcement.admins.username}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {canEditAnnouncement(announcement) ? (
                      <button
                        onClick={() => handleEdit(announcement)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="수정"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <div className="p-2 text-gray-300 cursor-not-allowed" title="다른 관리자가 작성한 글은 수정할 수 없습니다">
                        <Edit2 className="w-4 h-4" />
                      </div>
                    )}
                    {canDeleteAnnouncement(announcement) ? (
                      <button
                        onClick={() => handleDelete(announcement)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <div className="p-2 text-gray-300 cursor-not-allowed" title="다른 관리자가 작성한 글은 삭제할 수 없습니다">
                        <Trash2 className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 생성/수정 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit}>
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingAnnouncement ? '공지사항 수정' : '새 공지사항 작성'}
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false)
                      setEditingAnnouncement(null)
                    }}
                    className="text-gray-400 hover:text-gray-600 text-xl font-semibold"
                  >
                    ×
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                {/* 제목 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    제목 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="공지사항 제목을 입력하세요"
                  />
                </div>

                {/* 내용 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    내용 <span className="text-red-500">*</span>
                  </label>
                  <RichTextEditor
                    value={formData.content}
                    onChange={(content) => setFormData(prev => ({ ...prev, content }))}
                    placeholder="공지사항 내용을 입력하세요"
                  />
                </div>

                {/* 대상 설정 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    공지 대상 <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        value="all"
                        checked={formData.target_type === 'all'}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          target_type: e.target.value as 'all',
                          target_region_id: ''
                        }))}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span>전체 회원</span>
                    </label>
                    
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        value="region"
                        checked={formData.target_type === 'region'}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          target_type: e.target.value as 'region'
                        }))}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span>특정 지역</span>
                    </label>
                  </div>
                  
                  {formData.target_type === 'region' && (
                    <div className="mt-3">
                      <select
                        value={formData.target_region_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, target_region_id: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="">지역을 선택하세요</option>
                        {regions.map(region => (
                          <option key={region.id} value={region.id}>
                            {region.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* 옵션 */}
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.is_important}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_important: e.target.checked }))}
                      className="w-4 h-4 text-red-600 focus:ring-red-500 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">중요 공지</span>
                    <span className="text-xs text-gray-500">(목록 최상단에 표시됩니다)</span>
                  </label>
                  
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.is_published}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_published: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">즉시 게시</span>
                  </label>
                </div>
              </div>
              
              <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6">
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false)
                      setEditingAnnouncement(null)
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    {editingAnnouncement ? '수정' : '작성'} 완료
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}