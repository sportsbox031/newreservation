'use client'

import { useState } from 'react'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import { X } from 'lucide-react'
import ModalOverlay from '@/components/ModalOverlay'
import { Button } from '@/components/ui/button'
import { buildCookieFirstClientHeaders } from '@/lib/clientAuthHeaders'

interface EventDateOption { id: string; event_date: string; label: string | null }
interface Props {
  eventId: string
  dates: EventDateOption[]
  org?: { organization_name: string; manager_name: string; phone: string }
  onClose: () => void
  onApplied: () => void
  // 수정 모드: 기존 신청건을 편집한다(선정 전에만 사용).
  mode?: 'create' | 'edit'
  applicationId?: string
  initial?: { student_count: number; leader_count: number; event_date: string | null }
}

function toYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// 'YYYY-MM-DD' → 로컬 자정 Date (UTC 파싱으로 인한 하루 밀림 방지)
function fromYmd(s: string): Date {
  const [y, m, d] = s.split('-').map((n) => parseInt(n, 10))
  return new Date(y, m - 1, d)
}

export default function EventApplyModal({
  eventId, dates, org, onClose, onApplied,
  mode = 'create', applicationId, initial,
}: Props) {
  const isEdit = mode === 'edit'
  const allowed = new Set(dates.map((d) => d.event_date))
  const labelByDate = new Map(dates.map((d) => [d.event_date, d.label]))
  const sortedDates = [...dates].sort((a, b) => a.event_date.localeCompare(b.event_date))
  const initialDate = initial?.event_date && allowed.has(initial.event_date) ? initial.event_date : ''
  const firstMonth = initialDate
    ? fromYmd(initialDate)
    : sortedDates.length ? fromYmd(sortedDates[0].event_date) : new Date()

  const [selectedDate, setSelectedDate] = useState<string>(initialDate)
  const [student, setStudent] = useState(initial?.student_count ?? 0)
  const [leader, setLeader] = useState(initial?.leader_count ?? 0)
  const [saving, setSaving] = useState(false)

  const total = student + leader

  const handleSubmit = async () => {
    const chosen = dates.find((d) => d.event_date === selectedDate)
    if (!chosen) { alert('신청할 일정 날짜를 선택해주세요.'); return }
    if (total < 1) { alert('참여 인원을 1명 이상 입력해주세요.'); return }
    setSaving(true)
    try {
      const url = isEdit
        ? `/api/events/applications?id=${applicationId}`
        : '/api/events/applications'
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
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
      if (!res.ok) { alert(json?.error?.message || (isEdit ? '수정 중 오류가 발생했습니다.' : '신청 중 오류가 발생했습니다.')); return }
      alert(isEdit ? '신청 내용이 수정되었습니다.' : '신청이 완료되었습니다. 선정 발표를 기다려주세요.')
      onApplied()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalOverlay onClose={onClose} closeOnBackdrop={false}>
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white border-b p-5 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900">{isEdit ? '신청 수정' : '이벤트 신청'}</h2>
          <button onClick={onClose} aria-label="닫기" className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">신청 일정 <span className="text-red-500">*</span></label>
              <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                <span className="inline-block w-3 h-3 rounded-sm border border-pink-200 bg-pink-50" />
                신청 가능 일정
              </span>
            </div>
            <div className="event-calendar-container">
              <Calendar
                locale="ko-KR"
                calendarType="gregory"
                value={selectedDate ? fromYmd(selectedDate) : null}
                defaultActiveStartDate={firstMonth}
                onChange={(v) => v instanceof Date && setSelectedDate(toYmd(v))}
                tileDisabled={({ date, view }) => view === 'month' && !allowed.has(toYmd(date))}
                tileClassName={({ date, view }) =>
                  view === 'month' && allowed.has(toYmd(date)) ? 'event-day-open' : null
                }
                tileContent={({ date, view }) => {
                  if (view !== 'month') return null
                  const lbl = labelByDate.get(toYmd(date))
                  return lbl ? <span className="event-day-label">{lbl}</span> : null
                }}
              />
            </div>
            <p className="text-sm text-gray-600 mt-3">
              선택한 일정: <span className="font-medium text-gray-900">{selectedDate
                ? `${selectedDate}${labelByDate.get(selectedDate) ? ` (${labelByDate.get(selectedDate)})` : ''}`
                : '없음'}</span>
            </p>
          </div>

          {org && (
            <div className="rounded-lg bg-gray-50 border border-gray-100 p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">단체명</span><span className="text-gray-900 font-medium">{org.organization_name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">담당자</span><span className="text-gray-900">{org.manager_name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">연락처</span><span className="text-gray-900">{org.phone}</span></div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">참여 학생수</label>
              <input type="number" min={0} value={student}
                onChange={(e) => setStudent(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">인솔자수</label>
              <input type="number" min={0} value={leader}
                onChange={(e) => setLeader(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <p className="text-sm text-gray-700">전체 인원: <span className="font-semibold">{total}명</span></p>
        </div>
        <div className="sticky bottom-0 bg-white border-t p-5 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>취소</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving}>
            {saving ? (isEdit ? '저장 중...' : '신청 중...') : (isEdit ? '수정 저장' : '신청하기')}
          </Button>
        </div>
      </div>
    </ModalOverlay>
  )
}
