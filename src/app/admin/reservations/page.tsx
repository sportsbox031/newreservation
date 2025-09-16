'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  AlertTriangle,
  User,
  MapPin,
  Grid,
  List,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { reservationAPI, settingsAPI } from '@/lib/supabase'
import AdminNavigation from '@/components/AdminNavigation'

interface ReservationSlot {
  id: string
  start_time: string
  end_time: string
  grade: string
  participant_count: number
  location: string
  slot_order: number
}

interface Reservation {
  id: string
  date: string
  time_slot: string
  status: 'pending' | 'approved' | 'cancel_requested'
  created_at: string
  reservation_slots: ReservationSlot[]
  users: {
    id: string
    organization_name: string
    manager_name: string
    phone: string
    email: string
    cities: {
      name: string
      regions: {
        name: string
      }
    }
  }
}

export default function ReservationsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [adminInfo, setAdminInfo] = useState<any>(null)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [filteredReservations, setFilteredReservations] = useState<Reservation[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [regionFilter, setRegionFilter] = useState<'all' | 'north' | 'south'>('all')
  const [processing, setProcessing] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar')
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  
  // 예약 현황과 차단된 날짜 상태
  const [reservationStatus, setReservationStatus] = useState<{
    [date: string]: { current: number; max: number; isFull: boolean; isOpen: boolean }
  }>({})
  const [blockedDates, setBlockedDates] = useState<string[]>([])
  const [currentMonth, setCurrentMonth] = useState(new Date())

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    filterReservations()
  }, [reservations, searchTerm, regionFilter])

  useEffect(() => {
    if (adminInfo && viewMode === 'calendar') {
      loadCalendarData()
    }
  }, [adminInfo, currentMonth, viewMode, regionFilter])

  const checkAuth = () => {
    const adminAuth = localStorage.getItem('adminInfo')
    if (!adminAuth) {
      router.push('/auth/login')
      return
    }
    
    const adminData = JSON.parse(adminAuth)
    setAdminInfo(adminData)
    loadReservations(adminData)
  }

  // 달력 데이터 로드 (예약 현황 + 차단된 날짜)
  const loadCalendarData = async () => {
    try {
      const regionCode = getRegionCodeForAdmin()
      if (!regionCode) return

      // 현재 월의 모든 날짜에 대한 예약 현황 로드
      const year = currentMonth.getFullYear()
      const month = currentMonth.getMonth() + 1
      const daysInMonth = new Date(year, month, 0).getDate()
      
      const statusPromises = []
      const newReservationStatus: typeof reservationStatus = {}
      
      for (let day = 1; day <= daysInMonth; day++) {
        const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        
        statusPromises.push(
          settingsAPI.getDateReservationStatus(regionCode, dateString).then(result => {
            if (result.data) {
              newReservationStatus[dateString] = {
                current: result.data.current_reservations,
                max: result.data.max_reservations_per_day,
                isFull: result.data.is_full,
                isOpen: result.data.is_open
              }
            }
          }).catch(err => {
            console.error(`Failed to load status for ${dateString}:`, err)
          })
        )
      }
      
      // 차단된 날짜 로드
      const blockedPromise = settingsAPI.getBlockedDates(regionCode).then(result => {
        if (result.data) {
          const blocked = result.data.map((item: any) => item.date)
          setBlockedDates(blocked)
        }
      }).catch(err => {
        console.error('Failed to load blocked dates:', err)
      })

      await Promise.all([...statusPromises, blockedPromise])
      setReservationStatus(newReservationStatus)
      
    } catch (error) {
      console.error('달력 데이터 로드 오류:', error)
    }
  }

  // 관리자 역할에 따른 지역 코드 반환
  const getRegionCodeForAdmin = (): string => {
    if (!adminInfo) return 'south'
    
    switch (adminInfo.role) {
      case 'north':
        return 'north'
      case 'south':
        return 'south'
      case 'super':
        // Super admin은 기본적으로 남부 보여주되, 필터에 따라 변경 가능
        return regionFilter === 'north' ? 'north' : 'south'
      default:
        return 'south'
    }
  }

  const loadReservations = async (adminData: any) => {
    try {
      let result
      
      // 지역별 관리자는 해당 지역 예약만 조회
      if (adminData.role === 'super') {
        result = await reservationAPI.getAllReservations()
      } else if (adminData.role === 'south' || adminData.role === 'north') {
        result = await reservationAPI.getAllReservationsForRegion(adminData.role)
      } else {
        console.error('알 수 없는 관리자 역할:', adminData.role)
        return
      }

      if (result.error) {
        console.error('예약 로드 오류:', result.error)
        return
      }
      
      // 취소된 예약들 제외 (상태가 cancelled, admin_cancelled인 것들)
      const activeReservations = (result.data || []).filter((reservation: any) => 
        !['cancelled', 'admin_cancelled'].includes(reservation.status)
      )
      setReservations(activeReservations)
    } catch (error) {
      console.error('예약 로드 예외:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterReservations = () => {
    let filtered = reservations

    // 검색 필터
    if (searchTerm) {
      filtered = filtered.filter(reservation =>
        reservation.users?.organization_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reservation.users?.manager_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reservation.users?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reservation.users?.phone?.includes(searchTerm) ||
        reservation.date.includes(searchTerm)
      )
    }

    // 지역 필터
    if (regionFilter !== 'all') {
      filtered = filtered.filter(reservation => {
        const regionName = reservation.users?.cities?.regions?.name
        if (regionFilter === 'south') {
          return regionName === '경기남부'
        } else if (regionFilter === 'north') {
          return regionName === '경기북부'
        }
        return true
      })
    }

    // 날짜순 정렬 (최신순)
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    setFilteredReservations(filtered)
  }

  const handleStatusChange = async (reservationId: string, status: 'approved' | 'rejected') => {
    setProcessing(reservationId)
    try {
      const { error } = await reservationAPI.updateReservationStatus(reservationId, status)
      if (error) {
        console.error('예약 상태 업데이트 오류:', error)
        alert('상태 업데이트에 실패했습니다.')
        return
      }
      
      // 로컬 상태 업데이트
      setReservations((prev: any) => prev.map((reservation: any) =>
        reservation.id === reservationId ? { ...reservation, status } : reservation
      ))
      
      alert(`예약이 ${status === 'approved' ? '승인' : '거절'}되었습니다.`)
    } catch (error) {
      console.error('예약 상태 업데이트 예외:', error)
      alert('상태 업데이트 중 오류가 발생했습니다.')
    } finally {
      setProcessing(null)
    }
  }

  const handleCancelRequest = async (reservationId: string, action: 'approve' | 'reject') => {
    const confirmMessage = action === 'approve' 
      ? '취소를 승인하시겠습니까? 예약이 취소되고 남은 예약 갯수가 복구됩니다.' 
      : '취소를 거절하시겠습니까? 예약은 승인 상태로 유지됩니다.'
    
    if (!confirm(confirmMessage)) return

    setProcessing(reservationId)
    try {
      const newStatus = action === 'approve' ? 'cancelled' : 'approved'
      const { error } = await reservationAPI.updateReservationStatus(reservationId, newStatus)
      if (error) {
        console.error('취소요청 처리 오류:', error)
        alert('취소요청 처리에 실패했습니다.')
        return
      }
      
      // 로컬 상태 업데이트 또는 리스트에서 제거
      if (action === 'approve') {
        // 취소 승인 시 리스트에서 완전 제거
        setReservations(prev => prev.filter(reservation => reservation.id !== reservationId))
      } else {
        setReservations(prev => prev.map(reservation =>
          reservation.id === reservationId ? { ...reservation, status: 'approved' as any } : reservation
        ))
      }
      
      alert(`취소요청이 ${action === 'approve' ? '승인' : '거절'}되었습니다.`)
    } catch (error) {
      console.error('취소요청 처리 예외:', error)
      alert('취소요청 처리 중 오류가 발생했습니다.')
    } finally {
      setProcessing(null)
    }
  }

  const handleForceCancel = async (reservationId: string) => {
    if (!confirm('정말로 이 예약을 강제 취소하시겠습니까? 이 작업은 취소할 수 없습니다.')) return

    setProcessing(reservationId)
    try {
      const { error } = await reservationAPI.updateReservationStatus(reservationId, 'cancelled')
      if (error) {
        console.error('강제 취소 오류:', error)
        alert('강제 취소에 실패했습니다.')
        return
      }
      
      // 강제 취소 시 리스트에서 완전 제거
      setReservations(prev => prev.filter(reservation => reservation.id !== reservationId))
      
      alert('예약이 강제 취소되었습니다.')
    } catch (error) {
      console.error('강제 취소 예외:', error)
      alert('강제 취소 중 오류가 발생했습니다.')
    } finally {
      setProcessing(null)
    }
  }

  const getStatusBadge = (status: string) => {
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
      case 'cancel_requested':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            <AlertTriangle className="w-3 h-3 mr-1" />
            취소요청
          </span>
        )
      default:
        return null
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '날짜 오류'
    const date = new Date(dateString + 'T00:00:00')
    return isNaN(date.getTime()) ? '날짜 오류' : date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  const formatDateTime = (dateString: string) => {
    if (!dateString) return '날짜 오류'
    // Handle both date strings and full timestamps
    const date = new Date(dateString)
    return isNaN(date.getTime()) ? '날짜 오류' : date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTimeSlotText = (timeSlot: string) => {
    switch (timeSlot) {
      case 'morning': return '오전 (09:00-12:00)'
      case 'afternoon': return '오후 (13:00-17:00)'
      default: return timeSlot
    }
  }

  const getCalendarDates = () => {
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
    const dates = []

    // 이전 달의 날짜들로 첫 주 채우기
    const firstDayOfWeek = firstDay.getDay()
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(firstDay)
      date.setDate(date.getDate() - (i + 1))
      dates.push(date)
    }

    // 이번 달 날짜들
    for (let i = 1; i <= lastDay.getDate(); i++) {
      dates.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i))
    }

    // 다음 달의 날짜들로 마지막 주 채우기
    const remainingDays = 42 - dates.length
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(lastDay)
      date.setDate(date.getDate() + i)
      dates.push(date)
    }

    return dates
  }

  const getReservationsForDate = (date: Date) => {
    // Use local date formatting to avoid timezone issues
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateString = `${year}-${month}-${day}`
    return filteredReservations.filter(reservation => reservation.date === dateString)
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentMonth.getMonth() && date.getFullYear() === currentMonth.getFullYear()
  }

  // 특정 날짜가 차단된 날짜인지 확인
  const isBlockedDate = (date: Date) => {
    // 시간대 오프셋 문제를 방지하기 위해 로컬 날짜 형식 사용
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateString = `${year}-${month}-${day}`
    return blockedDates.includes(dateString)
  }

  // 특정 날짜의 예약 현황 가져오기
  const getDateStatus = (date: Date) => {
    // 시간대 오프셋 문제를 방지하기 위해 로컬 날짜 형식 사용
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateString = `${year}-${month}-${day}`
    return reservationStatus[dateString] || { current: 0, max: 2, isFull: false, isOpen: true }
  }

  // 월 변경 함수
  const changeMonth = (delta: number) => {
    const newMonth = new Date(currentMonth)
    newMonth.setMonth(newMonth.getMonth() + delta)
    setCurrentMonth(newMonth)
  }

  const formatTimeOnly = (timeString: string) => {
    if (!timeString) return '-'
    // timeString이 "HH:MM:SS" 형태라면 "HH:MM"만 반환
    return timeString.substring(0, 5)
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
          <h1 className="text-3xl font-bold text-gray-900">예약 관리</h1>
          <p className="text-gray-600 mt-2">
            {adminInfo?.role === 'super' && '전체 지역의 스포츠박스 예약 신청을 검토하고 승인/거절 처리를 할 수 있습니다.'}
            {adminInfo?.role === 'south' && '경기남부 지역의 스포츠박스 예약 신청을 검토하고 승인/거절 처리를 할 수 있습니다.'}
            {adminInfo?.role === 'north' && '경기북부 지역의 스포츠박스 예약 신청을 검토하고 승인/거절 처리를 할 수 있습니다.'}
          </p>
        </div>

        {/* 지역별 탭 */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="지역 탭">
              <button
                onClick={() => setRegionFilter('all')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  regionFilter === 'all'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                전체 지역
                <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                  {reservations.length}
                </span>
              </button>
              <button
                onClick={() => setRegionFilter('south')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  regionFilter === 'south'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                경기남부
                <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                  {reservations.filter(r => r.users?.cities?.regions?.name === '경기남부').length}
                </span>
              </button>
              <button
                onClick={() => setRegionFilter('north')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  regionFilter === 'north'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                경기북부
                <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                  {reservations.filter(r => r.users?.cities?.regions?.name === '경기북부').length}
                </span>
              </button>
            </nav>
          </div>
        </div>

        {/* 검색 및 필터 */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="단체명, 대표자명, 이메일, 전화번호, 날짜로 검색..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                title="리스트 뷰"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`p-2 rounded ${viewMode === 'calendar' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                title="달력 뷰"
              >
                <Grid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-50 rounded-full">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">대기중</p>
                <p className="text-2xl font-bold text-gray-900">
                  {reservations.filter(r => r.status === 'pending').length}
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
                  {reservations.filter(r => r.status === 'approved').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 bg-orange-50 rounded-full">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">취소요청</p>
                <p className="text-2xl font-bold text-gray-900">
                  {reservations.filter(r => r.status === 'cancel_requested').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 bg-blue-50 rounded-full">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">전체</p>
                <p className="text-2xl font-bold text-gray-900">{reservations.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 리스트 뷰 */}
        {viewMode === 'list' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                예약 목록 ({filteredReservations.length}건)
              </h2>
            </div>
            
            {filteredReservations.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">조건에 맞는 예약이 없습니다.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      예약 정보
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      신청자
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      연락처
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      지역
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상태
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      신청일
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      액션
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredReservations.map((reservation) => (
                    <tr key={reservation.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {formatDate(reservation.date)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {getTimeSlotText(reservation.time_slot)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="w-4 h-4 text-gray-400 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {reservation.users?.organization_name || '알 수 없음'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {reservation.users?.manager_name || '알 수 없음'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {reservation.users?.phone || '알 수 없음'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {reservation.users?.email || '알 수 없음'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                          <div>
                            <div className="text-sm text-gray-900">
                              {reservation.users?.cities?.regions?.name || '알 수 없음'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {reservation.users?.cities?.name || '알 수 없음'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(reservation.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDateTime(reservation.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {reservation.status === 'pending' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleStatusChange(reservation.id, 'approved')}
                              disabled={processing === reservation.id}
                              className="text-green-600 hover:text-green-900 disabled:opacity-50 px-3 py-1 border border-green-300 rounded hover:bg-green-50"
                            >
                              승인
                            </button>
                          </div>
                        )}
                        {reservation.status === 'approved' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleForceCancel(reservation.id)}
                              disabled={processing === reservation.id}
                              className="text-red-600 hover:text-red-900 disabled:opacity-50 px-3 py-1 border border-red-300 rounded hover:bg-red-50"
                            >
                              강제취소
                            </button>
                          </div>
                        )}
                        {reservation.status === 'cancel_requested' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleCancelRequest(reservation.id, 'approve')}
                              disabled={processing === reservation.id}
                              className="text-green-600 hover:text-green-900 disabled:opacity-50 px-3 py-1 border border-green-300 rounded hover:bg-green-50"
                            >
                              취소승인
                            </button>
                            <button
                              onClick={() => handleCancelRequest(reservation.id, 'reject')}
                              disabled={processing === reservation.id}
                              className="text-blue-600 hover:text-blue-900 disabled:opacity-50 px-3 py-1 border border-blue-300 rounded hover:bg-blue-50"
                            >
                              취소거절
                            </button>
                          </div>
                        )}
                        {processing === reservation.id && (
                          <div className="text-gray-500">
                            처리중...
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </div>
        )}

        {/* 달력 뷰 */}
        {viewMode === 'calendar' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  예약 달력 ({filteredReservations.length}건)
                </h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => changeMonth(-1)}
                    className="p-2 hover:bg-gray-100 rounded"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-4 py-2 bg-gray-100 rounded font-medium">
                    {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
                  </span>
                  <button
                    onClick={() => changeMonth(1)}
                    className="p-2 hover:bg-gray-100 rounded"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-7 gap-1 mb-4">
                {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                  <div key={day} className="p-3 text-center text-sm font-medium text-gray-500">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {getCalendarDates().map((date, index) => {
                  const dayReservations = getReservationsForDate(date)
                  const isCurrentMonthDate = isCurrentMonth(date)
                  const isTodayDate = isToday(date)
                  const blocked = isBlockedDate(date)
                  const dateStatus = getDateStatus(date)
                  
                  return (
                    <div
                      key={index}
                      className={`min-h-[120px] border border-gray-200 p-2 cursor-pointer hover:bg-gray-50 ${
                        blocked 
                          ? 'bg-red-50 border-red-200'
                          : isCurrentMonthDate ? 'bg-white' : 'bg-gray-50'
                      } ${isTodayDate ? 'ring-2 ring-blue-500' : ''}`}
                      onClick={() => {
                        if (dayReservations.length > 0) {
                          // If there's only one reservation, show its details
                          if (dayReservations.length === 1) {
                            setSelectedReservation(dayReservations[0])
                            setShowDetailModal(true)
                          } else {
                            // If there are multiple reservations, show the first one for now
                            // TODO: Could show a date-specific modal with all reservations
                            setSelectedReservation(dayReservations[0])
                            setShowDetailModal(true)
                          }
                        }
                      }}
                    >
                      {/* 날짜와 예약 현황 */}
                      <div className="flex justify-between items-start mb-2">
                        <div className={`text-sm font-medium ${
                          blocked 
                            ? 'text-red-700'
                            : isCurrentMonthDate ? 'text-gray-900' : 'text-gray-400'
                        } ${isTodayDate ? 'text-blue-600' : ''}`}>
                          {date.getDate()}
                        </div>
                        {isCurrentMonthDate && (
                          <div className="text-xs">
                            {blocked ? (
                              <div className="bg-red-100 text-red-700 px-1 rounded">
                                불가
                              </div>
                            ) : (
                              <div className={`px-1 rounded ${
                                dateStatus.isFull
                                  ? 'bg-red-100 text-red-700'
                                  : dateStatus.current === 0
                                  ? 'bg-gray-100 text-gray-600'
                                  : 'bg-blue-100 text-blue-700'
                              }`}>
                                {dateStatus.current}/{dateStatus.max}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* 예약 목록 */}
                      <div className="space-y-1">
                        {blocked ? (
                          <div className="text-xs text-red-600 text-center py-4">
                            예약 불가
                          </div>
                        ) : (
                          <>
                            {dayReservations.slice(0, 2).map((reservation) => (
                              <div
                                key={reservation.id}
                                className={`text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 ${
                                  reservation.status === 'pending'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : reservation.status === 'approved'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-orange-100 text-orange-800'
                                }`}
                                title={`${reservation.users?.organization_name || '예약'} - ${getTimeSlotText(reservation.time_slot)}`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedReservation(reservation)
                                  setShowDetailModal(true)
                                }}
                              >
                                {reservation.users?.organization_name?.substring(0, 6) || '예약'}
                              </div>
                            ))}
                            {dayReservations.length > 2 && (
                              <div 
                                className="text-xs text-gray-500 text-center cursor-pointer hover:text-gray-700"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  // Show the 3rd reservation (index 2) as example
                                  setSelectedReservation(dayReservations[2])
                                  setShowDetailModal(true)
                                }}
                              >
                                +{dayReservations.length - 2}개 더
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* 예약 상세 모달 */}
        {showDetailModal && selectedReservation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ zIndex: 1000 }}>
            <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900">
                    예약 상세 정보
                  </h3>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>
                
                <div className="space-y-6">
                  {/* 기본 정보 */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">단체명</label>
                      <div className="text-sm text-gray-900 font-medium">{selectedReservation.users?.organization_name || '알 수 없음'}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">대표자명</label>
                      <div className="text-sm text-gray-900">{selectedReservation.users?.manager_name || '알 수 없음'}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">전화번호</label>
                      <div className="text-sm text-gray-900">{selectedReservation.users?.phone || '알 수 없음'}</div>
                    </div>
                  </div>

                  {/* 타임슬롯 정보 */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">예약 시간 정보</h4>
                    <div className="grid grid-cols-2 gap-6">
                      {/* 첫 번째 슬롯 */}
                      {selectedReservation.reservation_slots && selectedReservation.reservation_slots[0] ? (
                        <div className="bg-white p-3 rounded border">
                          <h5 className="font-medium text-gray-800 mb-2">1번째 타임</h5>
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-gray-600">시작:</span>
                                <div className="font-medium">{formatTimeOnly(selectedReservation.reservation_slots[0].start_time)}</div>
                              </div>
                              <div>
                                <span className="text-gray-600">종료:</span>
                                <div className="font-medium">{formatTimeOnly(selectedReservation.reservation_slots[0].end_time)}</div>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-gray-600">학년:</span>
                                <div className="font-medium">{selectedReservation.reservation_slots[0].grade || '-'}</div>
                              </div>
                              <div>
                                <span className="text-gray-600">인원:</span>
                                <div className="font-medium">{selectedReservation.reservation_slots[0].participant_count || '-'}명</div>
                              </div>
                            </div>
                            <div className="text-sm">
                              <span className="text-gray-600">장소:</span>
                              <div className="font-medium">{selectedReservation.reservation_slots[0].location || '스포츠박스'}</div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white p-3 rounded border">
                          <h5 className="font-medium text-gray-800 mb-2">1번째 타임</h5>
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-gray-600">시작:</span>
                                <div className="font-medium text-gray-400">-</div>
                              </div>
                              <div>
                                <span className="text-gray-600">종료:</span>
                                <div className="font-medium text-gray-400">-</div>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-gray-600">학년:</span>
                                <div className="font-medium text-gray-400">-</div>
                              </div>
                              <div>
                                <span className="text-gray-600">인원:</span>
                                <div className="font-medium text-gray-400">-</div>
                              </div>
                            </div>
                            <div className="text-sm">
                              <span className="text-gray-600">장소:</span>
                              <div className="font-medium text-gray-400">-</div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* 두 번째 슬롯 */}
                      {selectedReservation.reservation_slots && selectedReservation.reservation_slots[1] ? (
                        <div className="bg-white p-3 rounded border">
                          <h5 className="font-medium text-gray-800 mb-2">2번째 타임</h5>
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-gray-600">시작:</span>
                                <div className="font-medium">{formatTimeOnly(selectedReservation.reservation_slots[1].start_time)}</div>
                              </div>
                              <div>
                                <span className="text-gray-600">종료:</span>
                                <div className="font-medium">{formatTimeOnly(selectedReservation.reservation_slots[1].end_time)}</div>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-gray-600">학년:</span>
                                <div className="font-medium">{selectedReservation.reservation_slots[1].grade || '-'}</div>
                              </div>
                              <div>
                                <span className="text-gray-600">인원:</span>
                                <div className="font-medium">{selectedReservation.reservation_slots[1].participant_count || '-'}명</div>
                              </div>
                            </div>
                            <div className="text-sm">
                              <span className="text-gray-600">장소:</span>
                              <div className="font-medium">{selectedReservation.reservation_slots[1].location || '스포츠박스'}</div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white p-3 rounded border">
                          <h5 className="font-medium text-gray-800 mb-2">2번째 타임</h5>
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-gray-600">시작:</span>
                                <div className="font-medium text-gray-400">-</div>
                              </div>
                              <div>
                                <span className="text-gray-600">종료:</span>
                                <div className="font-medium text-gray-400">-</div>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-gray-600">학년:</span>
                                <div className="font-medium text-gray-400">-</div>
                              </div>
                              <div>
                                <span className="text-gray-600">인원:</span>
                                <div className="font-medium text-gray-400">-</div>
                              </div>
                            </div>
                            <div className="text-sm">
                              <span className="text-gray-600">장소:</span>
                              <div className="font-medium text-gray-400">-</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 예약 상태 및 날짜 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">예약일</label>
                      <div className="text-sm text-gray-900">{formatDate(selectedReservation.date)}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
                      <div>{getStatusBadge(selectedReservation.status)}</div>
                    </div>
                  </div>
                </div>

                {/* 액션 버튼들 */}
                <div className="mt-6 flex flex-wrap gap-3 pt-4 border-t">
                  {selectedReservation.status === 'pending' && (
                    <button
                      onClick={() => {
                        setShowDetailModal(false)
                        handleStatusChange(selectedReservation.id, 'approved')
                      }}
                      disabled={processing === selectedReservation.id}
                      className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md disabled:opacity-50"
                    >
                      승인
                    </button>
                  )}
                  
                  {selectedReservation.status === 'approved' && (
                    <button
                      onClick={() => {
                        setShowDetailModal(false)
                        handleForceCancel(selectedReservation.id)
                      }}
                      disabled={processing === selectedReservation.id}
                      className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md disabled:opacity-50"
                    >
                      강제 취소
                    </button>
                  )}
                  
                  {selectedReservation.status === 'cancel_requested' && (
                    <>
                      <button
                        onClick={() => {
                          setShowDetailModal(false)
                          handleCancelRequest(selectedReservation.id, 'approve')
                        }}
                        disabled={processing === selectedReservation.id}
                        className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md disabled:opacity-50"
                      >
                        취소 승인
                      </button>
                      <button
                        onClick={() => {
                          setShowDetailModal(false)
                          handleCancelRequest(selectedReservation.id, 'reject')
                        }}
                        disabled={processing === selectedReservation.id}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md disabled:opacity-50"
                      >
                        취소 거절
                      </button>
                    </>
                  )}
                  
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="ml-auto bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-2 px-4 rounded-md"
                  >
                    닫기
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}