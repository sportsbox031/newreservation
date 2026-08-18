'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Download } from 'lucide-react'
import AdminNavigation from '@/components/AdminNavigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { eventStatusView } from '@/lib/eventStatusView'
import { buildCookieFirstClientHeaders } from '@/lib/clientAuthHeaders'

interface AppRow { id: string; org_name: string; manager_name: string | null; phone: string | null; event_date: string | null; total_count: number; status: string; submission_count: number }
interface SubGroup { application_id: string; org_name: string; status: string; submissions: { id: string; file_name: string }[] }

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

  // 같은 상태 버튼을 다시 누르면 선택을 취소(applied로 복귀)한다 — 오클릭 방지.
  const toggleStatus = (id: string, current: string, target: string) =>
    setStatus(id, current === target ? 'applied' : target)

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
                        <Badge variant={eventStatusView(a.status).variant}>{eventStatusView(a.status).label}</Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {a.status === 'cancelled' ? (
                          <span className="text-xs text-gray-400">취소됨</span>
                        ) : (
                          <div className="flex gap-1.5">
                            <Button variant="successToggle" size="xs" data-active={a.status === 'selected'}
                              title={a.status === 'selected' ? '다시 누르면 선정 취소' : '선정'}
                              onClick={() => toggleStatus(a.id, a.status, 'selected')}>선정</Button>
                            <Button variant="dangerToggle" size="xs" data-active={a.status === 'rejected'}
                              title={a.status === 'rejected' ? '다시 누르면 탈락 취소' : '탈락'}
                              onClick={() => toggleStatus(a.id, a.status, 'rejected')}>탈락</Button>
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
                  <p className="font-medium text-gray-900 mb-2 flex items-center gap-2">{g.org_name} <Badge variant={eventStatusView(g.status).variant}>{eventStatusView(g.status).label}</Badge></p>
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
