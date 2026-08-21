'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  AlertTriangle,
  Key,
  Download,
  RefreshCw,
  X,
  Loader2
} from 'lucide-react'
import { memberAPI } from '@/lib/supabase'
import AdminNavigation from '@/components/AdminNavigation'
import ModalOverlay from '@/components/ModalOverlay'
import { PENALTY_REASONS, type PenaltyStatus } from '@/lib/penalty'
import type { UserPenalty } from '@/types/database'
import ExcelJS from 'exceljs'
import * as XLSX from 'xlsx'
import {
  filterMembersForDisplay,
  getMemberSummaryCounts,
} from '@/lib/memberAdminHelpers'
import { buildCookieFirstJsonRequestInit } from '@/lib/clientAuthHeaders'
import { formatDateTimeKST as formatDate } from '@/lib/formatDate'
import { modalOverlayClass } from '@/components/ModalOverlay'

interface AutoTierChange {
  memberId: string
  organizationName: string
  cityName: string
  organizationType: 'school' | 'welfare'
  matchedSchoolName: string | null
  currentTier: 'Priority' | 'Standard'
  newTier: 'Priority' | 'Standard'
  currentStudentCount: number | null
  newStudentCount: number | null
  currentClassCount: number | null
  newClassCount: number | null
}

interface AutoTierSummary {
  mode: 'preview' | 'apply'
  totalChecked: number
  changes: AutoTierChange[]
  unchanged: number
  skipped: number
  matchFailed: { organizationName: string; reason: string }[]
  failedCities: string[]
}

interface Member {
  id: string
  organization_name: string
  manager_name: string
  phone: string
  email: string
  region?: string
  city?: string
  status: 'pending' | 'approved' | 'rejected' | 'suspended' | null
  created_at: string | null
  tier: 'Priority' | 'Standard' | null
  student_count: number | null
  class_count: number | null
  last_login_at?: string | null
  cities: {
    name: string
    regions: {
      name: string
    } | null
  }
}

// 페이지 번호 버튼 목록 생성 (7페이지 이하는 전부, 초과 시 앞뒤 생략기호로 축약)
function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = new Set<number>([1, 2, total - 1, total, current - 1, current, current + 1])
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
  const result: (number | '...')[] = []
  let prev = 0
  for (const p of sorted) {
    if (prev && p - prev > 1) result.push('...')
    result.push(p)
    prev = p
  }
  return result
}

