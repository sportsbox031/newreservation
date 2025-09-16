'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  TrendingUp,
  Users,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  PieChart,
  Download,
  Filter,
  AlertTriangle
} from 'lucide-react'
import { memberAPI, reservationAPI } from '@/lib/supabase'
import AdminNavigation from '@/components/AdminNavigation'

interface ReportData {
  totalMembers: number
  pendingMembers: number
  approvedMembers: number
  rejectedMembers: number
  totalReservations: number
  pendingReservations: number
  approvedReservations: number
  rejectedReservations: number
  monthlyReservations: { [key: string]: number }
  regionStats: { [key: string]: number }
}

export default function ReportsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [adminInfo, setAdminInfo] = useState<any>(null)
  const [reportData, setReportData] = useState<ReportData>({
    totalMembers: 0,
    pendingMembers: 0,
    approvedMembers: 0,
    rejectedMembers: 0,
    totalReservations: 0,
    pendingReservations: 0,
    approvedReservations: 0,
    rejectedReservations: 0,
    monthlyReservations: {},
    regionStats: {}
  })
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (adminInfo) {
      loadReportData()
    }
  }, [adminInfo, dateRange])

  const checkAuth = () => {
    const adminAuth = localStorage.getItem('adminInfo')
    if (!adminAuth) {
      router.push('/auth/login')
      return
    }
    
    const adminData = JSON.parse(adminAuth)
    if (adminData.role !== 'super') {
      router.push('/admin')
      return
    }
    
    setAdminInfo(adminData)
  }

  const loadReportData = async () => {
    try {
      const [membersResult, reservationsResult] = await Promise.all([
        memberAPI.getAllMembers(),
        reservationAPI.getAllReservations()
      ])

      const members = membersResult.data || []
      const reservations = reservationsResult.data || []

      // 날짜 범위 필터링
      const filteredReservations = reservations.filter((reservation: any) => {
        const reservationDate = new Date(reservation.reservation_date)
        const startDate = new Date(dateRange.startDate)
        const endDate = new Date(dateRange.endDate)
        return reservationDate >= startDate && reservationDate <= endDate
      })

      // 회원 통계
      const memberStats = {
        totalMembers: members.length,
        pendingMembers: members.filter((m: any) => m.status === 'pending').length,
        approvedMembers: members.filter((m: any) => m.status === 'approved').length,
        rejectedMembers: members.filter((m: any) => m.status === 'rejected').length
      }

      // 예약 통계
      const reservationStats = {
        totalReservations: filteredReservations.length,
        pendingReservations: filteredReservations.filter((r: any) => r.status === 'pending').length,
        approvedReservations: filteredReservations.filter((r: any) => r.status === 'approved').length,
        rejectedReservations: filteredReservations.filter((r: any) => r.status === 'rejected').length
      }

      // 월별 예약 통계
      const monthlyStats: { [key: string]: number } = {}
      filteredReservations.forEach((reservation: any) => {
        const date = new Date(reservation.reservation_date + 'T00:00:00')
        const month = isNaN(date.getTime()) ? 'Invalid' : date.toLocaleDateString('ko-KR', { 
          year: 'numeric', 
          month: '2-digit' 
        })
        monthlyStats[month] = (monthlyStats[month] || 0) + 1
      })

      // 지역별 통계
      const regionStats: { [key: string]: number } = {}
      members.forEach((member: any) => {
        const region = member.cities?.regions?.name || '알 수 없음'
        regionStats[region] = (regionStats[region] || 0) + 1
      })

      setReportData({
        ...memberStats,
        ...reservationStats,
        monthlyReservations: monthlyStats,
        regionStats
      })

    } catch (error) {
      console.error('리포트 데이터 로드 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    const csvContent = [
      ['구분', '전체', '대기중', '승인됨', '거절됨'],
      ['회원', reportData.totalMembers, reportData.pendingMembers, reportData.approvedMembers, reportData.rejectedMembers],
      ['예약', reportData.totalReservations, reportData.pendingReservations, reportData.approvedReservations, reportData.rejectedReservations]
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `스포츠박스_통계_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getPercentage = (value: number, total: number) => {
    return total > 0 ? Math.round((value / total) * 100) : 0
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNavigation adminRole={adminInfo?.role} />
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
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
          <h1 className="text-3xl font-bold text-gray-900">통계 및 리포트</h1>
          <p className="text-gray-600 mt-2">
            스포츠박스 예약 시스템의 이용 현황과 통계를 확인할 수 있습니다.
          </p>
        </div>

        {/* 필터 및 내보내기 */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <Filter className="w-5 h-5 text-gray-400" />
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">기간:</label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                  className="px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="text-gray-500">~</span>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                  className="px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <button
              onClick={exportToCSV}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              CSV 다운로드
            </button>
          </div>
        </div>

        {/* 주요 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">총 회원 수</p>
                <p className="text-2xl font-bold text-gray-900">{reportData.totalMembers}</p>
                <p className="text-xs text-green-600 mt-1">
                  승인률: {getPercentage(reportData.approvedMembers, reportData.totalMembers)}%
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-full">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">총 예약 수</p>
                <p className="text-2xl font-bold text-gray-900">{reportData.totalReservations}</p>
                <p className="text-xs text-green-600 mt-1">
                  승인률: {getPercentage(reportData.approvedReservations, reportData.totalReservations)}%
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-full">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">대기 중인 신청</p>
                <p className="text-2xl font-bold text-gray-900">
                  {reportData.pendingMembers + reportData.pendingReservations}
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  회원: {reportData.pendingMembers}, 예약: {reportData.pendingReservations}
                </p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-full">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">시스템 활용도</p>
                <p className="text-2xl font-bold text-gray-900">
                  {getPercentage(reportData.approvedReservations, reportData.totalMembers * 4)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  월 최대 예약 대비
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-full">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 회원 상태 분포 */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <PieChart className="w-5 h-5 mr-2" />
                회원 상태 분포
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-green-500 rounded mr-3"></div>
                    <span className="text-sm font-medium">승인됨</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm text-gray-600 mr-2">
                      {reportData.approvedMembers}명
                    </span>
                    <span className="text-sm font-medium">
                      ({getPercentage(reportData.approvedMembers, reportData.totalMembers)}%)
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-yellow-500 rounded mr-3"></div>
                    <span className="text-sm font-medium">대기중</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm text-gray-600 mr-2">
                      {reportData.pendingMembers}명
                    </span>
                    <span className="text-sm font-medium">
                      ({getPercentage(reportData.pendingMembers, reportData.totalMembers)}%)
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-red-500 rounded mr-3"></div>
                    <span className="text-sm font-medium">거절됨</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm text-gray-600 mr-2">
                      {reportData.rejectedMembers}명
                    </span>
                    <span className="text-sm font-medium">
                      ({getPercentage(reportData.rejectedMembers, reportData.totalMembers)}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 예약 상태 분포 */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                예약 상태 분포
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-green-500 rounded mr-3"></div>
                    <span className="text-sm font-medium">승인됨</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm text-gray-600 mr-2">
                      {reportData.approvedReservations}건
                    </span>
                    <span className="text-sm font-medium">
                      ({getPercentage(reportData.approvedReservations, reportData.totalReservations)}%)
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-yellow-500 rounded mr-3"></div>
                    <span className="text-sm font-medium">대기중</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm text-gray-600 mr-2">
                      {reportData.pendingReservations}건
                    </span>
                    <span className="text-sm font-medium">
                      ({getPercentage(reportData.pendingReservations, reportData.totalReservations)}%)
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-red-500 rounded mr-3"></div>
                    <span className="text-sm font-medium">거절됨</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm text-gray-600 mr-2">
                      {reportData.rejectedReservations}건
                    </span>
                    <span className="text-sm font-medium">
                      ({getPercentage(reportData.rejectedReservations, reportData.totalReservations)}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 월별 예약 현황 */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                월별 예약 현황
              </h2>
            </div>
            <div className="p-6">
              {Object.keys(reportData.monthlyReservations).length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>선택한 기간에 예약 데이터가 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(reportData.monthlyReservations)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([month, count]) => (
                      <div key={month} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{month}</span>
                        <div className="flex items-center">
                          <div 
                            className="bg-blue-200 h-2 rounded mr-3"
                            style={{ 
                              width: `${Math.max(10, (count / Math.max(...Object.values(reportData.monthlyReservations))) * 100)}px` 
                            }}
                          ></div>
                          <span className="text-sm text-gray-600">{count}건</span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* 지역별 회원 분포 */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Users className="w-5 h-5 mr-2" />
                지역별 회원 분포
              </h2>
            </div>
            <div className="p-6">
              {Object.keys(reportData.regionStats).length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>지역별 데이터가 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(reportData.regionStats)
                    .sort(([, a], [, b]) => b - a)
                    .map(([region, count]) => (
                      <div key={region} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{region}</span>
                        <div className="flex items-center">
                          <div 
                            className="bg-green-200 h-2 rounded mr-3"
                            style={{ 
                              width: `${Math.max(10, (count / Math.max(...Object.values(reportData.regionStats))) * 100)}px` 
                            }}
                          ></div>
                          <span className="text-sm text-gray-600">
                            {count}명 ({getPercentage(count, reportData.totalMembers)}%)
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}