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
  status: 'pending' | 'approved' | 'cancel_requested' | 'cancelled' | 'admin_cancelled' | 'rejected'
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
  const [adminInfo, setAdminInfo] = useState<any>(null)  const
 [reservations, setReservations] = useState<Reservation[]>([])
  const [filteredReservations, setFilteredReservations] = useState<Reservation[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [regionFilter, setRegionFilter] = useState<'all' | 'north' | 'south'>('all')
  const [processing, setProcessing] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    filterReservations()
  }, [reservations, searchTerm, regionFilter])

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

  const loadReservations = async (adminData: any) => {
    try {
      let result
      
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
      
      const activeReservations = (result.data || []).filter((reservation: any) => 
        !['cancelled', 'admin_cancelled'].includes(reservation.status)
      )
      setReservations(activeReservations)
    } catch (error) {
      console.error('예약 로드 예외:', error)
    } finally {
      setLoading(false)
    }
  }  co
nst filterReservations = () => {
    let filtered = reservations

    if (searchTerm) {
      filtered = filtered.filter(reservation =>
        reservation.users?.organization_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reservation.users?.manager_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reservation.users?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reservation.users?.phone?.includes(searchTerm) ||
        reservation.date.includes(searchTerm)
      )
    }

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
      
      if (action === 'approve') {
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
    const date = new Date(dateString)
    return isNaN(date.getTime()) ? '날짜 오류' : date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }  i
f (loading) {
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">예약 관리</h1>
          <p className="text-gray-600 mt-2">
            {adminInfo?.role === 'super' && '전체 지역의 스포츠박스 예약 신청을 검토하고 승인/거절 처리를 할 수 있습니다.'}
            {adminInfo?.role === 'south' && '경기남부 지역의 스포츠박스 예약 신청을 검토하고 승인/거절 처리를 할 수 있습니다.'}
            {adminInfo?.role === 'north' && '경기북부 지역의 스포츠박스 예약 신청을 검토하고 승인/거절 처리를 할 수 있습니다.'}
          </p>
        </div>   
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
        </div>        <di
v className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
                              {reservation.reservation_slots?.length || 0}개 슬롯
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
                              <button
                                onClick={() => handleStatusChange(reservation.id, 'rejected')}
                                disabled={processing === reservation.id}
                                className="text-red-600 hover:text-red-900 disabled:opacity-50 px-3 py-1 border border-red-300 rounded hover:bg-red-50"
                              >
                                거절
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
      </div>
    </div>
  )
}