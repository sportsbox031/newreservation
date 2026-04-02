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
  ChevronRight,
  Users,
  Settings,
  Info,
  Sun
} from 'lucide-react'
import { settingsAPI, reservationConcurrencyAPI, tierAPI } from '@/lib/supabase'
import AdminNavigation from '@/components/AdminNavigation'
import { buildReservationMonthTransitionMessage, normalizeYearMonth } from '@/lib/reservationActiveMonth'

interface BlockedDate {
  id: number
  date: string
  reason: string | null
  start_time: string | null
  end_time: string | null
  created_at?: string | null
}

interface ReservationSettings {
  is_open: boolean | null
  max_reservations_per_day: number | null
  max_days_per_month: number | null
}

interface DailyLimit {
  date: string
  max_reservations: number
  updated_at: string | null
}

interface Tier {
  id: number
  tier_name: string
  tier_level: number
  description: string | null
  advance_reservation_days: number | null
}

interface TierReservationSetting {
  id: number
  tier_id: number | null
  is_open: boolean | null
  reservation_start_date: string | null
  member_tiers: {
    tier_name: string
    tier_level: number
    advance_reservation_days: number | null
  }
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
  
  // 티어 관련 데이터 - NEW
  const [tiers, setTiers] = useState<Tier[]>([])
  const [tierSettings, setTierSettings] = useState<{ [key: string]: TierReservationSetting[] }>({})
  const [activeReservationMonth, setActiveReservationMonth] = useState<{ [key: string]: string | null }>({})

  // UI 상태
  const [newBlockedDate, setNewBlockedDate] = useState({
    date: '',
    startTime: '',  // 빈 문자열이면 하루 전체 차단
    endTime: ''     // 빈 문자열이면 하루 전체 차단
  })
  const [bulkBlockMode, setBulkBlockMode] = useState(false) // 일괄 차단 모드
  const [bulkBlockData, setBulkBlockData] = useState({
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    includeWeekends: true // 주말 포함 여부
  })
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
    if (!['super', 'south', 'north'].includes(adminData.role)) {
      router.push('/admin')
      return
    }

    setAdminInfo(adminData)

