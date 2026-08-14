'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Trophy,
  Plus,
  Edit2,
  Trash2,
  Image as ImageIcon,
  X,
  CalendarDays,
  PlayCircle,
  PauseCircle,
  Search,
  ClipboardList
} from 'lucide-react'
import RichTextEditor from '@/components/RichTextEditor'
import AdminNavigation from '@/components/AdminNavigation'
import FileUploadManager, { FileAttachment } from '@/components/FileUploadManager'
import ModalOverlay from '@/components/ModalOverlay'
import { buildCookieFirstClientHeaders } from '@/lib/clientAuthHeaders'
import { computeEffectiveOpen } from '@/lib/eventReservationStatus'
import { getRemovedExistingAttachments, type PersistedAttachment } from '@/lib/announcementAttachments'

interface EventDateRow {
  id?: string
  event_id?: string
  event_date: string
  label: string | null
  sort_order: number
}

interface EventFormFileRow {
  id: string
  event_id: string
  file_name: string
  file_size: number
  file_type: string
  storage_path: string
  uploaded_at?: string
}

interface EventRow {
  id: string
  title: string
  description: string | null
  content_type: 'html' | 'text'
  thumbnail_path: string | null
  video_url: string | null
  is_open: boolean
  reservation_start_at: string | null
  reservation_end_at: string | null
  author_id: string | null
  created_at: string
  updated_at: string
  event_dates: EventDateRow[]
  event_form_files?: EventFormFileRow[]
}

interface DateInputRow {
  event_date: string
  label: string
}

// 이벤트 대표이미지 공개 버킷(event-images)의 공개 URL을 조립한다.
// (upload API는 storage path만 저장하고, 공개 조회는 supabase의 공개 버킷 URL 규칙을 그대로 사용)
function eventImagePublicUrl(path: string | null): string | null {
  if (!path) return null
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return null
  return `${base}/storage/v1/object/public/event-images/${path}`
}

