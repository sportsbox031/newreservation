'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DOMPurify from 'dompurify'
import { ArrowLeft, Trophy, CheckCircle2 } from 'lucide-react'
import { buildCookieFirstClientHeaders } from '@/lib/clientAuthHeaders'
import EventApplyModal from '@/components/EventApplyModal'
import MyApplicationsModal from '@/components/MyApplicationsModal'
import UserNavigation from '@/components/UserNavigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { computeEffectiveOpen } from '@/lib/eventReservationStatus'
import { eventStatusView } from '@/lib/eventStatusView'

interface EventDetail {
  id: string
  title: string
  description: string | null
  content_type: 'html' | 'text'
  thumbnail_path: string | null
  video_url: string | null
  is_open: boolean
  reservation_start_at: string | null
  reservation_end_at: string | null
  event_dates: { id: string; event_date: string; label: string | null; sort_order: number }[]
  event_form_files?: { id: string; file_name: string }[]
}

function eventImagePublicUrl(path: string | null): string | null {
  if (!path) return null
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return null
  return `${base}/storage/v1/object/public/event-images/${path}`
}

export default function EventDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = String(params?.id || '')
  const [event, setEvent] = useState<EventDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [showApply, setShowApply] = useState(false)
  const [showMine, setShowMine] = useState(false)
  const [myStatus, setMyStatus] = useState<string | null>(null)
  const [org, setOrg] = useState({ organization_name: '', manager_name: '', phone: '' })

  // 이 이벤트에 대한 내 신청 상태(취소 제외)를 조회한다.
  const refreshMyStatus = async () => {
    const res = await fetch('/api/events/applications', { credentials: 'include', headers: buildCookieFirstClientHeaders() })
    const json = await res.json().catch(() => null)
    if (!res.ok) return
    const mine = (json?.data || []).find((a: { event_id: string; status: string }) => a.event_id === id && a.status !== 'cancelled')
    setMyStatus(mine?.status ?? null)
  }

  useEffect(() => {
    const cu = typeof window !== 'undefined' ? localStorage.getItem('currentUser') : null
    if (!cu) { router.push('/auth/login'); return }
    try {
      const u = JSON.parse(cu)
      setOrg({ organization_name: u.organization_name || '', manager_name: u.manager_name || '', phone: u.phone || '' })
    } catch { /* noop */ }
    ;(async () => {
      try {
        const res = await fetch(`/api/events?id=${id}`, { credentials: 'include', headers: buildCookieFirstClientHeaders() })
        const json = await res.json().catch(() => null)
        if (!res.ok) { alert(json?.error?.message || '이벤트를 불러오지 못했습니다.'); router.push('/events'); return }
        setEvent(json?.data || null)
        await refreshMyStatus()
      } finally {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, router])

  const img = event ? eventImagePublicUrl(event.thumbnail_path) : null
  const sortedDates = event ? [...event.event_dates].sort((a, b) => a.sort_order - b.sort_order) : []
  const isOpen = event ? computeEffectiveOpen(event, new Date().toISOString()) : false

  return (
    <div className="min-h-screen bg-gray-50">
      <UserNavigation />

      {loading ? (
        <div className="max-w-3xl mx-auto px-4 py-16 text-center text-gray-500">불러오는 중...</div>
      ) : !event ? null : (
        <>
          <div className="max-w-3xl mx-auto px-4 pt-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/events')}
                className="flex items-center gap-1 text-gray-500 hover:text-gray-800"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="text-sm">목록으로</span>
              </button>
              <h1 className="text-lg font-bold text-gray-900 truncate">{event.title}</h1>
            </div>
          </div>

          <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            <div className="aspect-video bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center">
              {img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={img} alt={event.title} className="w-full h-full object-cover" />
              ) : (
                <Trophy className="w-12 h-12 text-gray-300" />
              )}
            </div>

            {event.description && (
              <div
                className="prose max-w-none text-gray-800"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(event.description) }}
              />
            )}

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">일정</h3>
              <ul className="space-y-1 text-sm text-gray-700">
                {sortedDates.map((d) => (
                  <li key={d.id}>· {d.event_date}{d.label ? ` (${d.label})` : ''}</li>
                ))}
              </ul>
            </div>

            {event.event_form_files && event.event_form_files.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">서류양식</h3>
                <ul className="space-y-1 text-sm">
                  {event.event_form_files.map(f => (
                    <li key={f.id}>
                      <button
                        onClick={async () => {
                          const res = await fetch(`/api/events/files/download?id=${f.id}`, { credentials: 'include', headers: buildCookieFirstClientHeaders() })
                          const json = await res.json().catch(() => null)
                          if (!res.ok || !json?.data?.url) { alert(json?.error?.message || '다운로드 링크를 생성할 수 없습니다.'); return }
                          window.open(json.data.url, '_blank')
                        }}
                        className="text-blue-600 hover:underline"
                      >
                        {f.file_name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-2">
              {myStatus ? (
                // 이미 신청함 — 상태 안내 + 내 신청내역에서 관리
                <div className="rounded-lg border border-gray-200 bg-white p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>이미 신청하셨습니다.</span>
                    <Badge variant={eventStatusView(myStatus).variant}>{eventStatusView(myStatus).label}</Badge>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setShowMine(true)}>내 신청 관리</Button>
                </div>
              ) : isOpen ? (
                <Button variant="primary" size="md" className="w-full py-3" onClick={() => setShowApply(true)}>
                  신청하기
                </Button>
              ) : (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-500">
                  모집이 종료된 이벤트입니다.
                </div>
              )}
            </div>
          </main>

          {showApply && (
            <EventApplyModal
              eventId={event.id}
              dates={sortedDates}
              org={org}
              onClose={() => setShowApply(false)}
              onApplied={() => { refreshMyStatus() }}
            />
          )}
          {showMine && <MyApplicationsModal onClose={() => { setShowMine(false); refreshMyStatus() }} />}
        </>
      )}
    </div>
  )
}
