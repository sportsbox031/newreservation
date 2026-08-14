'use client'

import { useState } from 'react'
import Calendar from 'react-calendar'
import { X } from 'lucide-react'
import ModalOverlay from '@/components/ModalOverlay'
import { buildCookieFirstClientHeaders } from '@/lib/clientAuthHeaders'

interface EventDateOption { id: string; event_date: string; label: string | null }
interface Props {
  eventId: string
  dates: EventDateOption[]
  org: { organization_name: string; manager_name: string; phone: string }
  onClose: () => void
  onApplied: () => void
}

function toYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function EventApplyModal({ eventId, dates, org, onClose, onApplied }: Props) {
  const allowed = new Set(dates.map((d) => d.event_date))
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [student, setStudent] = useState(0)
  const [leader, setLeader] = useState(0)
  const [saving, setSaving] = useState(false)

  const total = student + leader

  const handleSubmit = async () => {
    const chosen = dates.find((d) => d.event_date === selectedDate)
    if (!chosen) { alert('신청할 일정 날짜를 선택해주세요.'); return }
    if (total < 1) { alert('참여 인원을 1명 이상 입력해주세요.'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/events/applications', {
        method: 'POST',
        credentials: 'include',
        headers: buildCookieFirstClientHeaders(),
        body: JSON.stringify({
          event_id: eventId,
          event_date_id: chosen.id,
          student_count: student,
          leader_count: leader,
        }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) { alert(json?.error?.message || '신청 중 오류가 발생했습니다.'); return }
      alert('신청이 완료되었습니다. 선정 발표를 기다려주세요.')
      onApplied()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalOverlay onClose={onClose} closeOnBackdrop={false}>
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-5 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900">이벤트 신청</h2>
          <button onClick={onClose} aria-label="닫기" className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">신청 일정 <span className="text-red-500">*</span></label>
            <Calendar
              onChange={(v) => v instanceof Date && setSelectedDate(toYmd(v))}
              tileDisabled={({ date, view }) => view === 'month' && !allowed.has(toYmd(date))}
              className="border rounded-lg"
            />
            <p className="text-sm text-gray-600 mt-2">선택: {selectedDate || '없음'}</p>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">단체명</span><span className="text-gray-900">{org.organization_name}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">담당자</span><span className="text-gray-900">{org.manager_name}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">연락처</span><span className="text-gray-900">{org.phone}</span></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">참여 학생수</label>
              <input type="number" min={0} value={student}
                onChange={(e) => setStudent(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">인솔자수</label>
              <input type="number" min={0} value={leader}
                onChange={(e) => setLeader(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
          </div>
          <p className="text-sm text-gray-700">전체 인원: <span className="font-semibold">{total}명</span></p>
        </div>
        <div className="sticky bottom-0 bg-white border-t p-5 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">취소</button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-60">
            {saving ? '신청 중...' : '신청하기'}
          </button>
        </div>
      </div>
    </ModalOverlay>
  )
}