export default function MembersPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [adminInfo, setAdminInfo] = useState<any>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved'>('all')
  const [regionFilter, setRegionFilter] = useState<'all' | '경기남부' | '경기북부'>('all')
  const [processing, setProcessing] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 30
  // 패널티(경고/퇴장) 상태
  const [penaltySummaries, setPenaltySummaries] = useState<Record<string, PenaltyStatus>>({})
  const [penaltyTarget, setPenaltyTarget] = useState<{ member: Member; type: 'warning' | 'ejection' } | null>(null)
  const [penaltyReason, setPenaltyReason] = useState<string>(PENALTY_REASONS[0])
  const [penaltyHistoryTarget, setPenaltyHistoryTarget] = useState<Member | null>(null)
  const [penaltyHistory, setPenaltyHistory] = useState<UserPenalty[]>([])
  const [isPenaltyProcessing, setIsPenaltyProcessing] = useState(false)
  // 경고 누적 없이 퇴장 버튼을 눌렀을 때 안내 모달 대상
  const [ejectionBlockedTarget, setEjectionBlockedTarget] = useState<Member | null>(null)
  const [autoTierRunning, setAutoTierRunning] = useState(false)
  const [autoTierApplying, setAutoTierApplying] = useState(false)
  const [autoTierResult, setAutoTierResult] = useState<AutoTierSummary | null>(null)
  // 미리보기에서 체크된 회원 ID (기본: 전체 선택)
  const [autoTierSelected, setAutoTierSelected] = useState<Set<string>>(new Set())
  const summaryCounts = getMemberSummaryCounts(members, { searchTerm, regionFilter })

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    filterMembers()
  }, [members, searchTerm, statusFilter, regionFilter])

  // 검색/필터가 바뀌면 첫 페이지로 되돌린다
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, regionFilter])

  const checkAuth = () => {
    const adminAuth = localStorage.getItem('adminInfo')
    if (!adminAuth) {
      router.push('/auth/login')
      return
    }
    
    const adminData = JSON.parse(adminAuth)
    setAdminInfo(adminData)
    loadMembers(adminData)
    loadPenaltySummaries()
  }

  const loadPenaltySummaries = async () => {
    try {
      const response = await fetch('/api/admin/penalties', { credentials: 'include' })
      const result = await response.json()
      if (!response.ok) {
        console.error('패널티 요약 로드 오류:', result.error)
        return
      }
      setPenaltySummaries(result.data || {})
    } catch (error) {
      console.error('패널티 요약 로드 예외:', error)
    }
  }

  const openPenaltyModal = (member: Member, type: 'warning' | 'ejection') => {
    // 경고 누적 없이 바로 퇴장은 허용하지 않는다
    if (type === 'ejection' && (penaltySummaries[member.id]?.warningCount ?? 0) === 0) {
      setEjectionBlockedTarget(member)
      return
    }

    setPenaltyReason(PENALTY_REASONS[0])
    setPenaltyTarget({ member, type })
  }

  const handleIssuePenalty = async () => {
    if (!penaltyTarget) return
    const { member, type } = penaltyTarget
    const status = penaltySummaries[member.id]
    const willAutoEject = type === 'warning' &&
      (status?.warningCount ?? 0) + 1 >= (status?.warningThreshold ?? 2)

    const confirmMessage = type === 'warning'
      ? `${member.organization_name}에 경고(${penaltyReason})를 부여하시겠습니까?${
          willAutoEject ? '\n\n⚠️ 이 경고로 누적 기준에 도달하여 자동으로 퇴장 처리되고 퇴장 알림톡이 발송됩니다.' : '\n\n경고 알림톡이 발송됩니다.'
        }`
      : `${member.organization_name}을(를) 퇴장(${penaltyReason}) 조치하시겠습니까?\n\n이번 달 신청이 제한되며 퇴장 알림톡이 발송됩니다.`

    if (!confirm(confirmMessage)) return

    setIsPenaltyProcessing(true)
    try {
      const response = await fetch('/api/admin/penalties', buildCookieFirstJsonRequestInit({
        userId: member.id,
        type,
        reason: penaltyReason,
      }))
      const result = await response.json()

      if (!response.ok) {
        alert(result.error || '패널티 부여에 실패했습니다.')
        return
      }

      const ejected = result.data?.ejected === true
      const notificationError = result.data?.notificationError
      let message = ejected
        ? `${member.organization_name}이(가) 퇴장 처리되었습니다. 이번 달 신청이 제한됩니다.`
        : `${member.organization_name}에 경고가 부여되었습니다.`
      if (notificationError) {
        message += `\n\n(알림톡: ${notificationError})`
      }
      alert(message)

      setPenaltyTarget(null)
      await loadPenaltySummaries()
    } catch (error) {
      console.error('패널티 부여 예외:', error)
      alert('패널티 부여 중 오류가 발생했습니다.')
    } finally {
      setIsPenaltyProcessing(false)
    }
  }

  const openPenaltyHistory = async (member: Member) => {
    setPenaltyHistoryTarget(member)
    setPenaltyHistory([])
    try {
      const response = await fetch(`/api/admin/penalties?userId=${member.id}`, { credentials: 'include' })
      const result = await response.json()
      if (!response.ok) {
        alert(result.error || '패널티 내역을 불러오지 못했습니다.')
        return
      }
      setPenaltyHistory(result.data || [])
    } catch (error) {
      console.error('패널티 내역 로드 예외:', error)
      alert('패널티 내역을 불러오는 중 오류가 발생했습니다.')
    }
  }

  const handleCancelPenalty = async (penalty: UserPenalty) => {
    const typeLabel = penalty.type === 'warning' ? '경고' : '퇴장'
    if (!confirm(`이 ${typeLabel} 기록을 취소(삭제)하시겠습니까?\n\n취소 알림톡은 발송되지 않습니다.`)) return

    setIsPenaltyProcessing(true)
    try {
      const response = await fetch(`/api/admin/penalties?id=${penalty.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const result = await response.json()
      if (!response.ok) {
        alert(result.error || '패널티 취소에 실패했습니다.')
        return
      }

      setPenaltyHistory(prev => prev.filter(item => item.id !== penalty.id))
      await loadPenaltySummaries()
    } catch (error) {
      console.error('패널티 취소 예외:', error)
      alert('패널티 취소 중 오류가 발생했습니다.')
    } finally {
      setIsPenaltyProcessing(false)
    }
  }

  const getPenaltyBadges = (memberId: string) => {
    const status = penaltySummaries[memberId]
    if (!status || (status.warningCount === 0 && status.ejectionCount === 0)) {
      return <span className="text-xs text-gray-400">-</span>
    }

    return (
      <div className="flex flex-wrap gap-1">
        {status.restricted && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            🟥 제한중
          </span>
        )}
        {status.probation && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            보호관찰
          </span>
        )}
        {status.warningCount > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            ⚠️ 경고 {status.warningCount}회
          </span>
        )}
      </div>
    )
  }

  const loadMembers = async (adminData: any) => {
    try {
      let result
      
      // 지역별 관리자는 해당 지역 회원만 조회
      if (adminData.role === 'super') {
        result = await memberAPI.getAllMembers()
      } else if (adminData.role === 'south' || adminData.role === 'north') {
        result = await memberAPI.getAllMembersForRegion(adminData.role)
      } else {
        console.error('알 수 없는 관리자 역할:', adminData.role)
        return
      }

      if (result.error) {
        console.error('회원 로드 오류:', result.error)
        return
      }
      setMembers(result.data || [])
    } catch (error) {
      console.error('회원 로드 예외:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterMembers = () => {
    setFilteredMembers(filterMembersForDisplay(members, {
      searchTerm,
      statusFilter,
      regionFilter,
    }))
  }

  // 학교알리미 기준 등급 자동조정 1단계(미리보기): DB 변경 없이 변경 예정 내역만 조회한다.
  const handleAutoTierPreview = async () => {
    setAutoTierRunning(true)
    try {
      const response = await fetch(
        '/api/admin/members/auto-tier',
        buildCookieFirstJsonRequestInit({ mode: 'preview' })
      )
      const json = await response.json()

      if (!response.ok) {
        alert(json?.error?.message || '등급 자동조정 미리보기에 실패했습니다.')
        return
      }

      setAutoTierResult(json.data)
      // 기본은 전체 선택 상태로 시작하고, 관리자가 제외할 회원만 체크 해제한다.
      setAutoTierSelected(new Set((json.data as AutoTierSummary).changes.map((c) => c.memberId)))
    } catch (error) {
      console.error('등급 자동조정 미리보기 오류:', error)
      alert('등급 자동조정 미리보기 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setAutoTierRunning(false)
    }
  }

  const toggleAutoTierSelect = (memberId: string) => {
    setAutoTierSelected((prev) => {
      const next = new Set(prev)
      if (next.has(memberId)) {
        next.delete(memberId)
      } else {
        next.add(memberId)
      }
      return next
    })
  }

  const toggleAutoTierSelectAll = (memberIds: string[], selectAll: boolean) => {
    setAutoTierSelected((prev) => {
      const next = new Set(prev)
      for (const id of memberIds) {
        if (selectAll) {
          next.add(id)
        } else {
          next.delete(id)
        }
      }
      return next
    })
  }

  // 2단계(적용): 미리보기에서 체크된 회원만 실제 DB에 반영한다.
  const handleAutoTierApply = async () => {
    setAutoTierApplying(true)
    try {
      const response = await fetch(
        '/api/admin/members/auto-tier',
        buildCookieFirstJsonRequestInit({ mode: 'apply', memberIds: Array.from(autoTierSelected) })
      )
      const json = await response.json()

      if (!response.ok) {
        alert(json?.error?.message || '등급 자동조정 적용에 실패했습니다.')
        return
      }

      setAutoTierResult(json.data)
      if (adminInfo) {
        await loadMembers(adminInfo)
      }
    } catch (error) {
      console.error('등급 자동조정 적용 오류:', error)
      alert('등급 자동조정 적용 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setAutoTierApplying(false)
    }
  }

  const handleStatusChange = async (memberId: string, status: 'approved' | 'rejected') => {
    setProcessing(memberId)
    try {
      if (status === 'rejected') {
        // 거절 시 회원 삭제
        if (!confirm('회원 가입을 거절하면 데이터가 영구 삭제됩니다. 계속하시겠습니까?')) {
          setProcessing(null)
          return
        }

        // 알림톡 발송 (삭제하면 서버에서 연락처를 조회할 수 없으므로 삭제 전에 반드시 완료해야 함)
        const member = members.find(m => m.id === memberId)
        if (member) {
          try {
            const notifyRes = await fetch('/api/notifications/aligo', buildCookieFirstJsonRequestInit({
              type: 'member_rejection',
              memberId,
              organizationName: member.organization_name,
              tplCode: process.env.NEXT_PUBLIC_ALIGO_MEMBER_REJECTION_TPL_CODE || ''
            }))
            const notifyResult = await notifyRes.json()
            if (!notifyResult.success) {
              console.error('알림톡 발송 실패:', notifyResult.error)
            }
          } catch (err) {
            console.error('알림톡 API 호출 오류:', err)
          }
        }

        const { error } = await memberAPI.deleteMember(memberId)
        if (error) {
          console.error('회원 삭제 오류:', error)
          alert('회원 삭제에 실패했습니다.')
          return
        }

        // 로컬 상태에서 제거
        setMembers(prev => prev.filter(member => member.id !== memberId))
        alert('회원 가입이 거절되었으며 반려 알림톡이 발송되었습니다.')
      } else {
        // 승인 시 상태만 업데이트
        const { error } = await memberAPI.updateMemberStatus(memberId, status)
        if (error) {
          console.error('회원 상태 업데이트 오류:', error)
          alert('상태 업데이트에 실패했습니다.')
          return
        }

        // 알림톡 발송 (비동기, 논블로킹)
        const member = members.find(m => m.id === memberId)
        if (member) {
          // 알림톡 발송 (실패해도 승인 프로세스는 계속 진행)
          fetch('/api/notifications/aligo', buildCookieFirstJsonRequestInit({
              type: 'member_approval',
              memberId,
              organizationName: member.organization_name,
              tplCode: process.env.NEXT_PUBLIC_ALIGO_MEMBER_APPROVAL_TPL_CODE || ''
            }))
            .then(res => res.json())
            .then(result => {
              if (!result.success) {
                console.error('알림톡 발송 실패:', result.error)
              }
            })
            .catch(err => {
              console.error('알림톡 API 호출 오류:', err)
            })
        }

        // 로컬 상태 업데이트
        setMembers(prev => prev.map(member =>
          member.id === memberId ? { ...member, status } : member
        ))

        alert('회원이 승인되었으며 알림톡이 발송되었습니다.')
      }
    } catch (error) {
      console.error('회원 상태 업데이트 예외:', error)
      alert('처리 중 오류가 발생했습니다.')
    } finally {
      setProcessing(null)
    }
  }

  const handlePasswordReset = async (memberId: string, organizationName: string) => {
    if (!confirm(`${organizationName}의 비밀번호를 "0000"으로 초기화하시겠습니까?`)) {
      return
    }

    setProcessing(memberId)
    try {
      const { error } = await memberAPI.resetPassword(memberId, '0000')
      if (error) {
        console.error('비밀번호 초기화 오류:', error)
        alert('비밀번호 초기화에 실패했습니다.')
        return
      }
      
      alert(`${organizationName}의 비밀번호가 "0000"으로 초기화되었습니다.`)
    } catch (error) {
      console.error('비밀번호 초기화 예외:', error)
      alert('비밀번호 초기화 중 오류가 발생했습니다.')
    } finally {
      setProcessing(null)
    }
  }

  const handleTierChange = async (memberId: string, newTier: 'Priority' | 'Standard', organizationName: string) => {
    if (!confirm(`${organizationName}의 티어를 ${newTier}로 변경하시겠습니까?`)) {
      return
    }

    setProcessing(memberId)
    try {
      const { error } = await memberAPI.updateMemberTier(memberId, newTier)
      if (error) {
        console.error('회원 티어 업데이트 오류:', error)
        alert('티어 변경에 실패했습니다.')
        return
      }

      // 로컬 상태 업데이트
      setMembers(prev => prev.map(member =>
        member.id === memberId ? { ...member, tier: newTier } : member
      ))

      alert(`${organizationName}의 티어가 ${newTier}로 변경되었습니다.`)
    } catch (error) {
      console.error('회원 티어 업데이트 예외:', error)
      alert('티어 변경 중 오류가 발생했습니다.')
    } finally {
      setProcessing(null)
    }
  }

  const handleDeleteMember = async (memberId: string, organizationName: string) => {
    if (!confirm(`${organizationName} 회원을 삭제하시겠습니까?\n\n관련된 모든 데이터가 영구 삭제됩니다.`)) {
      return
    }

    setProcessing(memberId)
    try {
      const { error } = await memberAPI.deleteMember(memberId)
      if (error) {
        console.error('회원 삭제 오류:', error)
        alert('회원 삭제에 실패했습니다.')
        return
      }

      // 로컬 상태에서 제거
      setMembers(prev => prev.filter(member => member.id !== memberId))
      alert(`${organizationName} 회원이 삭제되었습니다.`)
    } catch (error) {
      console.error('회원 삭제 예외:', error)
      alert('회원 삭제 중 오류가 발생했습니다.')
    } finally {
      setProcessing(null)
    }
  }

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            대기중
          </span>
        )
      case 'approved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            승인됨
          </span>
        )
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            거절됨
          </span>
        )
      default:
        return null
    }
  }

  const getTierBadge = (tier: 'Priority' | 'Standard' | null) => {
    const normalizedTier = tier ?? 'Standard'
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        normalizedTier === 'Priority'
          ? 'bg-yellow-100 text-yellow-800'
          : 'bg-gray-100 text-gray-800'
      }`}>
        {normalizedTier === 'Priority' ? '🟡' : '⚪'} {normalizedTier}
      </span>
    )
  }

  // 로그인 이력 뱃지 — 마우스를 올리면 실제 시각 표시
  const renderLoginBadge = (member: Member) => (
    member.last_login_at ? (
      <span
        title={`최근 로그인: ${formatDate(member.last_login_at)}`}
        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 cursor-help"
      >
        있음
      </span>
    ) : (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
        없음
      </span>
    )
  )

  const renderTierControl = (member: Member) => (
    member.status === 'approved' ? (
      <select
        value={member.tier ?? 'Standard'}
        onChange={(e) => handleTierChange(member.id, e.target.value as 'Priority' | 'Standard', member.organization_name)}
        disabled={processing === member.id}
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-all hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed ${
          member.tier === 'Priority'
            ? 'bg-yellow-100 text-yellow-800'
            : 'bg-gray-100 text-gray-800'
        }`}
      >
        <option value="Priority">🟡 Priority</option>
        <option value="Standard">⚪ Standard</option>
      </select>
    ) : (
      getTierBadge(member.tier)
    )
  )

  const renderActionButtons = (member: Member) => (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium">
      {member.status === 'pending' && (
        <>
          <button
            onClick={() => handleStatusChange(member.id, 'approved')}
            disabled={processing === member.id}
            className="text-green-600 hover:text-green-900 disabled:opacity-50"
          >
            승인
          </button>
          <button
            onClick={() => handleStatusChange(member.id, 'rejected')}
            disabled={processing === member.id}
            className="text-red-600 hover:text-red-900 disabled:opacity-50"
          >
            거절
          </button>
        </>
      )}
      {member.status === 'approved' && (
        <>
          <button
            onClick={() => openPenaltyModal(member, 'warning')}
            disabled={processing === member.id || penaltySummaries[member.id]?.restricted}
            className="text-yellow-600 hover:text-yellow-800 disabled:opacity-50"
            title="경고 부여"
          >
            경고
          </button>
          <button
            onClick={() => openPenaltyModal(member, 'ejection')}
            disabled={processing === member.id || penaltySummaries[member.id]?.restricted}
            className="text-red-600 hover:text-red-900 disabled:opacity-50"
            title="퇴장 조치"
          >
            퇴장
          </button>
        </>
      )}
      <button
        onClick={() => handlePasswordReset(member.id, member.organization_name)}
        disabled={processing === member.id}
        className="flex items-center gap-0.5 text-blue-600 hover:text-blue-900 disabled:opacity-50"
        title="비밀번호를 0000으로 초기화"
      >
        <Key className="w-3 h-3" />
        초기화
      </button>
      <button
        onClick={() => handleDeleteMember(member.id, member.organization_name)}
        disabled={processing === member.id}
        className="flex items-center gap-0.5 text-red-600 hover:text-red-900 disabled:opacity-50"
        title="회원 삭제"
      >
        <XCircle className="w-3 h-3" />
        삭제
      </button>
    </div>
  )

  const handleDownloadSmsExcel = async () => {
    try {
      // 문자전송용 파일은 Excel 97-2003(.xls/BIFF8) 형식으로 생성한다.
      // ExcelJS는 .xls 쓰기를 지원하지 않으므로 SheetJS(xlsx)를 사용한다.
      const rows = [
        ['전화번호', '단체명'],
        ...filteredMembers.map((member) => [member.phone, member.organization_name]),
      ]

      const worksheet = XLSX.utils.aoa_to_sheet(rows)
      worksheet['!cols'] = [
        { wch: 15 }, // 전화번호
        { wch: 30 }, // 단체명
      ]

      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, '문자전송용')

      // bookType: 'biff8' → 실제 Excel 97-2003 (.xls) 바이너리
      const buffer = XLSX.write(workbook, { bookType: 'biff8', type: 'array' })
      const blob = new Blob([buffer], { type: 'application/vnd.ms-excel' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url

      const filterText = regionFilter !== 'all' ? `_${regionFilter}` : ''
      const statusText = statusFilter !== 'all'
        ? statusFilter === 'pending' ? '_대기중' : '_승인됨'
        : ''

      link.download = `문자전송용_회원목록${filterText}${statusText}_${new Date().toLocaleDateString('ko-KR')}.xls`
      link.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('문자전송용 Excel 다운로드 오류:', error)
      alert('Excel 다운로드 중 오류가 발생했습니다.')
    }
  }

  const handleDownloadExcel = async () => {
    try {
      // 엑셀 워크북 생성
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('회원 목록')

      // 열 너비 설정
      worksheet.columns = [
        { width: 25 }, // 단체명
        { width: 12 }, // 대표자명
        { width: 15 }, // 전화번호
        { width: 25 }, // 이메일
        { width: 12 }, // 지역
        { width: 15 }, // 시/군
        { width: 12 }, // 학생수
        { width: 12 }, // 학급수
        { width: 12 }, // 회원등급
        { width: 12 }, // 상태
        { width: 20 }, // 가입일
        { width: 20 }  // 최근 로그인
      ]

      // 제목 행
      const titleRow = worksheet.getRow(1)
      titleRow.getCell(1).value = '회원 목록'
      worksheet.mergeCells(1, 1, 1, 12)
      titleRow.getCell(1).font = { name: '맑은 고딕', size: 16, bold: true, color: { argb: 'FF1F4788' } }
      titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6EAF8' } }
      titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }
      titleRow.getCell(1).border = {
        top: { style: 'thin', color: { argb: 'FF5DADE2' } },
        left: { style: 'thin', color: { argb: 'FF5DADE2' } },
        bottom: { style: 'thin', color: { argb: 'FF5DADE2' } },
        right: { style: 'thin', color: { argb: 'FF5DADE2' } }
      }
      titleRow.height = 30

      // 빈 행
      worksheet.getRow(2).height = 5

      // 헤더 행
      const headerRow = worksheet.getRow(3)
      const headers = ['단체명', '대표자명', '전화번호', '이메일', '지역', '시/군', '학생수', '학급수', '회원등급', '상태', '가입일', '최근 로그인']
      headers.forEach((header, index) => {
        const cell = headerRow.getCell(index + 1)
        cell.value = header
        cell.font = { name: '맑은 고딕', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5DADE2' } }
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF3498DB' } },
          left: { style: 'thin', color: { argb: 'FF3498DB' } },
          bottom: { style: 'thin', color: { argb: 'FF3498DB' } },
          right: { style: 'thin', color: { argb: 'FF3498DB' } }
        }
      })
      headerRow.height = 25

      // 데이터 행
      filteredMembers.forEach((member, index) => {
        const row = worksheet.getRow(4 + index)

        const statusText = member.status === 'pending' ? '대기중'
          : member.status === 'approved' ? '승인됨'
          : '거절됨'

        const rowData = [
          member.organization_name,
          member.manager_name,
          member.phone,
          member.email,
          member.cities?.regions?.name || '',
          member.cities?.name || '',
          member.student_count || 0,
          member.class_count || 0,
          member.tier,
          statusText,
          formatDate(member.created_at),
          member.last_login_at ? formatDate(member.last_login_at) : '기록 없음'
        ]

        rowData.forEach((value, colIndex) => {
          const cell = row.getCell(colIndex + 1)
          cell.value = value
          cell.font = { name: '맑은 고딕', size: 10 }
          cell.alignment = { horizontal: 'center', vertical: 'middle' }
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFD5DBDB' } },
            left: { style: 'thin', color: { argb: 'FFD5DBDB' } },
            bottom: { style: 'thin', color: { argb: 'FFD5DBDB' } },
            right: { style: 'thin', color: { argb: 'FFD5DBDB' } }
          }

          // 상태에 따른 배경색
          if (colIndex === 7) { // 상태 열
            if (member.status === 'pending') {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF4E6' } }
            } else if (member.status === 'approved') {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } }
            } else {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4EC' } }
            }
          }
        })

        row.height = 20
      })

      // 엑셀 파일 다운로드
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url

      const filterText = regionFilter !== 'all' ? `_${regionFilter}` : ''
      const statusText = statusFilter !== 'all'
        ? statusFilter === 'pending' ? '_대기중'
        : '_승인됨'
        : ''

      link.download = `회원목록${filterText}${statusText}_${new Date().toLocaleDateString('ko-KR')}.xlsx`
      link.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Excel 다운로드 오류:', error)
      alert('Excel 다운로드 중 오류가 발생했습니다.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNavigation adminRole={adminInfo?.role} />
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  const isBusy = processing !== null || isPenaltyProcessing

  // 페이지네이션 계산 (검색/필터 적용된 목록을 30개씩 분할)
  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedMembers = filteredMembers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation adminRole={adminInfo?.role} />

      {/* 처리 중 오버레이 — 알림톡 발송 등으로 지연되는 동안 진행 상태 안내 */}
      {isBusy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="flex items-center gap-3 rounded-xl bg-white px-6 py-4 shadow-lg">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            <span className="text-sm font-medium text-gray-800">처리 중입니다...</span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">회원 관리</h1>
          <p className="text-gray-600 mt-2">
            {adminInfo?.role === 'super' && '전체 지역의 회원 가입 신청을 검토하고 승인/거절 처리를 할 수 있습니다.'}
            {adminInfo?.role === 'south' && '경기남부 지역의 회원 가입 신청을 검토하고 승인/거절 처리를 할 수 있습니다.'}
            {adminInfo?.role === 'north' && '경기북부 지역의 회원 가입 신청을 검토하고 승인/거절 처리를 할 수 있습니다.'}
          </p>
        </div>

        {/* 검색 및 필터 */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    placeholder="단체명, 대표자명, 이메일, 전화번호로 검색..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Filter className="w-5 h-5 text-gray-400" />
                {adminInfo?.role === 'super' && (
                  <select
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={regionFilter}
                    onChange={(e) => setRegionFilter(e.target.value as any)}
                  >
                    <option value="all">전체 지역</option>
                    <option value="경기남부">경기남부</option>
                    <option value="경기북부">경기북부</option>
                  </select>
                )}
                <select
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                >
                  <option value="all">전체 상태</option>
                  <option value="pending">대기중</option>
                  <option value="approved">승인됨</option>
                </select>
                <button
                  onClick={handleAutoTierPreview}
                  disabled={autoTierRunning}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-purple-300 transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${autoTierRunning ? 'animate-spin' : ''}`} />
                  {autoTierRunning ? '조회 중...' : '등급 자동조정'}
                </button>
                <button
                  onClick={handleDownloadSmsExcel}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  문자전송용 다운로드
                </button>
                <button
                  onClick={handleDownloadExcel}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Excel 다운로드
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-50 rounded-full">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">대기중</p>
                <p className="text-2xl font-bold text-gray-900">
                  {summaryCounts.pending}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 bg-green-50 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">승인됨</p>
                <p className="text-2xl font-bold text-gray-900">
                  {summaryCounts.approved}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 bg-blue-50 rounded-full">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">전체</p>
                <p className="text-2xl font-bold text-gray-900">{summaryCounts.total}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 회원 목록 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              회원 목록 ({filteredMembers.length}명)
            </h2>
          </div>
          
          {filteredMembers.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">조건에 맞는 회원이 없습니다.</p>
            </div>
          ) : (
            <>
              {/* 데스크톱: 압축 테이블 (가로 스크롤 없이 표시) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">
                        단체/대표자
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">
                        연락처
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">
                        지역
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 tracking-wider">
                        학생/학급
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">
                        상태
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">
                        티어
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">
                        패널티
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">
                        로그인
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">
                        액션
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedMembers.map((member) => (
                      <tr key={member.id} className="hover:bg-gray-50">
                        <td className="px-3 py-3">
                          <div
                            className="text-sm font-medium text-gray-900 break-words max-w-[240px]"
                            title={member.organization_name}
                          >
                            {member.organization_name}
                          </div>
                          <div className="text-xs text-gray-500 truncate max-w-[240px]">
                            {member.manager_name}
                          </div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{member.phone}</div>
                          <div className="text-xs text-gray-500 truncate max-w-[120px]" title={member.email}>
                            {member.email}
                          </div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {member.cities?.regions?.name || member.region}
                          </div>
                          <div className="text-xs text-gray-500">
                            {member.cities?.name || member.city}
                          </div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900 text-center">
                          {member.student_count || 0} / {member.class_count || 0}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          {getStatusBadge(member.status)}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          {renderTierControl(member)}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <button
                            onClick={() => openPenaltyHistory(member)}
                            className="text-left hover:opacity-75 transition-opacity"
                            title="패널티 내역 보기"
                          >
                            {getPenaltyBadges(member.id)}
                          </button>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          {renderLoginBadge(member)}
                        </td>
                        <td className="px-3 py-3">
                          {renderActionButtons(member)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 모바일: 카드 목록 */}
              <div className="md:hidden divide-y divide-gray-200">
                {paginatedMembers.map((member) => (
                  <div key={member.id} className="p-4 space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">
                          {member.organization_name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {member.manager_name} · {member.cities?.regions?.name || member.region} {member.cities?.name || member.city}
                        </div>
                      </div>
                      <div className="shrink-0">{getStatusBadge(member.status)}</div>
                    </div>
                    <div className="text-xs text-gray-600">
                      {member.phone} · 학생 {member.student_count || 0} / 학급 {member.class_count || 0}
                    </div>
                    <div className="text-xs text-gray-500 truncate">{member.email}</div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {renderTierControl(member)}
                      <button
                        onClick={() => openPenaltyHistory(member)}
                        className="text-left hover:opacity-75 transition-opacity"
                        title="패널티 내역 보기"
                      >
                        {getPenaltyBadges(member.id)}
                      </button>
                      {renderLoginBadge(member)}
                      {member.last_login_at && (
                        <span className="text-xs text-gray-400">{formatDate(member.last_login_at)}</span>
                      )}
                    </div>
                    <div className="pt-1">
                      {renderActionButtons(member)}
                    </div>
                  </div>
                ))}
              </div>

              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-200 px-4 py-3 sm:px-6">
                  <div className="text-xs text-gray-500">
                    총 {filteredMembers.length}명 중 {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredMembers.length)} 표시
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(safePage - 1)}
                      disabled={safePage <= 1}
                      className="px-2.5 py-1.5 text-sm rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      이전
                    </button>
                    {getPageNumbers(safePage, totalPages).map((p, idx) =>
                      p === '...' ? (
                        <span key={`ellipsis-${idx}`} className="px-2 text-sm text-gray-400">…</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setCurrentPage(p)}
                          className={`min-w-[2rem] px-2.5 py-1.5 text-sm rounded-md border ${
                            p === safePage
                              ? 'border-blue-600 bg-blue-600 text-white'
                              : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )}
                    <button
                      onClick={() => setCurrentPage(safePage + 1)}
                      disabled={safePage >= totalPages}
                      className="px-2.5 py-1.5 text-sm rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      다음
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 경고 누적 없이 퇴장 시도 시 안내 모달 */}
      {ejectionBlockedTarget && (
        <ModalOverlay onClose={() => setEjectionBlockedTarget(null)}>
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-yellow-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-yellow-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">퇴장 조치 불가</h3>
              <p className="text-sm text-gray-700 mb-2 break-keep">
                <span className="font-semibold">{ejectionBlockedTarget.organization_name}</span>은(는) 현재 누적된 경고가 없습니다.
              </p>
              <p className="text-sm text-gray-600 mb-6 break-keep">
                경고를 먼저 부여한 후 퇴장 조치가 가능합니다.
                {penaltySummaries[ejectionBlockedTarget.id]?.probation
                  ? ' (보호관찰 회원은 경고 1회 부여 시 자동으로 퇴장 처리됩니다)'
                  : ' (경고 2회 누적 시 자동으로 퇴장 처리됩니다)'}
              </p>
              <button
                onClick={() => setEjectionBlockedTarget(null)}
                className="w-full px-4 py-2.5 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-900 transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* 패널티 사유 선택 모달 */}
      {penaltyTarget && (
        <ModalOverlay onClose={() => setPenaltyTarget(null)} closeOnBackdrop={false}>
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                {penaltyTarget.type === 'warning' ? '⚠️ 경고 부여' : '🟥 퇴장 조치'}
              </h3>
              <p className="text-sm text-gray-600 mb-4">{penaltyTarget.member.organization_name}</p>

              <div className="mb-4">
                <div className="text-sm font-medium text-gray-700 mb-2">사유 선택</div>
                <div className="space-y-2">
                  {PENALTY_REASONS.map((reason) => (
                    <label key={reason} className="flex items-center gap-2 p-2.5 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
                      <input
                        type="radio"
                        name="penaltyReason"
                        value={reason}
                        checked={penaltyReason === reason}
                        onChange={() => setPenaltyReason(reason)}
                        className="text-blue-600"
                      />
                      <span className="text-sm text-gray-800">{reason}</span>
                    </label>
                  ))}
                </div>
              </div>

              {penaltyTarget.type === 'warning' &&
                (penaltySummaries[penaltyTarget.member.id]?.warningCount ?? 0) + 1 >=
                  (penaltySummaries[penaltyTarget.member.id]?.warningThreshold ?? 2) && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 break-keep">
                  {penaltySummaries[penaltyTarget.member.id]?.probation
                    ? '보호관찰 중인 회원입니다. 이 경고 부여 시 즉시 자동 퇴장 처리됩니다.'
                    : '이 경고로 경고 2회가 누적되어 자동 퇴장 처리됩니다.'}
                </div>
              )}

              {penaltyTarget.type === 'ejection' && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 break-keep">
                  퇴장 시 이번 달 신청이 제한되며, 다음달 1일부터 신청 가능합니다. 기존 예약은 예약 관리에서 별도로 취소해주세요.
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setPenaltyTarget(null)}
                  disabled={isPenaltyProcessing}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50"
                >
                  취소
                </button>
                <button
                  onClick={handleIssuePenalty}
                  disabled={isPenaltyProcessing}
                  className={`flex-1 px-4 py-2.5 text-white rounded-lg font-medium disabled:opacity-50 ${
                    penaltyTarget.type === 'warning'
                      ? 'bg-yellow-500 hover:bg-yellow-600'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {isPenaltyProcessing ? '처리 중...' : penaltyTarget.type === 'warning' ? '경고하기' : '퇴장하기'}
                </button>
              </div>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* 패널티 내역 모달 */}
      {penaltyHistoryTarget && (
        <ModalOverlay onClose={() => setPenaltyHistoryTarget(null)}>
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">패널티 내역 (올해)</h3>
                  <p className="text-sm text-gray-600">{penaltyHistoryTarget.organization_name}</p>
                </div>
                <button
                  onClick={() => setPenaltyHistoryTarget(null)}
                  className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                >
                  ✕
                </button>
              </div>

              {penaltyHistory.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500">올해 패널티 내역이 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {penaltyHistory.map((penalty) => (
                    <div key={penalty.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            penalty.type === 'warning'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {penalty.type === 'warning' ? '⚠️ 경고' : '🟥 퇴장'}
                          </span>
                          <span className="text-sm text-gray-800">{penalty.reason}</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDate(penalty.created_at)}
                          {penalty.issued_by && ` · ${penalty.issued_by}`}
                          {penalty.type === 'ejection' && penalty.restricted_month && ` · 제한월 ${penalty.restricted_month}`}
                        </div>
                      </div>
                      <button
                        onClick={() => handleCancelPenalty(penalty)}
                        disabled={isPenaltyProcessing}
                        className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50 shrink-0 ml-3"
                      >
                        취소
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ModalOverlay>
      )}
      {/* 등급 자동조정 미리보기/결과 모달 */}
      {autoTierResult && (() => {
        const isPreview = autoTierResult.mode === 'preview'
        const tierChanges = autoTierResult.changes.filter((c) => c.currentTier !== c.newTier)
        const countOnlyChanges = autoTierResult.changes.filter((c) => c.currentTier === c.newTier)
        const selectedCount = autoTierResult.changes.filter((c) => autoTierSelected.has(c.memberId)).length
        const isAllSelected = (list: AutoTierChange[]) => list.every((c) => autoTierSelected.has(c.memberId))
        const formatCount = (before: number | null, after: number | null, unit: string) => {
          if (before === after) return <span className="text-gray-700">{after ?? '-'}{unit}</span>
          return (
            <span>
              <span className="text-gray-400 line-through">{before ?? '-'}</span>
              <span className="text-gray-400 mx-1">→</span>
              <span className="font-semibold text-gray-900">{after ?? '-'}{unit}</span>
            </span>
          )
        }
        return (
        <div className={modalOverlayClass()}>
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[88vh] flex flex-col">
            <div className="p-6 pb-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">
                  {isPreview ? '등급 자동조정 미리보기' : '등급 자동조정 완료'}
                </h3>
                <button
                  onClick={() => setAutoTierResult(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              {isPreview ? (
                <p className="mt-1 text-sm text-amber-600 font-medium">
                  아직 적용되지 않았습니다. 적용할 회원만 체크한 뒤 하단의 적용 버튼을 눌러주세요.
                </p>
              ) : (
                <p className="mt-1 text-sm text-green-600 font-medium">
                  아래 변경 내역이 DB에 반영되었습니다.
                  {autoTierResult.skipped > 0 && ` (체크 해제된 ${autoTierResult.skipped}건은 제외)`}
                </p>
              )}
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {/* 요약 */}
              <div className="grid grid-cols-4 gap-3 mb-5">
                <div className="p-3 bg-gray-50 rounded-lg text-center">
                  <p className="text-xs text-gray-600">검사 대상</p>
                  <p className="text-xl font-bold text-gray-900">{autoTierResult.totalChecked}</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg text-center">
                  <p className="text-xs text-purple-700">{isPreview ? '변경 예정' : '변경됨'}</p>
                  <p className="text-xl font-bold text-purple-700">{autoTierResult.changes.length}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg text-center">
                  <p className="text-xs text-gray-600">변경 없음</p>
                  <p className="text-xl font-bold text-gray-900">{autoTierResult.unchanged}</p>
                </div>
                <div className={`p-3 rounded-lg text-center ${autoTierResult.matchFailed.length > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                  <p className={`text-xs ${autoTierResult.matchFailed.length > 0 ? 'text-red-700' : 'text-gray-600'}`}>조정 불가</p>
                  <p className={`text-xl font-bold ${autoTierResult.matchFailed.length > 0 ? 'text-red-700' : 'text-gray-900'}`}>{autoTierResult.matchFailed.length}</p>
                </div>
              </div>

              {autoTierResult.failedCities.length > 0 && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-medium text-red-700">
                    학교알리미 조회에 실패한 지역: {autoTierResult.failedCities.join(', ')}
                  </p>
                  <p className="text-xs text-red-600 mt-1">해당 지역 학교 회원은 등급이 변경되지 않습니다.</p>
                </div>
              )}

              {/* 등급 변경 목록 */}
              {tierChanges.length > 0 && (
                <div className="mb-5">
                  <p className="text-sm font-semibold text-gray-900 mb-2">
                    등급 {isPreview ? '변경 예정' : '변경'} ({tierChanges.length}명)
                  </p>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr className="text-left text-xs text-gray-500">
                          {isPreview && (
                            <th className="pl-3 py-2 w-8">
                              <input
                                type="checkbox"
                                checked={isAllSelected(tierChanges)}
                                onChange={(e) => toggleAutoTierSelectAll(tierChanges.map((c) => c.memberId), e.target.checked)}
                                className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                              />
                            </th>
                          )}
                          <th className="px-3 py-2 font-medium">단체명</th>
                          <th className="px-3 py-2 font-medium">학생수</th>
                          <th className="px-3 py-2 font-medium">학급수</th>
                          <th className="px-3 py-2 font-medium">등급</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {tierChanges.map((change) => (
                          <tr
                            key={change.memberId}
                            className={isPreview && !autoTierSelected.has(change.memberId) ? 'opacity-40' : ''}
                          >
                            {isPreview && (
                              <td className="pl-3 py-2 w-8">
                                <input
                                  type="checkbox"
                                  checked={autoTierSelected.has(change.memberId)}
                                  onChange={() => toggleAutoTierSelect(change.memberId)}
                                  className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                />
                              </td>
                            )}
                            <td className="px-3 py-2">
                              <p className="font-medium text-gray-900">{change.organizationName}</p>
                              <p className="text-xs text-gray-500">
                                {change.cityName}
                                {change.organizationType === 'welfare' && ' · 학교 외 단체'}
                                {change.matchedSchoolName && change.matchedSchoolName !== change.organizationName &&
                                  ` · 매칭: ${change.matchedSchoolName}`}
                              </p>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              {change.organizationType === 'school'
                                ? formatCount(change.currentStudentCount, change.newStudentCount, '명')
                                : <span className="text-gray-400">-</span>}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              {change.organizationType === 'school'
                                ? formatCount(change.currentClassCount, change.newClassCount, '학급')
                                : <span className="text-gray-400">-</span>}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1">
                                {getTierBadge(change.currentTier)}
                                <span className="text-gray-400">→</span>
                                {getTierBadge(change.newTier)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 수치만 갱신되는 목록 (등급 유지) */}
              {countOnlyChanges.length > 0 && (
                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-2">
                    {isPreview && (
                      <input
                        type="checkbox"
                        checked={isAllSelected(countOnlyChanges)}
                        onChange={(e) => toggleAutoTierSelectAll(countOnlyChanges.map((c) => c.memberId), e.target.checked)}
                        className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                    )}
                    <p className="text-sm font-semibold text-gray-900">
                      학생수/학급수만 {isPreview ? '갱신 예정' : '갱신'} — 등급 유지 ({countOnlyChanges.length}명)
                    </p>
                  </div>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-gray-100">
                        {countOnlyChanges.map((change) => (
                          <tr
                            key={change.memberId}
                            className={isPreview && !autoTierSelected.has(change.memberId) ? 'opacity-40' : ''}
                          >
                            {isPreview && (
                              <td className="pl-3 py-2 w-8">
                                <input
                                  type="checkbox"
                                  checked={autoTierSelected.has(change.memberId)}
                                  onChange={() => toggleAutoTierSelect(change.memberId)}
                                  className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                />
                              </td>
                            )}
                            <td className="px-3 py-2">
                              <span className="font-medium text-gray-900">{change.organizationName}</span>
                              <span className="text-xs text-gray-500 ml-2">{change.cityName}</span>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              {formatCount(change.currentStudentCount, change.newStudentCount, '명')}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              {formatCount(change.currentClassCount, change.newClassCount, '학급')}
                            </td>
                            <td className="px-3 py-2">{getTierBadge(change.currentTier)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {autoTierResult.changes.length === 0 && autoTierResult.matchFailed.length === 0 && (
                <div className="mb-5 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                  <p className="text-sm text-green-700 font-medium">모든 회원의 등급이 이미 최신 상태입니다.</p>
                </div>
              )}

              {/* 조정 불가 목록 */}
              {autoTierResult.matchFailed.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-2">
                    조정 불가 — 기존 등급 유지 ({autoTierResult.matchFailed.length}명)
                  </p>
                  <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                    {autoTierResult.matchFailed.map((item, index) => (
                      <div key={index} className="px-3 py-2 flex justify-between gap-3 text-sm">
                        <span className="font-medium text-gray-900">{item.organizationName}</span>
                        <span className="text-gray-500 text-right">{item.reason}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">필요 시 회원 목록에서 수동으로 조정해주세요.</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              {isPreview ? (
                <>
                  <button
                    onClick={() => setAutoTierResult(null)}
                    disabled={autoTierApplying}
                    className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleAutoTierApply}
                    disabled={autoTierApplying || selectedCount === 0}
                    className="flex items-center gap-2 px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white rounded-lg font-medium transition-colors"
                  >
                    {autoTierApplying && <RefreshCw className="w-4 h-4 animate-spin" />}
                    {autoTierApplying
                      ? '적용 중...'
                      : autoTierResult.changes.length === 0
                        ? '적용할 변경 없음'
                        : `${selectedCount}건 적용하기`}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setAutoTierResult(null)}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  확인
                </button>
              )}
            </div>
          </div>
        </div>
        )
      })()}
    </div>
  )
}
