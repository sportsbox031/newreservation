'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trophy } from 'lucide-react'
import { buildCookieFirstClientHeaders } from '@/lib/clientAuthHeaders'
import UserNavigation from '@/components/UserNavigation'

interface EventCard {
  id: string
  title: string
  thumbnail_path: string | null
}

function eventImagePublicUrl(path: string | null): string | null {
  if (!path) return null
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return null
  return `${base}/storage/v1/object/public/event-images/${path}`
}

export default function EventsPage() {
  const router = useRouter()
  const [events, setEvents] = useState<EventCard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const currentUser = typeof window !== 'undefined' ? localStorage.getItem('currentUser') : null
    if (!currentUser) { router.push('/auth/login'); return }
    ;(async () => {
      try {
        const res = await fetch('/api/events', { credentials: 'include', headers: buildCookieFirstClientHeaders() })
        const json = await res.json().catch(() => null)
        setEvents(res.ok ? json?.data || [] : [])
      } finally {
        setLoading(false)
      }
    })()
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50">
      <UserNavigation />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-6 h-6 text-blue-600" />
          <h2 className="text-lg font-bold text-gray-900">모집중인 이벤트</h2>
        </div>
        {loading ? (
          <p className="text-gray-500 py-12 text-center">불러오는 중...</p>
        ) : events.length === 0 ? (
          <p className="text-gray-500 py-12 text-center">현재 모집중인 이벤트가 없습니다.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((e) => {
              const img = eventImagePublicUrl(e.thumbnail_path)
              return (
                <button
                  key={e.id}
                  onClick={() => router.push(`/events/${e.id}`)}
                  className="text-left bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="aspect-video bg-gray-100 flex items-center justify-center">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt={e.title} className="w-full h-full object-cover" />
                    ) : (
                      <Trophy className="w-10 h-10 text-gray-300" />
                    )}
                  </div>
                  <div className="p-4">
                    <p className="font-medium text-gray-900 truncate">{e.title}</p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
