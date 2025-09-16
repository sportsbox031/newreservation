'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Plus,
  X,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { settingsAPI } from '@/lib/supabase'
import AdminNavigation from '@/components/AdminNavigation'

interface BlockedDate {
  id: string
  date: string
  reason: string
  created_at: string
}

interface ReservationSettings {
  is_open: boolean
  max_reservations_per_day: number
  max_days_per_month: number
}

interface DailyLimit {
  date: string
  max_reservations: number
  updated_at: string
}

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [adminInfo, setAdminInfo] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'south' | 'north'>('south')
  
  // 현재 년/월
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1)
  
  // 설정 데이터
  const [settings, setSettings] = useState<{ [key: string]: ReservationSettings }>({})
  const [blockedDates, setBlockedDates] = useState<{ [key: string]: BlockedDate[] }>({})
  const [dailyLimits, setDailyLimits] = useState<{ [key: string]: DailyLimit[] }>({})
  
  // UI 상태
  const [newBlockedDate, setNewBlockedDate] = useState({ date: '' })
  const [newDailyLimit, setNewDailyLimit] = useState({ date: '', max_reservations: 2 })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (adminInfo) {
      loadAllData()
    }
  }, [adminInfo, currentYear, currentMonth, activeTab])

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

  const loadAllData = async () => {
    try {
      await Promise.all([
        loadSettings(),
        loadBlockedDates(),
        loadDailyLimits()
      ])
    } catch (error) {
      console.error('데이터 로드 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSettings = async () => {
    const regionCode = activeTab
    const { data, error } = await settingsAPI.getReservationSettings(regionCode, currentYear, currentMonth)
    
    if (!error && data) {
      setSettings(prev => ({ ...prev, [activeTab]: data }))
    } else {
      // 기본값 설정
      setSettings(prev => ({ 
        ...prev, 
        [activeTab]: {
          is_open: false,
          max_reservations_per_day: 2,
          max_days_per_month: 4
        }
      }))
    }
  }

  const loadBlockedDates = async () => {
    const regionCode = activeTab
    const { data, error } = await settingsAPI.getBlockedDates(regionCode)
    
    if (!error && data) {
      setBlockedDates(prev => ({ ...prev, [activeTab]: data }))
    }
  }

  const loadDailyLimits = async () => {
    const regionCode = activeTab
    const { data, error } = await settingsAPI.getAllDailyReservationLimits(regionCode)
    
    if (!error && data) {
      setDailyLimits(prev => ({ ...prev, [activeTab]: data }))
    }
  }

  const toggleReservationStatus = async () => {
    const regionCode = activeTab
    const currentSettings = settings[activeTab]
    const newIsOpen = !currentSettings.is_open

    setSaving(true)
    try {
      const { error } = await settingsAPI.updateReservationSettings(
        regionCode,
        currentYear,
        currentMonth,
        { ...currentSettings, is_open: newIsOpen }
      )
      
      if (error) {
        showMessage('error', '예약 상태 변경에 실패했습니다.')
        return
      }
      
      setSettings(prev => ({ 
        ...prev, 
        [activeTab]: { ...currentSettings, is_open: newIsOpen }
      }))
      
      showMessage('success', `예약이 ${newIsOpen ? '시작' : '종료'}되었습니다.`)
    } catch (error) {
      showMessage('error', '예약 상태 변경 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const updateDefaultLimit = async (newLimit: number) => {
    const regionCode = activeTab
    const currentSettings = settings[activeTab]

    setSaving(true)
    try {
      const { error } = await settingsAPI.updateReservationSettings(
        regionCode,
        currentYear,
        currentMonth,
        { ...currentSettings, max_reservations_per_day: newLimit }
      )
      
      if (error) {
        showMessage('error', '기본 예약 제한 변경에 실패했습니다.')
        return
      }
      
      setSettings(prev => ({ 
        ...prev, 
        [activeTab]: { ...currentSettings, max_reservations_per_day: newLimit }
      }))
      
      showMessage('success', `기본 예약 제한이 ${newLimit}개로 변경되었습니다.`)
    } catch (error) {
      showMessage('error', '기본 예약 제한 변경 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const addDailyLimit = async () => {
    if (!newDailyLimit.date) {
      showMessage('error', '날짜를 선택해주세요.')
      return
    }

    const regionCode = activeTab
    setSaving(true)
    
    try {
      const { error } = await settingsAPI.setDailyReservationLimit(
        regionCode,
        newDailyLimit.date,
        newDailyLimit.max_reservations
      )
      
      if (error) {
        showMessage('error', '특정일 예약 제한 설정에 실패했습니다.')
        return
      }
      
      showMessage('success', '특정일 예약 제한이 설정되었습니다.')
      setNewDailyLimit({ date: '', max_reservations: 2 })
      loadDailyLimits()
    } catch (error) {
      showMessage('error', '특정일 예약 제한 설정 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const removeDailyLimit = async (date: string) => {
    if (!confirm('이 날짜의 특별 제한을 삭제하시겠습니까?')) return

    const regionCode = activeTab
    setSaving(true)
    
    try {
      // 실제 DELETE로 삭제하여 기본 설정으로 돌아가기
      const { error } = await settingsAPI.removeDailyReservationLimit(regionCode, date)
      
      if (error) {
        showMessage('error', '특정일 예약 제한 삭제에 실패했습니다.')
        return
      }
      
      showMessage('success', '특정일 예약 제한이 삭제되었습니다. 기본 설정으로 돌아갑니다.')
      loadDailyLimits()
    } catch (error) {
      showMessage('error', '특정일 예약 제한 삭제 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const addBlockedDate = async () => {
    if (!newBlockedDate.date) {
      showMessage('error', '날짜를 선택해주세요.')
      return
    }

    const regionCode = activeTab
    setSaving(true)
    
    try {
      const { error } = await settingsAPI.addBlockedDate(
        newBlockedDate.date,
        '예약 불가',
        regionCode
      )
      
      if (error) {
        showMessage('error', '예약 불가 날짜 추가에 실패했습니다.')
        return
      }
      
      showMessage('success', '예약 불가 날짜가 추가되었습니다.')
      setNewBlockedDate({ date: '' })
      loadBlockedDates()
    } catch (error) {
      showMessage('error', '예약 불가 날짜 추가 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const removeBlockedDate = async (dateId: string) => {
    if (!confirm('이 차단 날짜를 삭제하시겠습니까?')) return

    setSaving(true)
    try {
      const { error } = await settingsAPI.removeBlockedDate(dateId)
      
      if (error) {
        showMessage('error', '차단 날짜 삭제에 실패했습니다.')
        return
      }
      
      showMessage('success', '차단 날짜가 삭제되었습니다.')
      loadBlockedDates()
    } catch (error) {
      showMessage('error', '차단 날짜 삭제 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const formatDate = (dateString: string) => {
    // 시간대 오프셋 문제를 방지하기 위해 로컬 날짜로 처리
    const [year, month, day] = dateString.split('-')
    return `${year}-${month}-${day}`
  }

  const changeMonth = (delta: number) => {
    const newMonth = currentMonth + delta
    if (newMonth > 12) {
      setCurrentYear(currentYear + 1)
      setCurrentMonth(1)
    } else if (newMonth < 1) {
      setCurrentYear(currentYear - 1)
      setCurrentMonth(12)
    } else {
      setCurrentMonth(newMonth)
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

  const currentSettings = settings[activeTab] || { is_open: false, max_reservations_per_day: 2, max_days_per_month: 4 }
  const currentBlockedDates = blockedDates[activeTab] || []
  const currentDailyLimits = dailyLimits[activeTab] || []

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation adminRole={adminInfo?.role} />
      
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">지역별 예약 설정</h1>
          <p className="text-gray-600 mt-2">
            경기남부/북부 지역별로 예약 시스템을 관리합니다.
          </p>
        </div>

        {/* 지역 탭 */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {(['south', 'north'] as const).map((region) => (
                <button
                  key={region}
                  onClick={() => setActiveTab(region)}
                  className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === region
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  경기{region === 'south' ? '남부' : '북부'}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* 메시지 표시 */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 mr-2" />
            ) : (
              <AlertTriangle className="w-5 h-5 mr-2" />
            )}
            {message.text}
          </div>
        )}

        {/* 월별 설정 헤더 */}
        <div className="mb-6 bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {currentYear}년 {currentMonth}월 설정
            </h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => changeMonth(-1)}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-4 py-2 bg-gray-100 rounded font-medium">
                {currentYear}년 {currentMonth}월
              </span>
              <button
                onClick={() => changeMonth(1)}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 예약 시작/종료 버튼 */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">예약 상태</h3>
              <p className="text-sm text-gray-600">
                예약 종료 시 사용자들이 달력을 클릭할 수 없습니다.
              </p>
            </div>
            <button
              onClick={toggleReservationStatus}
              disabled={saving}
              className={`flex items-center px-4 py-2 rounded-lg font-medium ${
                currentSettings.is_open
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              } disabled:opacity-50`}
            >
              {currentSettings.is_open ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  예약 종료
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  예약 시작
                </>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* 기본 예약 제한 설정 */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                기본 예약 제한 설정
              </h2>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  하루 최대 예약 수
                </label>
                <div className="flex items-center space-x-4">
                  {[1, 2, 3, 4, 5, 6].map((limit) => (
                    <button
                      key={limit}
                      onClick={() => updateDefaultLimit(limit)}
                      disabled={saving}
                      className={`px-4 py-2 rounded-lg font-medium ${
                        currentSettings.max_reservations_per_day === limit
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      } disabled:opacity-50`}
                    >
                      {limit}개
                    </button>
                  ))}
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  현재 기본값: <strong>{currentSettings.max_reservations_per_day}개</strong>
                </p>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">예약 규칙</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• 월 최대 {currentSettings.max_days_per_month}일 예약 가능</li>
                  <li>• 일 최대 {currentSettings.max_reservations_per_day}타임 예약 가능</li>
                  <li>• 오전 타임: 09:00 - 12:00</li>
                  <li>• 오후 타임: 13:00 - 17:00</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 특정일 예약 제한 설정 */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                특정일 예약 제한
              </h2>
            </div>
            
            {/* 새 특정일 제한 추가 */}
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-md font-medium text-gray-900 mb-4">새 특정일 제한 추가</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    날짜
                  </label>
                  <input
                    type="date"
                    value={newDailyLimit.date}
                    onChange={(e) => setNewDailyLimit({...newDailyLimit, date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    최대 예약 수
                  </label>
                  <select
                    value={newDailyLimit.max_reservations}
                    onChange={(e) => setNewDailyLimit({...newDailyLimit, max_reservations: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <option key={num} value={num}>{num}개</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={addDailyLimit}
                  disabled={saving}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  특정일 제한 추가
                </button>
              </div>
            </div>

            {/* 특정일 제한 목록 */}
            <div className="p-6">
              <h3 className="text-md font-medium text-gray-900 mb-4">설정된 특정일 제한</h3>
              {currentDailyLimits.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>설정된 특정일 제한이 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {currentDailyLimits.map((limit) => (
                    <div key={limit.date} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">
                          {formatDate(limit.date)}
                        </div>
                        <div className="text-sm text-gray-600">
                          최대 {limit.max_reservations}개 예약
                        </div>
                      </div>
                      <button
                        onClick={() => removeDailyLimit(limit.date)}
                        disabled={saving}
                        className="text-red-600 hover:text-red-800 disabled:opacity-50"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 차단된 날짜 관리 */}
        <div className="mt-8 bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <X className="w-5 h-5 mr-2" />
              예약 불가 날짜 관리
            </h2>
          </div>
          
          {/* 새 차단 날짜 추가 */}
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-md font-medium text-gray-900 mb-4">새 예약 불가 날짜 추가</h3>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  날짜
                </label>
                <input
                  type="date"
                  value={newBlockedDate.date}
                  onChange={(e) => setNewBlockedDate({date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={addBlockedDate}
                disabled={saving}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center"
              >
                <Plus className="w-4 h-4 mr-1" />
                추가
              </button>
            </div>
          </div>

          {/* 차단된 날짜 목록 */}
          <div className="p-6">
            <h3 className="text-md font-medium text-gray-900 mb-4">예약 불가 날짜 목록</h3>
            {currentBlockedDates.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>예약 불가 날짜가 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {currentBlockedDates.map((blockedDate) => (
                  <div key={blockedDate.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="font-medium text-red-900">
                      {formatDate(blockedDate.date)}
                    </div>
                    <button
                      onClick={() => removeBlockedDate(blockedDate.id)}
                      disabled={saving}
                      className="text-red-600 hover:text-red-800 disabled:opacity-50"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}