'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Edit2, Trash2, Download, Search, RotateCcw, Calendar, Users2, BarChart3, ChevronRight, ClipboardList } from 'lucide-react'
import AdminNavigation from '@/components/AdminNavigation'
import ModalOverlay from '@/components/ModalOverlay'
import Spinner from '@/components/Spinner'
import { buildCookieFirstClientHeaders, buildCookieFirstJsonRequestInit } from '@/lib/clientAuthHeaders'
import { settingsAPI } from '@/lib/supabase'
import type { PerformanceRecord, PerformanceProgram, PerformanceSummary } from '@/lib/performanceTypes'

const YEARS = [2025, 2026, 2027, 2028, 2029, 2030]
const PAGE_SIZE = 30

type RegionFilter = 'all' | 'south' | 'north'
type ProgramFilter = 'all' | PerformanceProgram

const PROGRAM_LABEL: Record<PerformanceProgram, string> = {
  sports_class: '스포츠교실',
  sports_event: '스포츠이벤트',
  experience_zone: '스포츠체험존',
}

const PROGRAM_OPTIONS: { value: ProgramFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'sports_class', label: '스포츠교실' },
  { value: 'experience_zone', label: '스포츠체험존' },
  { value: 'sports_event', label: '스포츠이벤트' },
]

async function readJsonSafely(response: Response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

function regionBadge(code: 'south' | 'north' | null) {
  if (code === 'south') return <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">남부</span>
  if (code === 'north') return <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">북부</span>
  return <span className="text-gray-400 text-xs">-</span>
}

interface ExperienceForm {
  date: string
  organization_name: string
  region: 'south' | 'north'
  grade: string
  participant_count: string
  memo: string
}

interface OverrideForm {
  grade: string
  participant_count: string
  memo: string
  excluded: boolean
}

function AdminPerformanceContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [adminRole, setAdminRole] = useState<string | null>(null)
  const isRegionalAdmin = adminRole === 'south' || adminRole === 'north'

  const [year, setYear] = useState(() => Number(searchParams.get('year')) || 2026)
  const [region, setRegion] = useState<RegionFilter>(() => {
    const r = searchParams.get('region')
    return r === 'south' || r === 'north' ? r : 'all'
  })
  const [from, setFrom] = useState(() => searchParams.get('from') || '')
  const [to, setTo] = useState(() => searchParams.get('to') || '')
  const [program, setProgram] = useState<ProgramFilter>('all')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)

  const [summary, setSummary] = useState<PerformanceSummary | null>(null)
  const [expanded, setExpanded] = useState(false)

  const [records, setRecords] = useState<PerformanceRecord[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  // 실적 추가 모달
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState<ExperienceForm>({
    date: '', organization_name: '', region: 'south', grade: '', participant_count: '', memo: '',
  })
  const [saving, setSaving] = useState(false)

  // 행 수정 모달
  const [editing, setEditing] = useState<PerformanceRecord | null>(null)
  const [expForm, setExpForm] = useState<ExperienceForm>({
    date: '', organization_name: '', region: 'south', grade: '', participant_count: '', memo: '',
  })
  const [ovForm, setOvForm] = useState<OverrideForm>({
    grade: '', participant_count: '', memo: '', excluded: false,
  })

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
      setAddForm((f) => ({ ...f, region: adminData.role }))
    }
  }, [router])

  // 요약: 연도/지역/기간만 반영(프로그램 필터와 무관하게 전체 프로그램 집계)
  const loadSummary = useCallback(async () => {
    if (!adminRole) return
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
      setSummary(res.ok ? (json?.data as PerformanceSummary) : null)
    } catch (error) {
      console.error('실적 요약 로드 예외:', error)
      setSummary(null)
    }
  }, [adminRole, year, region, from, to])

  // 목록: 프로그램/검색/페이지까지 반영
  const loadRecords = useCallback(async () => {
    if (!adminRole) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('year', String(year))
      if (region !== 'all') params.set('region', region)
      if (program !== 'all') params.set('program', program)
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      if (q) params.set('q', q)
      params.set('page', String(page))
      const res = await fetch(`/api/admin/performance/records?${params}`, {
        credentials: 'include',
        headers: buildCookieFirstClientHeaders(),
      })
      const json = await readJsonSafely(res)
      if (res.ok) {
        setRecords(json?.data?.records || [])
        setTotal(json?.data?.total || 0)
      } else {
        console.error('실적 목록 로드 오류:', json?.error)
        setRecords([])
        setTotal(0)
      }
    } catch (error) {
      console.error('실적 목록 로드 예외:', error)
      setRecords([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [adminRole, year, region, program, from, to, q, page])

  useEffect(() => { loadSummary() }, [loadSummary])
  useEffect(() => { loadRecords() }, [loadRecords])

  // 필터 변경 시 첫 페이지로
  useEffect(() => {
    setPage(1)
  }, [year, region, program, from, to, q])

  const reloadAll = async () => {
    await Promise.all([loadSummary(), loadRecords()])
  }

  const resetFilters = () => {
    setYear(2026)
    if (!isRegionalAdmin) setRegion('all')
    setProgram('all')
    setFrom('')
    setTo('')
    setQ('')
  }

  const handleAddExperience = async () => {
    if (!addForm.date || !addForm.organization_name.trim()) {
      alert('날짜와 단체명은 필수입니다.')
      return
    }
    setSaving(true)
    try {
      const regionId = await settingsAPI.getRegionId(addForm.region)
      const body = {
        date: addForm.date,
        organization_name: addForm.organization_name.trim(),
        region_id: regionId,
        grade: addForm.grade.trim() || null,
        participant_count: Number(addForm.participant_count) || 0,
        memo: addForm.memo.trim() || null,
      }
      const res = await fetch('/api/admin/performance/experience', buildCookieFirstJsonRequestInit(body, 'POST'))
      const json = await readJsonSafely(res)
      if (!res.ok) {
        alert(json?.error?.message || '실적 저장에 실패했습니다.')
        return
      }
      setShowAddModal(false)
      setAddForm({ date: '', organization_name: '', region: isRegionalAdmin ? (adminRole as 'south' | 'north') : 'south', grade: '', participant_count: '', memo: '' })
      await reloadAll()
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (rec: PerformanceRecord) => {
    setEditing(rec)
    if (rec.program_type === 'experience_zone') {
      setExpForm({
        date: rec.date,
        organization_name: rec.organization_name,
        region: rec.region_code === 'north' ? 'north' : 'south',
        grade: rec.grade || '',
        participant_count: String(rec.participant_count),
        memo: rec.memo || '',
      })
    } else {
      setOvForm({
        grade: rec.grade || '',
        participant_count: String(rec.participant_count),
        memo: rec.memo || '',
        excluded: false,
      })
    }
  }

  const handleSaveExperienceEdit = async () => {
    if (!editing) return
    setSaving(true)
    try {
      const regionId = await settingsAPI.getRegionId(expForm.region)
      const body = {
        date: expForm.date,
        organization_name: expForm.organization_name.trim(),
        region_id: regionId,
        grade: expForm.grade.trim() || null,
        participant_count: Number(expForm.participant_count) || 0,
        memo: expForm.memo.trim() || null,
      }
      const res = await fetch(`/api/admin/performance/experience/${editing.source_id}`, buildCookieFirstJsonRequestInit(body, 'PATCH'))
      const json = await readJsonSafely(res)
      if (!res.ok) {
        alert(json?.error?.message || '실적 수정에 실패했습니다.')
        return
      }
      setEditing(null)
      await reloadAll()
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteExperience = async () => {
    if (!editing) return
    if (!confirm('이 실적을 삭제하시겠습니까?')) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/performance/experience/${editing.source_id}`, buildCookieFirstJsonRequestInit({}, 'DELETE'))
      const json = await readJsonSafely(res)
      if (!res.ok) {
        alert(json?.error?.message || '실적 삭제에 실패했습니다.')
        return
      }
      setEditing(null)
      await reloadAll()
    } finally {
      setSaving(false)
    }
  }

  const handleSaveOverride = async () => {
    if (!editing) return
    setSaving(true)
    try {
      const body = {
        source_type: editing.source_type,
        source_id: editing.source_id,
        grade: ovForm.grade.trim() || null,
        participant_count: ovForm.participant_count !== '' ? Number(ovForm.participant_count) : null,
        memo: ovForm.memo.trim() || null,
        excluded: ovForm.excluded,
      }
      const res = await fetch('/api/admin/performance/override', buildCookieFirstJsonRequestInit(body, 'PATCH'))
      const json = await readJsonSafely(res)
      if (!res.ok) {
        alert(json?.error?.message || '실적 수정에 실패했습니다.')
        return
      }
      setEditing(null)
      await reloadAll()
    } finally {
      setSaving(false)
    }
  }

  const buildFilterParams = () => {
    const params = new URLSearchParams()
    params.set('year', String(year))
    if (region !== 'all') params.set('region', region)
    if (program !== 'all') params.set('program', program)
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    if (q) params.set('q', q)
    return params
  }

  const handleExport = () => {
    window.location.href = `/api/admin/performance/export?${buildFilterParams()}`
  }

  const handleSurveyExport = () => {
    window.location.href = `/api/admin/performance/survey-export?${buildFilterParams()}`
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation adminRole={adminRole || 'super'} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">실적관리</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-1 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              <Download className="w-4 h-4" />
              Excel 다운로드
            </button>
            <button
              onClick={handleSurveyExport}
              title="연락처가 있는 참여 단체(스포츠교실·이벤트)를 중복 없이 연락처·단체명만 내려받습니다."
              className="flex items-center gap-1 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              <ClipboardList className="w-4 h-4" />
              만족도조사용 다운로드
            </button>
            <button
              onClick={() => {
                setAddForm({ date: '', organization_name: '', region: isRegionalAdmin ? (adminRole as 'south' | 'north') : 'south', grade: '', participant_count: '', memo: '' })
                setShowAddModal(true)
              }}
              className="flex items-center gap-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              실적 추가
            </button>
          </div>
        </div>

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
                    {(summary?.totalCount ?? 0).toLocaleString()}
                    <span className="text-base font-medium text-gray-500 ml-1">회</span>
                  </p>
                </div>
              </div>
              <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
            </div>
            {expanded && summary && (
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
                  {(summary?.totalParticipants ?? 0).toLocaleString()}
                  <span className="text-base font-medium text-gray-500 ml-1">명</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 필터 바 */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-6">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">연도</label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
              >
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">단체명 검색</label>
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="단체명"
                  className="border border-gray-300 rounded-lg pl-8 pr-2 py-1.5 text-sm w-40"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">지역</label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value as RegionFilter)}
                disabled={isRegionalAdmin}
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm disabled:bg-gray-100"
              >
                <option value="all">전체</option>
                <option value="south">남부</option>
                <option value="north">북부</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">프로그램</label>
              <select
                value={program}
                onChange={(e) => setProgram(e.target.value as ProgramFilter)}
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
              >
                {PROGRAM_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">기간</label>
              <div className="flex items-center gap-1">
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                <span className="text-gray-400">~</span>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
              </div>
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

        {/* 표 */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-left">
                  <th className="px-4 py-3 font-medium whitespace-nowrap">날짜</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">단체명</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">시/군</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">지역</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">프로그램</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">학년</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap text-right">총인원</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">메모</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap text-center">작업</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="px-4 py-16 text-center"><Spinner size="md" color="blue" className="mx-auto" /></td></tr>
                ) : records.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-16 text-center text-gray-500">조회된 실적이 없습니다.</td></tr>
                ) : (
                  records.map((r) => (
                    <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">{r.date}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{r.organization_name}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{r.city_name || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{regionBadge(r.region_code)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{PROGRAM_LABEL[r.program_type]}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{r.grade || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">{r.participant_count.toLocaleString()}</td>
                      <td className="px-4 py-3 max-w-[200px] truncate" title={r.memo || ''}>{r.memo || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <button onClick={() => openEdit(r)} className="text-gray-400 hover:text-blue-600" title="수정">
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 페이지네이션 */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">
              총 {total.toLocaleString()}건 중 {records.length.toLocaleString()}건 표시
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 text-gray-700 disabled:opacity-50 hover:bg-gray-200"
              >
                이전
              </button>
              <span className="text-sm text-gray-600">{page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 text-gray-700 disabled:opacity-50 hover:bg-gray-200"
              >
                다음
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* 실적 추가 모달 */}
      {showAddModal && (
        <ModalOverlay onClose={() => setShowAddModal(false)} closeOnBackdrop={false}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">실적 추가</h2>
            <ExperienceFields form={addForm} setForm={setAddForm} isRegionalAdmin={isRegionalAdmin} />
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm hover:bg-gray-200">취소</button>
              <button onClick={handleAddExperience} disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                {saving && <Spinner size="sm" color="white" />}
                저장
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* 행 수정 모달 */}
      {editing && (
        <ModalOverlay onClose={() => setEditing(null)} closeOnBackdrop={false}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">{PROGRAM_LABEL[editing.program_type]} 실적 수정</h2>
            {editing.program_type === 'experience_zone' ? (
              <>
                <p className="text-xs text-gray-500 mb-4">체험존 실적은 모든 항목을 수정하거나 삭제할 수 있습니다.</p>
                <ExperienceFields form={expForm} setForm={setExpForm} isRegionalAdmin={isRegionalAdmin} />
                <div className="flex justify-between gap-2 mt-6">
                  <button onClick={handleDeleteExperience} disabled={saving} className="px-4 py-2 rounded-lg bg-red-50 text-red-600 text-sm hover:bg-red-100 disabled:opacity-50 flex items-center gap-1">
                    <Trash2 className="w-4 h-4" />
                    삭제
                  </button>
                  <div className="flex gap-2">
                    <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm hover:bg-gray-200">취소</button>
                    <button onClick={handleSaveExperienceEdit} disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                      {saving && <Spinner size="sm" color="white" />}
                      저장
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-gray-500 mb-4">원본 예약은 변경되지 않으며, 실적 표시 값만 수정됩니다.</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">학년</label>
                    <input type="text" value={ovForm.grade} onChange={(e) => setOvForm({ ...ovForm, grade: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">총인원</label>
                    <input type="number" min={0} value={ovForm.participant_count} onChange={(e) => setOvForm({ ...ovForm, participant_count: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">메모</label>
                    <textarea value={ovForm.memo} onChange={(e) => setOvForm({ ...ovForm, memo: e.target.value })} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={ovForm.excluded} onChange={(e) => setOvForm({ ...ovForm, excluded: e.target.checked })} />
                    실적에서 제외
                  </label>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm hover:bg-gray-200">취소</button>
                  <button onClick={handleSaveOverride} disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                    {saving && <Spinner size="sm" color="white" />}
                    저장
                  </button>
                </div>
              </>
            )}
          </div>
        </ModalOverlay>
      )}
    </div>
  )
}

function ExperienceFields({
  form,
  setForm,
  isRegionalAdmin,
}: {
  form: ExperienceForm
  setForm: React.Dispatch<React.SetStateAction<ExperienceForm>>
  isRegionalAdmin: boolean
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm text-gray-600 mb-1">날짜 <span className="text-red-500">*</span></label>
        <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm text-gray-600 mb-1">단체명 <span className="text-red-500">*</span></label>
        <input type="text" value={form.organization_name} onChange={(e) => setForm((f) => ({ ...f, organization_name: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm text-gray-600 mb-1">지역 <span className="text-red-500">*</span></label>
        <select
          value={form.region}
          onChange={(e) => setForm((f) => ({ ...f, region: e.target.value as 'south' | 'north' }))}
          disabled={isRegionalAdmin}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
        >
          <option value="south">남부</option>
          <option value="north">북부</option>
        </select>
      </div>
      <div>
        <label className="block text-sm text-gray-600 mb-1">학년</label>
        <input type="text" value={form.grade} onChange={(e) => setForm((f) => ({ ...f, grade: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm text-gray-600 mb-1">총인원 <span className="text-red-500">*</span></label>
        <input type="number" min={0} value={form.participant_count} onChange={(e) => setForm((f) => ({ ...f, participant_count: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm text-gray-600 mb-1">메모</label>
        <textarea value={form.memo} onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
      </div>
    </div>
  )
}

export default function AdminPerformancePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spinner size="md" color="blue" />
      </div>
    }>
      <AdminPerformanceContent />
    </Suspense>
  )
}
