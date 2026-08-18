'use client'

import { useEffect, useState } from 'react'
import { X, Paperclip, Download, Trash2, Pencil } from 'lucide-react'
import ModalOverlay from '@/components/ModalOverlay'
import EventApplyModal from '@/components/EventApplyModal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { eventStatusView } from '@/lib/eventStatusView'
import { buildCookieFirstClientHeaders } from '@/lib/clientAuthHeaders'

interface EventDateOption { id: string; event_date: string; label: string | null }
interface MyApplication {
  id: string
  event_id: string
  event_title: string
  event_date: string | null
  event_date_id: string | null
  student_count: number
  leader_count: number
  status: string
  total_count: number
  created_at: string
  event_dates: EventDateOption[]
}

export default function MyApplicationsModal({ onClose }: { onClose: () => void }) {
  const [apps, setApps] = useState<MyApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<MyApplication | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/events/applications', {
        credentials: 'include',
        headers: buildCookieFirstClientHeaders(),
      })
      const json = await res.json().catch(() => null)
      setApps(res.ok ? json?.data || [] : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleCancel = async (id: string) => {
    if (!confirm('이 신청을 취소하시겠습니까?')) return
    const res = await fetch(`/api/events/applications?id=${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: buildCookieFirstClientHeaders(),
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) { alert(json?.error?.message || '취소 중 오류가 발생했습니다.'); return }
    load()
  }

  return (
    <>
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-lg max-w-lg w-full max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-5 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900">내 신청내역</h2>
          <button aria-label="닫기" onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          {loading ? (
            <p className="text-center text-gray-500 py-8">불러오는 중...</p>
          ) : apps.length === 0 ? (
            <p className="text-center text-gray-500 py-8">신청한 이벤트가 없습니다.</p>
          ) : (
            apps.map((a) => {
              const sv = eventStatusView(a.status)
              return (
              <div key={a.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <p className="font-medium text-gray-900">{a.event_title}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {a.event_date || '-'} · 전체 {a.total_count}명
                    </p>
                  </div>
                  <Badge variant={sv.variant}>{sv.label}</Badge>
                </div>
                {a.status === 'applied' && (
                  <div className="mt-3 flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditing(a)}>
                      <Pencil className="w-3.5 h-3.5" /> 수정
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleCancel(a.id)}
                      className="text-red-600 hover:bg-red-50 hover:text-red-700">
                      신청 취소
                    </Button>
                  </div>
                )}
                {a.status !== 'cancelled' && <SubmissionSection applicationId={a.id} />}
              </div>
            )})
          )}
        </div>
      </div>
    </ModalOverlay>
    {editing && (
      <EventApplyModal
        eventId={editing.event_id}
        dates={editing.event_dates}
        mode="edit"
        applicationId={editing.id}
        initial={{
          student_count: editing.student_count,
          leader_count: editing.leader_count,
          event_date: editing.event_date,
        }}
        onClose={() => setEditing(null)}
        onApplied={() => { setEditing(null); load() }}
      />
    )}
    </>
  )
}

interface SubmissionItem { id: string; file_name: string; file_size: number }

function SubmissionSection({ applicationId }: { applicationId: string }) {
  const [subs, setSubs] = useState<SubmissionItem[]>([])
  const [busy, setBusy] = useState(false)

  const load = async () => {
    const res = await fetch(`/api/events/submissions?application_id=${applicationId}`, { credentials: 'include', headers: buildCookieFirstClientHeaders() })
    const json = await res.json().catch(() => null)
    if (res.ok) setSubs(json?.data || [])
  }
  useEffect(() => { load() }, [])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('application_id', applicationId)
      fd.append('file', file)
      const res = await fetch('/api/events/submissions', { method: 'POST', credentials: 'include', body: fd })
      const json = await res.json().catch(() => null)
      if (!res.ok) { alert(json?.error?.message || '업로드에 실패했습니다.'); return }
      load()
    } finally { setBusy(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 서류를 삭제하시겠습니까?')) return
    const res = await fetch(`/api/events/submissions?id=${id}`, { method: 'DELETE', credentials: 'include', headers: buildCookieFirstClientHeaders() })
    const json = await res.json().catch(() => null)
    if (!res.ok) { alert(json?.error?.message || '삭제에 실패했습니다.'); return }
    load()
  }

  const handleDownload = async (id: string) => {
    const res = await fetch(`/api/events/submissions?download_id=${id}`, { credentials: 'include', headers: buildCookieFirstClientHeaders() })
    const json = await res.json().catch(() => null)
    if (!res.ok || !json?.data?.url) { alert(json?.error?.message || '다운로드 링크를 생성할 수 없습니다.'); return }
    window.open(json.data.url, '_blank')
  }

  return (
    <div className="mt-3 border-t border-gray-100 pt-3">
      <p className="text-xs font-medium text-gray-500 mb-2">제출 서류 ({subs.length}/10)</p>
      <ul className="space-y-1 mb-2">
        {subs.map(s => (
          <li key={s.id} className="flex items-center justify-between text-sm">
            <button onClick={() => handleDownload(s.id)} className="flex items-center gap-1 text-blue-600 hover:underline">
              <Download className="w-3.5 h-3.5" />{s.file_name}
            </button>
            <button aria-label="삭제" onClick={() => handleDelete(s.id)} className="text-gray-400 hover:text-red-600">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <label className="inline-flex items-center gap-1 text-sm text-blue-600 cursor-pointer hover:underline">
        <Paperclip className="w-3.5 h-3.5" />
        {busy ? '업로드 중...' : '서류 추가'}
        <input type="file" className="hidden" disabled={busy || subs.length >= 10}
          accept=".pdf,.hwp,.hwpx,.jpg,.jpeg,.png" onChange={handleUpload} />
      </label>
    </div>
  )
}
