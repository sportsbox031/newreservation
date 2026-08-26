'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Users2, BarChart3, ChevronRight, RotateCcw } from 'lucide-react'
import AdminNavigation from '@/components/AdminNavigation'
import Spinner from '@/components/Spinner'
import { buildCookieFirstClientHeaders } from '@/lib/clientAuthHeaders'
import type { PerformanceSummary } from '@/lib/performanceTypes'

const YEARS = [2025, 2026, 2027, 2028, 2029, 2030]
const MONTH_LABELS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
const CURRENT_YEAR = 2026

type RegionFilter = 'all' | 'south' | 'north'

async function readJsonSafely(response: Response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

export default function AdminPerformancePage() {
  const router = useRouter()
  const [adminRole, setAdminRole] = useState<string | null>(null)
  const [year, setYear] = useState(CURRENT_YEAR)
  const [region, setRegion] = useState<RegionFilter>('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [summary, setSummary] = useState<PerformanceSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  const isRegionalAdmin = adminRole === 'south' || adminRole === 'north'

  useEffect(() => {
    const adminAuth = localStorage.getItem('adminInfo')
    if (!adminAuth) {
      router.push('/auth/login')
      return
    }
    let adminData: any
    try {
      adminData = JSON.parse(adminAuth)
    } catch {
      localStorage.removeItem('adminInfo')
      router.push('/auth/login')
      return
    }
    setAdminRole(adminData.role)
    if (adminData.role === 'south' || adminData.role === 'north') {
      setRegion(adminData.role)
    }
  }, [router])

  const loadSummary = useCallback(async () => {
    if (!adminRole) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('year', String(year))
      if (region !== 'all') params.set('region', region)
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      const res = await fetch(`/api/admin/performance/summary?${params}`, {
        credentials: 'include',
        headers: buildCookieFirstClientHeaders(),
      })
      const json = await readJsonSafely(res)
      if (res.ok) {
        setSummary(json?.data as PerformanceSummary)
      } else {
        console.error('실적 요약 로드 오류:', json?.error)
        setSummary(null)
      }
    } catch (error) {
      console.error('실적 요약 로드 예외:', error)
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [adminRole, year, region, from, to])

  useEffect(() => {
    loadSummary()
  }, [loadSummary])

  const resetFilters = () => {
    setYear(CURRENT_YEAR)
    if (!isRegionalAdmin) setRegion('all')
    setFrom('')
    setTo('')
  }

  const goToRecords = () => {
    const params = new URLSearchParams()
    params.set('year', String(year))
    if (region !== 'all') params.set('region', region)
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    router.push(`/admin/performance/records?${params}`)
  }

  const monthlyMax = summary ? Math.max(1, ...summary.monthly) : 1

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation adminRole={adminRole || 'super'} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">실적관리</h1>
          </div>
          <button
            onClick={goToRecords}
            className="flex items-center space-x-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <span>실적 상세 조회</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* 필터 바 */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-gray-700 mr-1">연도</span>
              {YEARS.map((y) => (
                <button
                  key={y}
                  onClick={() => setYear(y)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    year === y ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">지역</span>
                {(['all', 'south', 'north'] as RegionFilter[]).map((r) => {
                  if (isRegionalAdmin && r !== region) return null
                  const label = r === 'all' ? '전체' : r === 'south' ? '남부' : '북부'
                  return (
                    <button
                      key={r}
                      onClick={() => !isRegionalAdmin && setRegion(r)}
                      disabled={isRegionalAdmin}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        region === r ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      } ${isRegionalAdmin ? 'cursor-default' : ''}`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">기간</span>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                />
                <span className="text-gray-400">~</span>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                />
              </div>

              <button
                onClick={resetFilters}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                초기화
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner size="md" color="blue" />
          </div>
        ) : !summary ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-500">
            실적 데이터를 불러올 수 없습니다.
          </div>
        ) : (
          <>
            {/* 요약 카드 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => setExpanded((v) => !v)}
                className="bg-white rounded-xl shadow-sm p-6 text-left hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-lg bg-blue-50 flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">총 실적 횟수</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {summary.totalCount.toLocaleString()}
                        <span className="text-base font-medium text-gray-500 ml-1">회</span>
                      </p>
                    </div>
                  </div>
                  <ChevronRight
                    className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
                  />
                </div>
                {expanded && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">스포츠교실</span>
                      <span className="text-gray-900">
                        {summary.byProgram.sports_class.count}회 · {summary.byProgram.sports_class.participants.toLocaleString()}명
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">스포츠체험존</span>
                      <span className="text-gray-900">
                        {summary.byProgram.experience_zone.count}회 · {summary.byProgram.experience_zone.participants.toLocaleString()}명
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">스포츠이벤트</span>
                      <span className="text-gray-900">
                        {summary.byProgram.sports_event.count}회 · {summary.byProgram.sports_event.participants.toLocaleString()}명
                      </span>
                    </div>
                  </div>
                )}
              </button>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-lg bg-green-50 flex items-center justify-center">
                    <Users2 className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">총 참여인원</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {summary.totalParticipants.toLocaleString()}
                      <span className="text-base font-medium text-gray-500 ml-1">명</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 월별 참여인원 그래프 */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">월별 참여인원 ({year}년)</h2>
              <div className="overflow-x-auto">
                <div className="flex items-end gap-2 min-w-[560px] h-56">
                  {summary.monthly.map((value, i) => {
                    const heightPct = (value / monthlyMax) * 100
                    const isMax = value === monthlyMax && value > 0
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                        {value > 0 && (
                          <span className={`text-xs mb-1 ${isMax ? 'font-semibold text-blue-700' : 'text-gray-500'}`}>
                            {value.toLocaleString()}
                          </span>
                        )}
                        <div
                          className="w-full rounded-t bg-blue-500"
                          style={{ height: `${heightPct}%`, minHeight: value > 0 ? '4px' : '0' }}
                        />
                        <span className="text-xs text-gray-500 mt-2">{MONTH_LABELS[i]}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