async function readJsonSafely(response: Response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

export default function AdminEventsPage() {
  const router = useRouter()
  const [adminInfo, setAdminInfo] = useState<any>(null)
  const [events, setEvents] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<EventRow | null>(null)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    video_url: ''
  })
  const [dates, setDates] = useState<DateInputRow[]>([{ event_date: '', label: '' }])

  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [thumbnailPath, setThumbnailPath] = useState<string | null>(null)
  const [removeThumbnail, setRemoveThumbnail] = useState(false)

  const [formFiles, setFormFiles] = useState<FileAttachment[]>([])
  const [originalFormFiles, setOriginalFormFiles] = useState<PersistedAttachment[]>([])

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
    setLoading(true)
    try {
      const eventsResponse = await fetch('/api/admin/events', {
        credentials: 'include',
        headers: buildCookieFirstClientHeaders()
      })

      const eventsJson = await readJsonSafely(eventsResponse)
      if (!eventsResponse.ok) {
        console.error('이벤트 목록 로드 오류:', eventsJson?.error)
        alert(eventsJson?.error?.message || '이벤트 목록을 불러오지 못했습니다.')
        setEvents([])
      } else {
        setEvents(eventsJson?.data || [])
      }
    } catch (error) {
      console.error('이벤트 데이터 로드 예외:', error)
      alert('이벤트 목록을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const resetThumbnailState = () => {
    if (thumbnailPreview && thumbnailPreview.startsWith('blob:')) {
      URL.revokeObjectURL(thumbnailPreview)
    }
    setThumbnailFile(null)
    setThumbnailPreview(null)
    setThumbnailPath(null)
    setRemoveThumbnail(false)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingEvent(null)
    resetThumbnailState()
    setFormFiles([])
    setOriginalFormFiles([])
  }

  const handleCreate = () => {
    setFormData({
      title: '',
      description: '',
      video_url: ''
    })
    setDates([{ event_date: '', label: '' }])
    resetThumbnailState()
    setFormFiles([])
    setOriginalFormFiles([])
    setEditingEvent(null)
    setShowModal(true)
  }

  const handleEdit = (event: EventRow) => {
    setFormData({
      title: event.title,
      description: event.description || '',
      video_url: event.video_url || ''
    })

    const sortedDates = [...(event.event_dates || [])].sort((a, b) => a.sort_order - b.sort_order)
    setDates(
      sortedDates.length > 0
        ? sortedDates.map(d => ({ event_date: d.event_date, label: d.label || '' }))
        : [{ event_date: '', label: '' }]
    )

    resetThumbnailState()
    setThumbnailPreview(eventImagePublicUrl(event.thumbnail_path))
    setThumbnailPath(event.thumbnail_path)

    // 기존 서류양식파일을 편집 UI에 표시하고, 저장 시 제거분을 계산할 수 있도록 원본 목록을 보관.
    const existingFiles = (event.event_form_files || []).map(f => ({
      id: f.id,
      file_name: f.file_name,
      file_size: f.file_size,
      file_type: f.file_type,
      storage_path: f.storage_path
    }))
    setFormFiles(existingFiles)
    setOriginalFormFiles(existingFiles.map(f => ({ id: f.id!, storage_path: f.storage_path! })))

    setEditingEvent(event)
    setShowModal(true)
  }

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (thumbnailPreview && thumbnailPreview.startsWith('blob:')) {
      URL.revokeObjectURL(thumbnailPreview)
    }
    setThumbnailFile(file)
    setThumbnailPreview(URL.createObjectURL(file))
    setRemoveThumbnail(false)
  }

  const handleRemoveThumbnail = () => {
    resetThumbnailState()
    setRemoveThumbnail(true)
  }

  const addDateRow = () => {
    setDates(prev => [...prev, { event_date: '', label: '' }])
  }

  const removeDateRow = (index: number) => {
    setDates(prev => prev.filter((_, i) => i !== index))
  }

  const updateDateRow = (index: number, field: keyof DateInputRow, value: string) => {
    setDates(prev => prev.map((d, i) => (i === index ? { ...d, [field]: value } : d)))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validDates = dates.filter(d => d.event_date)
    if (validDates.length === 0) {
      alert('일정 날짜를 최소 1개 이상 추가해주세요.')
      return
    }

    setSaving(true)
    try {
      // 1) 대표이미지 업로드 (새 파일을 선택한 경우에만)
      let effectiveThumbnailPath: string | null | undefined
      if (thumbnailFile) {
        const uploadForm = new FormData()
        uploadForm.append('file', thumbnailFile)

        const uploadResponse = await fetch('/api/admin/events/image', {
          method: 'POST',
          credentials: 'include',
          body: uploadForm
        })
        const uploadJson = await readJsonSafely(uploadResponse)
        if (!uploadResponse.ok) {
          alert(uploadJson?.error?.message || '대표이미지 업로드에 실패했습니다.')
          return
        }
        effectiveThumbnailPath = uploadJson?.data?.path
      } else if (removeThumbnail) {
        effectiveThumbnailPath = null
      } else if (editingEvent) {
        // 변경 없음: 기존 값을 그대로 유지 (서버는 undefined면 기존 값 보존, 명시값이면 덮어씀)
        effectiveThumbnailPath = thumbnailPath
      }

      const payload: Record<string, unknown> = {
        title: formData.title,
        description: formData.description,
        content_type: 'html',
        video_url: formData.video_url.trim() || null,
        dates: validDates.map((d, i) => ({
          event_date: d.event_date,
          label: d.label.trim() || undefined,
          sort_order: i
        }))
      }
      if (effectiveThumbnailPath !== undefined) {
        payload.thumbnail_path = effectiveThumbnailPath
      }

      const url = editingEvent ? `/api/admin/events?id=${editingEvent.id}` : '/api/admin/events'
      const method = editingEvent ? 'PUT' : 'POST'
      const response = await fetch(url, {
        method,
        credentials: 'include',
        headers: buildCookieFirstClientHeaders(),
        body: JSON.stringify(payload)
      })
      const json = await readJsonSafely(response)
      if (!response.ok) {
        alert(json?.error?.message || '이벤트 저장 중 오류가 발생했습니다.')
        return
      }

      const savedEvent = json?.data
      const newFiles = formFiles.filter(f => f.file)
      const failedUploads: string[] = []

      // 편집 중 사용자가 목록에서 제거한 기존 서류양식파일을 실제로 삭제(원본 대비 차집합).
      const removedFiles = getRemovedExistingAttachments(originalFormFiles, formFiles)
      for (const removed of removedFiles) {
        const deleteResponse = await fetch(
          `/api/admin/events/files?id=${encodeURIComponent(removed.id)}&path=${encodeURIComponent(removed.storage_path)}`,
          {
            method: 'DELETE',
            credentials: 'include',
            headers: buildCookieFirstClientHeaders()
          }
        )
        if (!deleteResponse.ok) {
          const deleteJson = await readJsonSafely(deleteResponse)
          console.error('서류양식파일 삭제 실패:', deleteJson?.error)
          alert('기존 서류양식파일 삭제 중 오류가 발생했습니다.')
          return
        }
      }

      if (savedEvent?.id) {
        for (const attachment of newFiles) {
          if (!attachment.file) continue
          const fileForm = new FormData()
          fileForm.append('event_id', savedEvent.id)
          fileForm.append('file', attachment.file)

          const fileResponse = await fetch('/api/admin/events/files', {
            method: 'POST',
            credentials: 'include',
            body: fileForm
          })
          if (!fileResponse.ok) {
            const fileJson = await readJsonSafely(fileResponse)
            console.error('서류양식파일 업로드 실패:', fileJson?.error)
            failedUploads.push(attachment.file_name)
          }
        }
      }

      if (failedUploads.length > 0) {
        alert(`이벤트는 저장되었지만 다음 서류양식파일 업로드에 실패했습니다:\n- ${failedUploads.join('\n- ')}\n\n수정에서 다시 첨부해주세요.`)
      }

      closeModal()
      loadData()
    } catch (error) {
      console.error('이벤트 저장 오류:', error)
      alert('이벤트 저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (event: EventRow) => {
    if (!confirm(`"${event.title}" 이벤트를 삭제하시겠습니까?`)) return

    try {
      const response = await fetch(`/api/admin/events?id=${event.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: buildCookieFirstClientHeaders()
      })
      const json = await readJsonSafely(response)
      if (!response.ok) {
        alert(json?.error?.message || '이벤트 삭제 중 오류가 발생했습니다.')
        return
      }
      loadData()
    } catch (error) {
      console.error('이벤트 삭제 오류:', error)
      alert('이벤트 삭제 중 오류가 발생했습니다.')
    }
  }

  const handleToggleStatus = async (event: EventRow, nextOpen: boolean) => {
    try {
      const response = await fetch(`/api/admin/events/status?id=${event.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: buildCookieFirstClientHeaders(),
        body: JSON.stringify({ is_open: nextOpen })
      })
      const json = await readJsonSafely(response)
      if (!response.ok) {
        alert(json?.error?.message || '예약 상태 변경 중 오류가 발생했습니다.')
        return
      }
      loadData()
    } catch (error) {
      console.error('예약 상태 변경 오류:', error)
      alert('예약 상태 변경 중 오류가 발생했습니다.')
    }
  }

  // 이벤트는 지역 구분이 없으므로 모든 관리자가 모든 이벤트를 수정/삭제/토글할 수 있다.
  const canManageEvent = () => true

  const filteredEvents = events.filter(event =>
    event.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
              <Trophy className="w-7 h-7 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">스포츠이벤트 관리</h1>
            </div>
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              새 이벤트
            </button>
          </div>
        </div>

        {/* 검색 */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="이벤트 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* 이벤트 목록 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Trophy className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>등록된 이벤트가 없습니다.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">
                      이벤트명
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">
                      모집상태
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 tracking-wider">
                      일정 수
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">
                      관리
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredEvents.map((event) => {
                    const effectiveOpen = computeEffectiveOpen(event, new Date().toISOString())
                    const hasSchedule = Boolean(event.reservation_start_at) && Boolean(event.reservation_end_at)
                    const manageable = canManageEvent()

                    return (
                      <tr key={event.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900 truncate max-w-[220px]" title={event.title}>
                            {event.title}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {effectiveOpen ? (
                            <span className="inline-flex px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-medium rounded-full">
                              모집중
                            </span>
                          ) : (
                            <span className="inline-flex px-2.5 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded-full">
                              종료
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-700">
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
                            {event.event_dates?.length || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => manageable && handleEdit(event)}
                              disabled={!manageable}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                              title={manageable ? '수정' : '본인이 등록한 이벤트만 수정할 수 있습니다'}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => manageable && handleDelete(event)}
                              disabled={!manageable}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                              title={manageable ? '삭제' : '본인이 등록한 이벤트만 삭제할 수 있습니다'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => manageable && !hasSchedule && handleToggleStatus(event, !effectiveOpen)}
                              disabled={!manageable || hasSchedule}
                              className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                              title={
                                hasSchedule
                                  ? '자동 스케줄이 설정된 이벤트는 수동 토글할 수 없습니다'
                                  : effectiveOpen
                                  ? '예약 종료'
                                  : '예약 시작'
                              }
                            >
                              {effectiveOpen ? <PauseCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => router.push(`/admin/events/${event.id}`)}
                              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="신청관리"
                            >
                              <ClipboardList className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 생성/수정 모달 */}
        {showModal && (
          <ModalOverlay onClose={closeModal} closeOnBackdrop={false}>
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleSubmit}>
                <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900">
                      {editingEvent ? '이벤트 수정' : '새 이벤트 작성'}
                    </h2>
                    <button
                      type="button"
                      onClick={closeModal}
                      className="text-gray-400 hover:text-gray-600 text-xl font-semibold"
                    >
                      ×
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* 이벤트명 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      이벤트명 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="이벤트명을 입력하세요"
                    />
                  </div>

                  {/* 대표이미지 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">대표이미지</label>
                    {thumbnailPreview ? (
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={thumbnailPreview}
                          alt="대표이미지 미리보기"
                          className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveThumbnail}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                          이미지 제거
                        </button>
                      </div>
                    ) : (
                      <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-colors">
                        <ImageIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">이미지 선택 (jpg, jpeg, png)</span>
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                          onChange={handleThumbnailChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  {/* 설명 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">설명</label>
                    <RichTextEditor
                      value={formData.description}
                      onChange={(content) => setFormData(prev => ({ ...prev, description: content }))}
                      placeholder="이벤트 설명을 입력하세요"
                    />
                  </div>

                  {/* 영상 URL */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">영상 URL</label>
                    <input
                      type="url"
                      value={formData.video_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, video_url: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://..."
                    />
                  </div>

                  {/* 일정 날짜 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      일정 날짜 <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-2">
                      {dates.map((date, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            type="date"
                            value={date.event_date}
                            onChange={(e) => updateDateRow(index, 'event_date', e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <input
                            type="text"
                            value={date.label}
                            onChange={(e) => updateDateRow(index, 'label', e.target.value)}
                            placeholder="라벨 (선택, 예: 1일차)"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <button
                            type="button"
                            onClick={() => removeDateRow(index)}
                            disabled={dates.length === 1}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                            title="삭제"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={addDateRow}
                      className="mt-2 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      날짜 추가
                    </button>
                  </div>

                  {/* 서류양식파일 */}
                  <FileUploadManager
                    files={formFiles}
                    onChange={setFormFiles}
                    maxFiles={5}
                    maxFileSize={5 * 1024 * 1024}
                  />
                </div>

                <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6">
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {saving ? '저장 중...' : editingEvent ? '수정 완료' : '작성 완료'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </ModalOverlay>
        )}
      </div>
    </div>
  )
}
