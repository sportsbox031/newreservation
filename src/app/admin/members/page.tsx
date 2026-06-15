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
  Download
} from 'lucide-react'
import { memberAPI } from '@/lib/supabase'
import AdminNavigation from '@/components/AdminNavigation'
import ExcelJS from 'exceljs'
import * as XLSX from 'xlsx'
import {
  filterMembersForDisplay,
  getMemberSummaryCounts,
} from '@/lib/memberAdminHelpers'
import { buildCookieFirstJsonRequestInit } from '@/lib/clientAuthHeaders'

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
  cities: {
    name: string
    regions: {
      name: string
    } | null
  }
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
  const summaryCounts = getMemberSummaryCounts(members, { searchTerm, regionFilter })

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    filterMembers()
  }, [members, searchTerm, statusFilter, regionFilter])

  const checkAuth = () => {
    const adminAuth = localStorage.getItem('adminInfo')
    if (!adminAuth) {
      router.push('/auth/login')
      return
    }
    
    const adminData = JSON.parse(adminAuth)
    setAdminInfo(adminData)
    loadMembers(adminData)
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

  const handleStatusChange = async (memberId: string, status: 'approved' | 'rejected') => {
    setProcessing(memberId)
    try {
      if (status === 'rejected') {
        // 거절 시 회원 삭제
        if (!confirm('회원 가입을 거절하면 데이터가 영구 삭제됩니다. 계속하시겠습니까?')) {
          setProcessing(null)
          return
        }

        // 알림톡 발송 (삭제 전에 먼저 발송)
        const member = members.find(m => m.id === memberId)
        if (member) {
          fetch('/api/notifications/aligo', buildCookieFirstJsonRequestInit({
              type: 'member_rejection',
              phone: member.phone,
              organizationName: member.organization_name,
              tplCode: process.env.NEXT_PUBLIC_ALIGO_MEMBER_REJECTION_TPL_CODE || ''
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
              phone: member.phone,
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
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
        { width: 20 }  // 가입일
      ]

      // 제목 행
      const titleRow = worksheet.getRow(1)
      titleRow.getCell(1).value = '회원 목록'
      worksheet.mergeCells(1, 1, 1, 11)
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
      const headers = ['단체명', '대표자명', '전화번호', '이메일', '지역', '시/군', '학생수', '학급수', '회원등급', '상태', '가입일']
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
          formatDate(member.created_at)
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

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation adminRole={adminInfo?.role} />
      
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
              <div className="flex items-center gap-2">
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
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      단체/대표자
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      연락처
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      지역
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      학생수
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      학급수
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상태
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      티어
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      액션
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {member.organization_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {member.manager_name}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{member.phone}</div>
                        <div className="text-sm text-gray-500">{member.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {member.cities?.regions?.name || member.region}
                        </div>
                        <div className="text-sm text-gray-500">
                          {member.cities?.name || member.city}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {member.student_count || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {member.class_count || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(member.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {member.status === 'approved' ? (
                          <select
                            value={member.tier ?? 'Standard'}
                            onChange={(e) => handleTierChange(member.id, e.target.value as 'Priority' | 'Standard', member.organization_name)}
                            disabled={processing === member.id}
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-all hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed ${
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
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
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
                          <button
                            onClick={() => handlePasswordReset(member.id, member.organization_name)}
                            disabled={processing === member.id}
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-900 disabled:opacity-50"
                            title="비밀번호를 0000으로 초기화"
                          >
                            <Key className="w-3 h-3" />
                            초기화
                          </button>
                          <button
                            onClick={() => handleDeleteMember(member.id, member.organization_name)}
                            disabled={processing === member.id}
                            className="flex items-center gap-1 text-red-600 hover:text-red-900 disabled:opacity-50"
                            title="회원 삭제"
                          >
                            <XCircle className="w-3 h-3" />
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
