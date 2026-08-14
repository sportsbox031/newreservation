'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DOMPurify from 'dompurify'
import { ArrowLeft, Trophy } from 'lucide-react'
import { buildCookieFirstClientHeaders } from '@/lib/clientAuthHeaders'
import EventApplyModal from '@/components/EventApplyModal'

interface EventDetail {
  id: string
  title: string
  description: string | null
  content_type: 'html' | 'text'
  thumbnail_path: string | null
  video_url: string | null
  event_dates: { id: string; event_date: string; label: string | null; sort_order: number }[]
  event_form_files?: { id: string; file_name: string; storage_path: string }[]
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
  const [org, setOrg] = useState({ organization_name: '', manager_name: '', phone: '' })

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
      } finally {
        setLoading(false)
      }
    })()
  }, [id, router])

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500">불러오는 중...</div>
  if (!event) return null

  const img = eventImagePublicUrl(event.thumbnail_path)
  const sortedDates = [...event.event_dates].sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.push('/events')} className="text-gray-500 hover:text-gray-800"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-lg font-bold text-gray-900 truncate">{event.title}</h1>
        </div>
      </header>

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

        <div className="pt-2">
          <button
            onClick={() => setShowApply(true)}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
          >
            신청하기
          </button>
        </div>
      </main>

      {showApply && (
        <EventApplyModal
          eventId={event.id}
          dates={sortedDates}
          org={org}
          onClose={() => setShowApply(false)}
          onApplied={() => { /* 상태 없음: 알림 후 닫힘만 */ }}
        />
      )}
    </div>
  )
}
