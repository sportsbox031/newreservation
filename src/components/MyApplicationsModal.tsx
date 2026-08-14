'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import ModalOverlay from '@/components/ModalOverlay'
import { buildCookieFirstClientHeaders } from '@/lib/clientAuthHeaders'

interface MyApplication {
  id: string
  event_id: string
  event_title: string
  event_date: string | null
  status: string
  total_count: number
  created_at: string
}

const STATUS_LABEL: Record<string, string> = {
  applied: '신청',
  selected: '선정',
  rejected: '탈락',
  cancelled: '취소',
}

export default function MyApplicationsModal({ onClose }: { onClose: () => void }) {
  const [apps, setApps] = useState<MyApplication[]>([])
  const [loading, setLoading] = useState(true)

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
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-lg max-w-lg w-full max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-5 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900">내 신청내역</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          {loading ? (
            <p className="text-center text-gray-500 py-8">불러오는 중...</p>
          ) : apps.length === 0 ? (
            <p className="text-center text-gray-500 py-8">신청한 이벤트가 없습니다.</p>
          ) : (
            apps.map((a) => (
              <div key={a.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <p className="font-medium text-gray-900">{a.event_title}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {a.event_date || '-'} · 전체 {a.total_count}명
                    </p>
                  </div>
                  <span className="inline-flex px-2.5 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded-full whitespace-nowrap">
                    {STATUS_LABEL[a.status] || a.status}
                  </span>
                </div>
                {a.status === 'applied' && (
                  <div className="mt-3 text-right">
                    <button
                      onClick={() => handleCancel(a.id)}
                      className="text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      신청 취소
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </ModalOverlay>
  )
}
