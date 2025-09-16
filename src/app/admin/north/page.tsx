'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Users,
  Calendar,
  Bell,
  Monitor,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react'
import { memberAPI, reservationAPI, announcementAPI } from '@/lib/supabase'
import AdminNavigation from '@/components/AdminNavigation'

interface DashboardStats {
  pendingMembers: number
  approvedMembers: number
  pendingReservations: number
  approvedReservations: number
  totalAnnouncements: number
  activeAnnouncements: number
}

interface RecentActivity {
  id: string
  type: 'member' | 'reservation' | 'announcement'
  title: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

export default function AdminNorthDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [adminInfo, setAdminInfo] = useState<any>(null)
  const [stats, setStats] = useState<DashboardStats>({
    pendingMembers: 0,
    approvedMembers: 0,
    pendingReservations: 0,
    approvedReservations: 0,
    totalAnnouncements: 0,
    activeAnnouncements: 0
  })
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = () => {
    const adminAuth = localStorage.getItem('adminInfo')
    if (!adminAuth) {
      router.push('/auth/login')
      return
    }
    
    const adminData = JSON.parse(adminAuth)
    if (adminData.role !== 'north' && adminData.role !== 'super') {
      alert('접근 권한이 없습니다.')
      router.push('/auth/login')
      return
    }
    
    setAdminInfo(adminData)
    loadDashboardData(adminData)
  }

  const loadDashboardData = async (adminData: any) => {
    try {
      // 경기북부 지역 데이터만 로드
      const [membersResult, reservationsResult, announcementsResult] = await Promise.all([
        memberAPI.getPendingMembersForRegion('north'),
        reservationAPI.getPendingReservationsForRegion('north'),
        announcementAPI.getPublicAnnouncements()
      ])

      // 승인된 회원 수 조회
      const approvedMembersResult = await memberAPI.getApprovedMembersForRegion('north')
      const approvedReservationsResult = await reservationAPI.getApprovedReservationsForRegion('north')

      setStats({
        pendingMembers: membersResult.data?.length || 0,
        approvedMembers: approvedMembersResult.data?.length || 0,
        pendingReservations: reservationsResult.data?.length || 0,
        approvedReservations: approvedReservationsResult.data?.length || 0,
        totalAnnouncements: announcementsResult.data?.length || 0,
        activeAnnouncements: announcementsResult.data?.filter((a: any) => a.is_published).length || 0
      })

      // 최근 활동 데이터 구성 (경기북부 지역만)
      const activities: RecentActivity[] = [
        ...(membersResult.data || []).slice(0, 3).map((member: any) => ({
          id: member.id,
          type: 'member' as const,
          title: `${member.organization_name} 회원가입 신청 (경기북부)`,
          status: 'pending' as const,
          created_at: member.created_at
        })),
        ...(reservationsResult.data || []).slice(0, 3).map((reservation: any) => ({
          id: reservation.id,
          type: 'reservation' as const,
          title: `${reservation.users?.organization_name} 예약 신청 (${reservation.date}) - 경기북부`,
          status: reservation.status as 'pending' | 'approved' | 'rejected',
          created_at: reservation.created_at
        }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      setRecentActivities(activities.slice(0, 5))
      
    } catch (error) {
      console.error('대시보드 데이터 로드 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '대기중'
      case 'approved': return '승인됨'
      case 'rejected': return '거절됨'
      default: return '알 수 없음'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNavigation adminRole={adminInfo?.role} />
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
          <h1 className="text-3xl font-bold text-gray-900">관리자 대시보드</h1>
          <p className="text-gray-600 mt-2">
            경기북부 지역을 관리합니다
          </p>
        </div>

        {/* 관리 기능 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Link href="/admin/members" className="block">
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">대기 중인 회원</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pendingMembers}</p>
                  <p className="text-xs text-gray-500 mt-1">승인된 회원: {stats.approvedMembers}명</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-full">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
          </Link>

          <Link href="/admin/reservations" className="block">
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">대기 중인 예약</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pendingReservations}</p>
                  <p className="text-xs text-gray-500 mt-1">승인된 예약: {stats.approvedReservations}건</p>
                </div>
                <div className="p-3 bg-green-50 rounded-full">
                  <Calendar className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
          </Link>

          <Link href="/admin/announcements" className="block">
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">공지사항</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalAnnouncements}</p>
                  <p className="text-xs text-gray-500 mt-1">활성: {stats.activeAnnouncements}건</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-full">
                  <Bell className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </Link>

          <Link href="/admin/popups" className="block">
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border-l-4 border-orange-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">팝업 관리</p>
                  <p className="text-2xl font-bold text-gray-900">NEW</p>
                  <p className="text-xs text-gray-500 mt-1">홈페이지 팝업 설정</p>
                </div>
                <div className="p-3 bg-orange-50 rounded-full">
                  <Monitor className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* 최근 활동 */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">최근 활동 - 경기북부</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {recentActivities.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>최근 활동이 없습니다.</p>
              </div>
            ) : (
              recentActivities.map((activity) => (
                <div key={activity.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(activity.status)}
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {activity.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(activity.created_at)}
                        </p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      activity.status === 'pending' 
                        ? 'bg-yellow-100 text-yellow-800'
                        : activity.status === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {getStatusText(activity.status)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}