    // 지역 관리자의 경우 자신의 지역으로 activeTab 설정
    if (adminData.role === 'south') {
      setActiveTab('south')
    } else if (adminData.role === 'north') {
      setActiveTab('north')
    }
  }

  const loadAllData = async () => {
    try {
      await Promise.all([
        loadSettings(),
        loadBlockedDates(),
        loadDailyLimits(),
        loadTierData(),
        loadActiveReservationMonth()
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

  const loadTierData = async () => {
    const regionCode = activeTab
    const yearMonth = `${currentYear}-${currentMonth.toString().padStart(2, '0')}`

    try {
      // 모든 티어 정보 로드
      const { data: tiersData, error: tiersError } = await tierAPI.getAllTiers()
      if (!tiersError && tiersData) {
        setTiers(tiersData)
      }

      // 현재 지역/월의 티어별 예약 설정 로드
      const { data: settingsData, error: settingsError } = await tierAPI.getTierReservationSettings(regionCode, yearMonth)
      if (!settingsError) {
        // 데이터가 없어도 빈 배열로 설정 (기본 상태)
        setTierSettings(prev => ({ ...prev, [activeTab]: settingsData || [] }))
      } else {
        console.error('티어 설정 로드 오류:', settingsError)
        // 오류가 발생해도 빈 배열로 초기화
        setTierSettings(prev => ({ ...prev, [activeTab]: [] }))
      }
    } catch (error) {
      console.error('티어 데이터 로드 오류:', error)
    }
  }

  const loadActiveReservationMonth = async () => {
    const regionCode = activeTab
    const { data, error } = await tierAPI.getActiveReservationMonth(regionCode)

    if (!error) {
      setActiveReservationMonth(prev => ({
        ...prev,
        [activeTab]: data?.yearMonth ?? null,
      }))
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
        {
          is_open: currentSettings?.is_open ?? false,
          max_days_per_month: currentSettings?.max_days_per_month ?? 4,
          max_reservations_per_day: newLimit
        }
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

  // 시간대 겹침 검사 함수
  const isTimeOverlapping = (start1: string, end1: string, start2: string, end2: string): boolean => {
    const toMinutes = (time: string) => {
      const [h, m] = time.split(':').map(Number)
      return h * 60 + m
    }
    const s1 = toMinutes(start1)
    const e1 = toMinutes(end1)
    const s2 = toMinutes(start2)
    const e2 = toMinutes(end2)
    return s1 < e2 && e1 > s2
  }

  const addBlockedDate = async () => {
    if (!newBlockedDate.date) {
      showMessage('error', '날짜를 선택해주세요.')
      return
    }

    // 시간대 검증: 둘 다 있거나 둘 다 없어야 함
    if ((newBlockedDate.startTime && !newBlockedDate.endTime) ||
        (!newBlockedDate.startTime && newBlockedDate.endTime)) {
      showMessage('error', '시작 시간과 종료 시간을 모두 입력하거나 모두 비워야 합니다.')
      return
    }

    // 시간 순서 검증
    if (newBlockedDate.startTime && newBlockedDate.endTime &&
        newBlockedDate.startTime >= newBlockedDate.endTime) {
      showMessage('error', '종료 시간은 시작 시간보다 늦어야 합니다.')
      return
    }

    // 같은 날짜의 기존 차단과 겹침/충돌 검증
    const sameDateBlocks = currentBlockedDates.filter(b => b.date === newBlockedDate.date)

    if (sameDateBlocks.length > 0) {
      // 기존에 하루 전체 차단이 있는 경우
      const hasFullDayBlock = sameDateBlocks.some(b => !b.start_time || !b.end_time)
      if (hasFullDayBlock) {
        showMessage('error', '이미 해당 날짜가 전체 차단되어 있습니다. 기존 차단을 삭제 후 다시 시도하세요.')
        return
      }

      // 새로 추가하는 것이 하루 전체 차단인 경우
      if (!newBlockedDate.startTime || !newBlockedDate.endTime) {
        showMessage('error', '이미 해당 날짜에 시간대별 차단이 있습니다. 전체 차단하려면 기존 차단을 먼저 삭제하세요.')
        return
      }

      // 시간대 겹침 검증
      for (const existing of sameDateBlocks) {
        if (existing.start_time && existing.end_time) {
          if (isTimeOverlapping(
            newBlockedDate.startTime,
            newBlockedDate.endTime,
            existing.start_time.substring(0, 5),
            existing.end_time.substring(0, 5)
          )) {
            showMessage('error', `기존 차단 시간(${existing.start_time.substring(0, 5)}~${existing.end_time.substring(0, 5)})과 겹칩니다.`)
            return
          }
        }
      }
    }

    const regionCode = activeTab
    setSaving(true)

    try {
      // 차단 사유 생성 (시간대가 있으면 시간대 포함)
      const reason = newBlockedDate.startTime && newBlockedDate.endTime
        ? `${newBlockedDate.startTime}~${newBlockedDate.endTime} 예약 불가`
        : '예약 불가'

      const { error } = await settingsAPI.addBlockedDate(
        newBlockedDate.date,
        reason,
        regionCode,
        newBlockedDate.startTime || null,
        newBlockedDate.endTime || null
      )

      if (error) {
        showMessage('error', (error as any).message || '예약 불가 날짜 추가에 실패했습니다.')
        return
      }

      const successMsg = newBlockedDate.startTime && newBlockedDate.endTime
        ? `${newBlockedDate.date} ${newBlockedDate.startTime}~${newBlockedDate.endTime} 차단이 추가되었습니다.`
        : `${newBlockedDate.date} 전체 차단이 추가되었습니다.`

      showMessage('success', successMsg)
      setNewBlockedDate({ date: '', startTime: '', endTime: '' })
      loadBlockedDates()
    } catch (error) {
      showMessage('error', '예약 불가 날짜 추가 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const removeBlockedDate = async (dateId: number) => {
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

  // 일괄 차단 추가
  const addBulkBlockedDates = async () => {
    if (!bulkBlockData.startDate || !bulkBlockData.endDate) {
      showMessage('error', '시작일과 종료일을 모두 선택해주세요.')
      return
    }

    if (bulkBlockData.startDate > bulkBlockData.endDate) {
      showMessage('error', '종료일은 시작일보다 같거나 늦어야 합니다.')
      return
    }

    // 시간대 검증
    if ((bulkBlockData.startTime && !bulkBlockData.endTime) ||
        (!bulkBlockData.startTime && bulkBlockData.endTime)) {
      showMessage('error', '시작 시간과 종료 시간을 모두 입력하거나 모두 비워야 합니다.')
      return
    }

    if (bulkBlockData.startTime && bulkBlockData.endTime &&
        bulkBlockData.startTime >= bulkBlockData.endTime) {
      showMessage('error', '종료 시간은 시작 시간보다 늦어야 합니다.')
      return
    }

    const regionCode = activeTab
    setSaving(true)

    try {
      // 날짜 범위 내 모든 날짜 생성
      const dates: string[] = []
      const start = new Date(bulkBlockData.startDate)
      const end = new Date(bulkBlockData.endDate)

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay()
        // 주말 제외 옵션 체크 (0: 일요일, 6: 토요일)
        if (!bulkBlockData.includeWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
          continue
        }
        const dateStr = d.toISOString().split('T')[0]
        dates.push(dateStr)
      }

      if (dates.length === 0) {
        showMessage('error', '차단할 날짜가 없습니다.')
        setSaving(false)
        return
      }

      // 확인 메시지
      const timeInfo = bulkBlockData.startTime && bulkBlockData.endTime
        ? `${bulkBlockData.startTime}~${bulkBlockData.endTime}`
        : '전체 시간'

      if (!confirm(`${dates.length}개 날짜에 ${timeInfo} 차단을 추가하시겠습니까?`)) {
        setSaving(false)
        return
      }

      // 각 날짜에 차단 추가
      let successCount = 0
      let skipCount = 0

      for (const date of dates) {
        // 기존 차단 체크
        const sameDateBlocks = currentBlockedDates.filter(b => b.date === date)

        // 하루 전체 차단이 이미 있으면 건너뛰기
        if (sameDateBlocks.some(b => !b.start_time || !b.end_time)) {
          skipCount++
          continue
        }

        // 시간대 겹침 체크
        if (bulkBlockData.startTime && bulkBlockData.endTime) {
          let hasOverlap = false
          for (const existing of sameDateBlocks) {
            if (existing.start_time && existing.end_time) {
              if (isTimeOverlapping(
                bulkBlockData.startTime,
                bulkBlockData.endTime,
                existing.start_time.substring(0, 5),
                existing.end_time.substring(0, 5)
              )) {
                hasOverlap = true
                break
              }
            }
          }
          if (hasOverlap) {
            skipCount++
            continue
          }
        }

        const reason = bulkBlockData.startTime && bulkBlockData.endTime
          ? `${bulkBlockData.startTime}~${bulkBlockData.endTime} 예약 불가`
          : '예약 불가'

        const { error } = await settingsAPI.addBlockedDate(
          date,
          reason,
          regionCode,
          bulkBlockData.startTime || null,
          bulkBlockData.endTime || null
        )

        if (!error) {
          successCount++
        }
      }

      if (successCount > 0) {
        showMessage('success', `${successCount}개 날짜에 차단이 추가되었습니다.${skipCount > 0 ? ` (${skipCount}개 건너뜀)` : ''}`)
        setBulkBlockData({
          startDate: '',
          endDate: '',
          startTime: '',
          endTime: '',
          includeWeekends: true
        })
        loadBlockedDates()
      } else {
        showMessage('error', '추가된 차단이 없습니다. 이미 차단된 날짜일 수 있습니다.')
      }
    } catch (error) {
      showMessage('error', '일괄 차단 추가 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-')
    return `${year}-${month}-${day}`
  }

  // 시간 옵션 (09:00 ~ 17:00, 10분 단위) - 17:00이 마지막
  const timeOptions = [
    '09:00', '09:10', '09:20', '09:30', '09:40', '09:50',
    '10:00', '10:10', '10:20', '10:30', '10:40', '10:50',
    '11:00', '11:10', '11:20', '11:30', '11:40', '11:50',
    '12:00', '12:10', '12:20', '12:30', '12:40', '12:50',
    '13:00', '13:10', '13:20', '13:30', '13:40', '13:50',
    '14:00', '14:10', '14:20', '14:30', '14:40', '14:50',
    '15:00', '15:10', '15:20', '15:30', '15:40', '15:50',
    '16:00', '16:10', '16:20', '16:30', '16:40', '16:50',
    '17:00'
  ]

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

  const toggleTierReservationStatus = async (tierId: number, currentStatus: boolean) => {
    const regionCode = activeTab
    const yearMonth = `${currentYear}-${currentMonth.toString().padStart(2, '0')}`
    const normalizedTargetMonth = normalizeYearMonth(yearMonth)
    const currentActiveMonth = activeReservationMonth[activeTab] ?? null

    if (!currentStatus && normalizedTargetMonth && currentActiveMonth && currentActiveMonth !== normalizedTargetMonth) {
      const confirmed = confirm(buildReservationMonthTransitionMessage(currentActiveMonth, normalizedTargetMonth))
      if (!confirmed) {
        return
      }
    }

    setSaving(true)
    try {
      const { error } = await tierAPI.updateTierReservationStatus(
        regionCode,
        yearMonth,
        tierId,
        !currentStatus,
        adminInfo?.id || 'admin'
      )

      if (error) {
        showMessage('error', '티어 예약 상태 변경에 실패했습니다.')
        console.error('Update tier reservation error:', error)
        return
      }

      const tierName = tiers.find(t => t.id === tierId)?.tier_name || '티어'
      showMessage('success', `${tierName} 예약이 ${!currentStatus ? '시작' : '종료'}되었습니다.`)

      await Promise.all([loadTierData(), loadActiveReservationMonth(), loadSettings()])
    } catch (error) {
      showMessage('error', '티어 예약 상태 변경 중 오류가 발생했습니다.')
      console.error('Toggle tier reservation error:', error)
    } finally {
      setSaving(false)
    }
  }

  // 전체 예약 시작/종료
  const toggleAllTierReservations = async (shouldOpen: boolean) => {
    const regionCode = activeTab
    const yearMonth = `${currentYear}-${currentMonth.toString().padStart(2, '0')}`
    const normalizedTargetMonth = normalizeYearMonth(yearMonth)
    const currentActiveMonth = activeReservationMonth[activeTab] ?? null

    const confirmationMessage = shouldOpen && normalizedTargetMonth && currentActiveMonth && currentActiveMonth !== normalizedTargetMonth
      ? buildReservationMonthTransitionMessage(currentActiveMonth, normalizedTargetMonth)
      : `모든 티어의 예약을 ${shouldOpen ? '시작' : '종료'}하시겠습니까?`

    if (!confirm(confirmationMessage)) {
      return
    }

    setSaving(true)
    try {
      // 모든 티어에 대해 순차적으로 상태 변경
      for (const tier of tiers) {
        const { error } = await tierAPI.updateTierReservationStatus(
          regionCode,
          yearMonth,
          tier.id,
          shouldOpen,
          adminInfo?.id || 'admin'
        )

        if (error) {
          showMessage('error', `${tier.tier_name} 예약 상태 변경에 실패했습니다.`)
          console.error(`Update ${tier.tier_name} reservation error:`, error)
          // 에러가 나도 계속 진행
        }
      }

      showMessage('success', `모든 티어의 예약이 ${shouldOpen ? '시작' : '종료'}되었습니다.`)

      await Promise.all([loadTierData(), loadActiveReservationMonth(), loadSettings()])
    } catch (error) {
      showMessage('error', '전체 예약 상태 변경 중 오류가 발생했습니다.')
      console.error('Toggle all tier reservations error:', error)
    } finally {
      setSaving(false)
    }
  }

  const currentSettings = settings[activeTab] || { is_open: false, max_reservations_per_day: 2, max_days_per_month: 4 }
  const currentTierSettings = tierSettings[activeTab] || []

  // 현재 선택된 월에 해당하는 데이터만 필터링
  const currentBlockedDates = (blockedDates[activeTab] || []).filter(item => {
    const [year, month] = item.date.split('-').map(Number)
    return year === currentYear && month === currentMonth
  })
  const currentDailyLimits = (dailyLimits[activeTab] || []).filter(item => {
    const [year, month] = item.date.split('-').map(Number)
    return year === currentYear && month === currentMonth
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation adminRole={adminInfo?.role} />
      
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {adminInfo?.role === 'super'
              ? '지역별 예약 설정'
              : `경기${activeTab === 'south' ? '남부' : '북부'} 예약 설정`
            }
          </h1>
          <p className="text-gray-600 mt-2">
            {adminInfo?.role === 'super'
              ? '경기남부/북부 지역별로 예약 시스템을 관리합니다.'
              : `경기${activeTab === 'south' ? '남부' : '북부'} 지역의 예약 시스템을 관리합니다.`
            }
          </p>
        </div>

        {/* 지역 탭 - 슈퍼 관리자만 표시 */}
        {adminInfo?.role === 'super' && (
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
        )}

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

          {/* 티어별 예약 제어로 대체됨 */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">📋 안내</h3>
            <p className="text-sm text-blue-800">
              예약 제어는 아래 티어별 설정에서 각각 관리됩니다. Priority와 Standard 회원의 예약을 개별적으로 시작/종료할 수 있습니다.
            </p>
          </div>
        </div>

        {/* 전체 예약 제어 */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">전체 예약 제어</h2>
            <p className="text-sm text-gray-500 mt-1">모든 티어의 예약을 한 번에 시작하거나 종료합니다</p>
          </div>
          <div className="px-6 py-4">
            <div className="flex gap-4">
              <button
                onClick={() => toggleAllTierReservations(true)}
                disabled={saving}
                className="flex-1 flex items-center justify-center px-6 py-3 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg font-medium disabled:opacity-50 transition-colors"
              >
                <Play className="w-5 h-5 mr-2" />
                전체 예약 시작
              </button>
              <button
                onClick={() => toggleAllTierReservations(false)}
                disabled={saving}
                className="flex-1 flex items-center justify-center px-6 py-3 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg font-medium disabled:opacity-50 transition-colors"
              >
                <Pause className="w-5 h-5 mr-2" />
                전체 예약 종료
              </button>
            </div>
          </div>
        </div>

        {/* 티어별 예약 제어 */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">티어별 예약 제어</h2>
            <p className="text-sm text-gray-500 mt-1">회원 티어별로 예약 시작/종료를 개별 제어합니다</p>
          </div>
          <div className="px-6 py-4 space-y-4">
            {tiers.map((tier) => {
              const tierSetting = currentTierSettings.find(ts => ts.tier_id === tier.id)
              const isOpen = tierSetting?.is_open || false

              return (
                <div key={tier.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className={`w-3 h-3 rounded-full ${tier.tier_name === 'Priority' ? 'bg-yellow-400' : 'bg-gray-400'}`}></div>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {tier.tier_name === 'Priority' ? '🟡 Priority 회원' : '⚪ Standard 회원'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {tier.description}
                      </p>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className={`text-xs font-medium ${
                          isOpen ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {isOpen ? '✅ 예약 진행중' : '🔒 예약 종료됨'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleTierReservationStatus(tier.id, isOpen)}
                    disabled={saving}
                    className={`flex items-center px-4 py-2 rounded-lg font-medium ${
                      isOpen
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    } disabled:opacity-50`}
                  >
                    {isOpen ? (
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
              )
            })}

            {tiers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                티어 데이터를 불러오는 중...
              </div>
            )}
          </div>
        </div>

        {/* 기본 설정 */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              시스템 기본 설정
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              예약 시스템의 기본 규칙을 설정합니다.
            </p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  하루 최대 예약 수
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[1, 2, 3, 4, 5, 6].map((limit) => (
                    <button
                      key={limit}
                      onClick={() => updateDefaultLimit(limit)}
                      disabled={saving}
                      className={`px-3 py-2 rounded-lg font-medium text-sm ${
                        currentSettings.max_reservations_per_day === limit
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      } disabled:opacity-50 transition-all duration-200`}
                    >
                      {limit}개
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-3 flex items-center">
                  <Info className="w-4 h-4 mr-1" />
                  현재 예약 규칙
                </h3>
                <ul className="text-sm text-blue-800 space-y-2">
                  <li className="flex items-center">
                    <Calendar className="w-3 h-3 mr-2" />
                    월 최대 {currentSettings.max_days_per_month}일 예약 가능
                  </li>
                  <li className="flex items-center">
                    <Clock className="w-3 h-3 mr-2" />
                    일 최대 {currentSettings.max_reservations_per_day}타임 예약 가능
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* 특정일 예약관리 */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Users className="w-5 h-5 mr-2" />
              특정일 예약관리
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              특정 날짜별 예약 제한을 설정할 수 있습니다.
            </p>
          </div>
          
          {/* 특정일 제한 */}
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-md font-medium text-gray-900 mb-4 flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              특정일 제한
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
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
                  최대 예약수
                </label>
                <select
                  value={newDailyLimit.max_reservations}
                  onChange={(e) => setNewDailyLimit({...newDailyLimit, max_reservations: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <option key={num} value={num}>{num}개</option>
                  ))})
                </select>
              </div>
              <button
                onClick={addDailyLimit}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
              >
                <Plus className="w-4 h-4 mr-1" />
                설정 추가
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

        {/* 차단된 날짜 관리 */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <X className="w-5 h-5 mr-2" />
              예약 불가 날짜 관리
            </h2>
          </div>

          {/* 새 차단 날짜 추가 */}
          <div className="p-6 border-b border-gray-200">
            {/* 단일/일괄 모드 토글 */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-md font-medium text-gray-900">새 예약 불가 날짜/시간 추가</h3>
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setBulkBlockMode(false)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    !bulkBlockMode
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  단일 설정
                </button>
                <button
                  onClick={() => setBulkBlockMode(true)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    bulkBlockMode
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  일괄 설정
                </button>
              </div>
            </div>

            {/* 단일 설정 모드 */}
            {!bulkBlockMode && (
              <div className="space-y-4">
                <div className="flex gap-4 items-end flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      날짜 *
                    </label>
                    <input
                      type="date"
                      value={newBlockedDate.date}
                      onChange={(e) => setNewBlockedDate(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="w-[140px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      시작 시간
                    </label>
                    <select
                      value={newBlockedDate.startTime}
                      onChange={(e) => setNewBlockedDate(prev => ({ ...prev, startTime: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">선택 안함</option>
                      {timeOptions.map(time => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-[140px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      종료 시간
                    </label>
                    <select
                      value={newBlockedDate.endTime}
                      onChange={(e) => setNewBlockedDate(prev => ({ ...prev, endTime: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">선택 안함</option>
                      {timeOptions.map(time => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={addBlockedDate}
                    disabled={saving}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    추가
                  </button>
                </div>
                <p className="text-sm text-gray-500">
                  <Info className="w-4 h-4 inline mr-1" />
                  시간을 선택하지 않으면 해당 날짜 <strong>전체</strong>가 차단됩니다.
                </p>
              </div>
            )}

            {/* 일괄 설정 모드 */}
            {bulkBlockMode && (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-amber-800">
                    <Info className="w-4 h-4 inline mr-1" />
                    여러 날짜에 동일한 시간대를 한 번에 차단합니다. 예: 2/1~2/20 매일 11:40~13:20 차단
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      시작일 *
                    </label>
                    <input
                      type="date"
                      value={bulkBlockData.startDate}
                      onChange={(e) => setBulkBlockData(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      종료일 *
                    </label>
                    <input
                      type="date"
                      value={bulkBlockData.endDate}
                      onChange={(e) => setBulkBlockData(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      시작 시간
                    </label>
                    <select
                      value={bulkBlockData.startTime}
                      onChange={(e) => setBulkBlockData(prev => ({ ...prev, startTime: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">선택 안함</option>
                      {timeOptions.map(time => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      종료 시간
                    </label>
                    <select
                      value={bulkBlockData.endTime}
                      onChange={(e) => setBulkBlockData(prev => ({ ...prev, endTime: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">선택 안함</option>
                      {timeOptions.map(time => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={addBulkBlockedDates}
                    disabled={saving}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center whitespace-nowrap h-[42px]"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    일괄 추가
                  </button>
                </div>
                <div className="flex items-center gap-4 mt-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bulkBlockData.includeWeekends}
                      onChange={(e) => setBulkBlockData(prev => ({ ...prev, includeWeekends: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">주말(토/일) 포함</span>
                  </label>
                  <p className="text-sm text-gray-500">
                    시간을 선택하지 않으면 해당 기간의 모든 날짜가 <strong>전체 차단</strong>됩니다.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 차단된 날짜 목록 */}
          <div className="p-6">
            <h3 className="text-md font-medium text-gray-900 mb-4">예약 불가 날짜/시간 목록</h3>
            {currentBlockedDates.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>예약 불가 날짜가 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {currentBlockedDates.map((blockedDate) => (
                  <div key={blockedDate.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center gap-3">
                      <div className="font-medium text-red-900">
                        {formatDate(blockedDate.date)}
                      </div>
                      {blockedDate.start_time && blockedDate.end_time ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <Clock className="w-3 h-3 mr-1" />
                          {blockedDate.start_time.substring(0, 5)}~{blockedDate.end_time.substring(0, 5)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-200 text-red-900">
                          하루 전체
                        </span>
                      )}
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
