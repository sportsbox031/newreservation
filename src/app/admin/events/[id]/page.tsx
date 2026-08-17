'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Download } from 'lucide-react'
import AdminNavigation from '@/components/AdminNavigation'
import { buildCookieFirstClientHeaders } from '@/lib/clientAuthHeaders'

interface AppRow { id: string; org_name: string; manager_name: string | null; phone: string | null; event_date: string | null; total_count: number; status: string; submission_count: number }
interface SubGroup { application_id: string; org_name: string; status: string; submissions: { id: string; file_name: string }[] }

const STATUS_LABEL: Record<string, string> = { applied: '신청', selected: '선정', rejected: '탈락', cancelled: '취소' }

export default function AdminEventApplicationsPage() {
  const router = useRouter()
  const params = useParams()
  const eventId = String(params?.id || '')
  const [adminInfo, setAdminInfo] = useState<{ role?: string } | null>(null)
  const [apps, setApps] = useState<AppRow[]>([])
  const [groups, setGroups] = useState<SubGroup[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [ar, sr] = await Promise.all([
        fetch(`/api/admin/events/applications?event_id=${eventId}`, { credentials: 'include', headers: buildCookieFirstClientHeaders() }),
        fetch(`/api/admin/events/submissions?event_id=${eventId}`, { credentials: 'include', headers: buildCookieFirstClientHeaders() }),
      ])
      const aj = await ar.json().catch(() => null)
      const sj = await sr.json().catch(() => null)
      if (ar.ok) setApps(aj?.data || [])
      if (sr.ok) setGroups(sj?.data || [])
    } finally { setLoading(false) }
  }

  useEffect(() => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('adminInfo') : null
    if (!raw) { router.push('/auth/login'); return }
    try { setAdminInfo(JSON.parse(raw)) } catch { /* noop */ }
    load()
  }, [eventId, router])

  const setStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/admin/events/applications?id=${id}`, {
      method: 'PATCH', credentials: 'include', headers: buildCookieFirstClientHeaders(), body: JSON.stringify({ status }),
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) { alert(json?.error?.message || '상태 변경에 실패했습니다.'); return }
    load()
  }

  const download = async (submissionId: string) => {
    const res = await fetch(`/api/admin/events/submissions?download_id=${submissionId}`, { credentials: 'include', headers: buildCookieFirstClientHeaders() })
    const json = await res.json().catch(() => null)
    if (!res.ok || !json?.data?.url) { alert(json?.error?.message || '다운로드 링크를 생성할 수 없습니다.'); return }
    window.open(json.data.url, '_blank')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation adminRole={adminInfo?.role} />
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <button onClick={() => router.push('/admin/events')} className="flex items-center gap-1 text-gray-500 hover:text-gray-800 mb-4">
          <ArrowLeft className="w-4 h-4" /> 이벤트 목록
        </button>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">신청 관리</h1>

        {loading ? (
          <p className="text-gray-500 py-12 text-center">불러오는 중...</p>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto mb-8">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {['단체명', '담당자', '연락처', '선택날짜', '전체인원', '제출', '상태', '처리'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {apps.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-8 text-gray-500">신청자가 없습니다.</td></tr>
                  ) : apps.map(a => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{a.org_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{a.manager_name || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{a.phone || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{a.event_date || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{a.total_count}명</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{a.submission_count}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex px-2.5 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded-full">{STATUS_LABEL[a.status] || a.status}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {a.status === 'cancelled' ? (
                          <span className="text-xs text-gray-400">취소됨</span>
                        ) : (
                          <div className="flex gap-1">
                            <button onClick={() => setStatus(a.id, 'selected')} disabled={a.status === 'selected'}
                              className="px-2 py-1 text-xs rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-40">선정</button>
                            <button onClick={() => setStatus(a.id, 'rejected')} disabled={a.status === 'rejected'}
                              className="px-2 py-1 text-xs rounded bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-40">탈락</button>
                            <button onClick={() => setStatus(a.id, 'applied')} disabled={a.status === 'applied'}
                              className="px-2 py-1 text-xs rounded bg-gray-50 text-gray-700 hover:bg-gray-100 disabled:opacity-40">미정</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h2 className="text-lg font-bold text-gray-900 mb-3">제출 서류</h2>
            <div className="space-y-4">
              {groups.filter(g => g.submissions.length > 0).length === 0 ? (
                <p className="text-gray-500">제출된 서류가 없습니다.</p>
              ) : groups.filter(g => g.submissions.length > 0).map(g => (
                <div key={g.application_id} className="bg-white rounded-lg border border-gray-200 p-4">
                  <p className="font-medium text-gray-900 mb-2">{g.org_name} <span className="text-xs text-gray-500">({STATUS_LABEL[g.status] || g.status})</span></p>
                  <ul className="space-y-1">
                    {g.submissions.map(s => (
                      <li key={s.id}>
                        <button onClick={() => download(s.id)} className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
                          <Download className="w-3.5 h-3.5" />{s.file_name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
