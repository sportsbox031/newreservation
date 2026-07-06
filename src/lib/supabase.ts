import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { getErrorMessage, withTimeout } from '@/lib/requestUtils'
import {
  clearDashboardClientCaches,
  getDashboardCalendarClientCacheKey,
  getDashboardBootstrapClientCacheTtl,
  getDashboardMeClientCacheKey,
} from '@/lib/dashboardBootstrap'
import { mapReservationErrorMessage } from '@/lib/reservationMessages'
import { authApiClient } from '@/lib/authApiClient'
import { buildCookieFirstClientHeaders } from '@/lib/clientAuthHeaders'
import { getCookieFirstClientSessionScope } from '@/lib/clientSessionIdentity'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false
  }
})

const QUERY_TIMEOUT_MS = 8000
const LONG_QUERY_TIMEOUT_MS = 12000
const MUTATION_TIMEOUT_MS = 15000
const regionIdCache = new Map<string, number>()

function timeoutError(message: string) {
  return { message }
}

async function runQueryWithTimeout<T>(promise: PromiseLike<T>, message: string, timeoutMs = QUERY_TIMEOUT_MS): Promise<T> {
  return withTimeout(promise, timeoutMs, message)
}

// 인증 헤더 생성 헬퍼 함수
function getAuthHeaders(): HeadersInit {
  return buildCookieFirstClientHeaders()
}

// 회원 관련 함수들
export const memberAPI = {
  // 회원가입
  async register(userData: {
    organization_type: 'school' | 'welfare';
    organization_name: string;
    password: string;
    manager_name: string;
    city_name: string;
    phone: string;
    email: string;
    student_count: number;
    class_count: number;
    privacy_consent: boolean;
  }) {
    return authApiClient.register(userData)
  },

  // 로그인 (하이브리드: bcrypt + 레거시 btoa 지원)
  async login(organization_name: string, password: string) {
    return authApiClient.loginUser(organization_name, password)
  },

  // 승인 대기 회원 목록 조회
  async getPendingMembers(regionCode?: string) {
    try {
      const query = new URLSearchParams({ status: 'pending' })
      if (regionCode) {
        query.set('regionCode', regionCode)
      }

      const response = await fetch(`/api/admin/members?${query.toString()}`, {
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { data: null, error: errorData.error || { message: '승인 대기 회원을 불러오지 못했습니다.' } }
      }

      const data = await response.json()
      return { data: data.data, error: null }
    } catch (error) {
      return { data: null, error: timeoutError(getErrorMessage(error, '승인 대기 회원을 불러오는 중 오류가 발생했습니다.')) }
    }
  },

  // 승인된 회원 목록 조회
  async getApprovedMembers(regionCode?: string) {
    try {
      const query = new URLSearchParams({ status: 'approved' })
      if (regionCode) {
        query.set('regionCode', regionCode)
      }

      const response = await fetch(`/api/admin/members?${query.toString()}`, {
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { data: null, error: errorData.error || { message: '승인된 회원을 불러오지 못했습니다.' } }
      }

      const data = await response.json()
      return { data: data.data, error: null }
    } catch (error) {
      return { data: null, error: timeoutError(getErrorMessage(error, '승인된 회원을 불러오는 중 오류가 발생했습니다.')) }
    }
  },

  // 모든 회원 조회 (관리자용)
  async getAllMembers() {
    try {
      const response = await fetch('/api/admin/members', {
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { data: null, error: errorData.error || { message: '회원 목록을 불러오지 못했습니다.' } }
      }

      const data = await response.json()
      return { data: data.data, error: null }
    } catch (error) {
      return { data: null, error: { message: getErrorMessage(error, '회원 목록을 불러오지 못했습니다.') } }
    }
  },

  // 지역별 회원 조회 (관리자용)
  async getAllMembersForRegion(regionCode: string) {
    try {
      const response = await fetch(`/api/admin/members?regionCode=${regionCode}`, {
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { data: null, error: errorData.error || { message: '회원 목록을 불러오지 못했습니다.' } }
      }

      const data = await response.json()
      return { data: data.data, error: null }
    } catch (error) {
      return { data: null, error: { message: getErrorMessage(error, '회원 목록을 불러오지 못했습니다.') } }
    }
  },

  // 지역별 대기 중인 회원 목록 조회 (편의 함수)
  async getPendingMembersForRegion(regionCode: string) {
    return await this.getPendingMembers(regionCode)
  },

  // 지역별 승인된 회원 목록 조회 (편의 함수)
  async getApprovedMembersForRegion(regionCode: string) {
    return await this.getApprovedMembers(regionCode)
  },

  // 회원 승인/거부
  async updateMemberStatus(userId: string, status: 'approved' | 'rejected') {
    try {
      const response = await fetch('/api/admin/members', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: 'status',
          memberId: userId,
          status,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { data: null, error: errorData.error || { message: '회원 상태 변경에 실패했습니다.' } }
      }

      const data = await response.json()
      return { data: data.data, error: null }
    } catch (error) {
      return { data: null, error: { message: getErrorMessage(error, '회원 상태 변경에 실패했습니다.') } }
    }
  },

  // 비밀번호 초기화 (관리자용)
  async resetPassword(userId: string, newPassword: string) {
    try {
      const response = await fetch('/api/admin/members', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: 'reset_password',
          memberId: userId,
          newPassword,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { data: null, error: errorData.error || { message: '비밀번호 초기화에 실패했습니다.' } }
      }

      const data = await response.json()
      return { data: data.data, error: null }
    } catch (error) {
      return { data: null, error: { message: getErrorMessage(error, '비밀번호 초기화에 실패했습니다.') } }
    }
  },

  // 회원 삭제 (관리자용) - 관련 데이터 모두 삭제
  async deleteMember(userId: string) {
    try {
      const response = await fetch(`/api/admin/members?memberId=${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { data: null, error: errorData.error || { message: '회원 삭제에 실패했습니다.' } }
      }

      const data = await response.json()
      return { data: data.data, error: null }
    } catch (error) {
      console.error('회원 삭제 중 오류:', error)
      return { data: null, error: { message: getErrorMessage(error, '회원 삭제에 실패했습니다.') } }
    }
  },

  // 사용자 정보 업데이트 (티어는 자동으로 변경되지 않음)
  async updateUserInfo(userId: string, updateData: {
    manager_name?: string;
    phone?: string;
    email?: string;
    student_count?: number;
    class_count?: number;
  }) {
    try {
      const response = await fetch('/api/account/user', {
        method: 'PATCH',
        headers: getUserAuthHeaders(),
        body: JSON.stringify({
          action: 'profile',
          ...updateData,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { data: null, error: errorData.error || { message: '사용자 정보 업데이트에 실패했습니다.' } }
      }

      const data = await response.json()
      return { data: data.data, error: null }
    } catch (error) {
      return { data: null, error: { message: getErrorMessage(error, '사용자 정보 업데이트에 실패했습니다.') } }
    }
  },

  // 비밀번호 변경 (현재 비밀번호 확인 필요)
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    try {
      const response = await fetch('/api/account/user', {
        method: 'PATCH',
        headers: getUserAuthHeaders(),
        body: JSON.stringify({
          action: 'password',
          currentPassword,
          newPassword,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { data: null, error: errorData.error || { message: '비밀번호 변경에 실패했습니다.' } }
      }

      const data = await response.json()
      return { data: data.data, error: null }
    } catch (error) {
      return { data: null, error: { message: getErrorMessage(error, '비밀번호 변경에 실패했습니다.') } }
    }
  },

  // 회원 등급 변경
  async updateMemberTier(userId: string, tier: 'Priority' | 'Standard') {
    try {
      const response = await fetch('/api/admin/members', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: 'tier',
          memberId: userId,
          tier,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { data: null, error: errorData.error || { message: '회원 등급 변경에 실패했습니다.' } }
      }

      const data = await response.json()
      return { data: data.data, error: null }
    } catch (error) {
      return { data: null, error: { message: getErrorMessage(error, '회원 등급 변경에 실패했습니다.') } }
    }
  },
}



// 설정 관련 함수들
export const settingsAPI = {
  // 지역 ID 조회 헬퍼
  async getRegionId(regionCode: string): Promise<number | null> {
    const cachedRegionId = regionIdCache.get(regionCode)
    if (cachedRegionId) {
      return cachedRegionId
    }

    const { data, error } = await runQueryWithTimeout(
      supabase
        .from('regions')
        .select('id')
        .eq('code', regionCode)
        .single(),
      '지역 정보를 불러오는 중 시간이 초과되었습니다.'
    )
    
    if (error) return null
    regionIdCache.set(regionCode, data.id)
    return data.id
  },

  // 차단된 날짜 목록 조회
  async getBlockedDates(regionCode: string) {
    if (typeof window !== 'undefined') {
      try {
        const isAdminRequest = typeof localStorage !== 'undefined' && !!localStorage.getItem('adminInfo')
        const query = new URLSearchParams({ action: 'blocked-dates' })
        if (isAdminRequest) {
          query.set('regionCode', regionCode)
        }

        const response = await fetch(`${isAdminRequest ? '/api/admin/settings' : '/api/user/settings'}?${query.toString()}`, {
          headers: isAdminRequest ? getAuthHeaders() : getUserAuthHeaders(),
        })

        if (!response.ok) {
          const errorData = await response.json()
          return { data: null, error: errorData.error || { message: '차단 일정을 불러오지 못했습니다.' } }
        }

        const data = await response.json()
        return { data: data.data, error: null }
      } catch (error) {
        return { data: null, error: timeoutError(getErrorMessage(error, '차단 일정을 불러오는 중 오류가 발생했습니다.')) }
      }
    }

    const regionId = await this.getRegionId(regionCode)
    if (!regionId) {
      return { data: null, error: { message: '존재하지 않는 지역입니다.' } }
    }

    try {
      const { data, error } = await runQueryWithTimeout(
        supabase
          .from('blocked_dates')
          .select('date, start_time, end_time, reason, id')
          .eq('region_id', regionId),
        '차단 일정을 불러오는 중 시간이 초과되었습니다.'
      )

      return { data, error }
    } catch (error) {
      return { data: null, error: timeoutError(getErrorMessage(error, '차단 일정을 불러오는 중 오류가 발생했습니다.')) }
    }
  },

  // 차단된 날짜 추가 (지역별) - 시간대별 차단 지원
  async addBlockedDate(
    date: string,
    reason: string,
    regionCode: string,
    startTime?: string | null,  // HH:MM 형식, null이면 하루 전체 차단
    endTime?: string | null     // HH:MM 형식, null이면 하루 전체 차단
  ) {
    if (typeof window !== 'undefined') {
      try {
        const response = await fetch('/api/admin/settings', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            regionCode,
            date,
            reason,
            start_time: startTime || null,
            end_time: endTime || null,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          return { data: null, error: errorData.error || { message: '차단 일정 추가에 실패했습니다.' } }
        }

        const payload = await response.json()
        return { data: payload.data, error: null }
      } catch (error) {
        return { data: null, error: timeoutError(getErrorMessage(error, '차단 일정 추가 중 오류가 발생했습니다.')) }
      }
    }

    const regionId = await this.getRegionId(regionCode)
    if (!regionId) {
      return { data: null, error: { message: '존재하지 않는 지역입니다.' } }
    }

    // 시간대 검증: 둘 다 있거나 둘 다 없어야 함
    if ((startTime && !endTime) || (!startTime && endTime)) {
      return { data: null, error: { message: '시작 시간과 종료 시간을 모두 입력하거나 모두 비워야 합니다.' } }
    }

    // 시간 순서 검증
    if (startTime && endTime && startTime >= endTime) {
      return { data: null, error: { message: '종료 시간은 시작 시간보다 늦어야 합니다.' } }
    }

    const { data, error } = await supabase
      .from('blocked_dates')
      .insert([{
        region_id: regionId,
        date,
        reason,
        start_time: startTime || null,
        end_time: endTime || null
      }])
      .select()

    return { data, error }
  },

  // 차단된 날짜 제거 (ID로)
  async removeBlockedDate(dateId: number) {
    if (typeof window !== 'undefined') {
      try {
        const response = await fetch(`/api/admin/settings?action=blocked-date&id=${dateId}`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        })

        if (!response.ok) {
          const errorData = await response.json()
          return { data: null, error: errorData.error || { message: '차단 일정 삭제에 실패했습니다.' } }
        }

        const payload = await response.json()
        return { data: payload.data, error: null }
      } catch (error) {
        return { data: null, error: timeoutError(getErrorMessage(error, '차단 일정 삭제 중 오류가 발생했습니다.')) }
      }
    }

    const { data, error } = await supabase
      .from('blocked_dates')
      .delete()
      .eq('id', dateId)

    return { data, error }
  },

  // 예약 설정 조회
  async getReservationSettings(regionCode: string, year: number, month: number) {
    if (typeof window !== 'undefined') {
      try {
        const query = new URLSearchParams({
          action: 'reservation-settings',
          regionCode,
          year: String(year),
          month: String(month),
        })
        const response = await fetch(`/api/admin/settings?${query.toString()}`, {
          headers: getAuthHeaders(),
        })

        if (!response.ok) {
          const errorData = await response.json()
          return { data: null, error: errorData.error || { message: '예약 설정을 불러오지 못했습니다.' } }
        }

        const payload = await response.json()
        return { data: payload.data, error: null }
      } catch (error) {
        return {
          data: {
            is_open: false,
            max_reservations_per_day: 2,
            max_days_per_month: 4
          },
          error: timeoutError(getErrorMessage(error, '예약 설정을 불러오는 중 오류가 발생했습니다.'))
        }
      }
    }

    const regionId = await this.getRegionId(regionCode)
    if (!regionId) {
      return { data: null, error: { message: '존재하지 않는 지역입니다.' } }
    }

    let data
    let error
    try {
      const response = await runQueryWithTimeout(
        supabase
          .from('reservation_settings')
          .select('*')
          .eq('region_id', regionId)
          .eq('year', year)
          .eq('month', month)
          .single(),
        '예약 설정을 불러오는 중 시간이 초과되었습니다.'
      )
      data = response.data
      error = response.error
    } catch (requestError) {
      console.error('예약 설정 조회 타임아웃:', requestError)
      return {
        data: {
          is_open: false,
          max_reservations_per_day: 2,
          max_days_per_month: 4
        },
        error: timeoutError(getErrorMessage(requestError, '예약 설정을 불러오는 중 오류가 발생했습니다.'))
      }
    }

    // 데이터가 없으면 기본값 생성
    if (error && error.code === 'PGRST116') {
      // 설정이 없으면 자동으로 기본값 생성 (로그 제거)
      
      // 기본 설정 생성
      const { data: newData, error: createError } = await this.updateReservationSettings(
        regionCode, year, month, {
          is_open: false, // 예약 종료가 기본값 (관리자가 수동으로 열어야 함)
          max_reservations_per_day: 2,
          max_days_per_month: 4
        }
      )
      
      if (createError) {
        console.error('기본 설정 생성 실패:', createError)
        return { 
          data: {
            is_open: false, // 예약 종료가 기본값 (관리자가 수동으로 열어야 함)
            max_reservations_per_day: 2,
            max_days_per_month: 4
          }, 
          error: null 
        }
      }
      
      return { data: newData?.[0] || {
        is_open: false, // 예약 종료가 기본값 (관리자가 수동으로 열어야 함)
        max_reservations_per_day: 2,
        max_days_per_month: 4
      }, error: null }
    }
    
    // 다른 오류가 있는 경우 기본값 반환
    if (error) {
      console.error('예약 설정 조회 오류:', error)
      return { 
        data: {
          is_open: false, // 예약 종료가 기본값 (관리자가 수동으로 열어야 함)
          max_reservations_per_day: 2,
          max_days_per_month: 4
        }, 
        error: null 
      }
    }

    return { data, error }
  },

  // 예약 설정 업데이트
  async updateReservationSettings(
    regionCode: string,
    year: number,
    month: number,
    settings: {
      is_open?: boolean;
      max_reservations_per_day?: number;
      max_days_per_month?: number;
    }
  ) {
    if (typeof window !== 'undefined') {
      try {
        const response = await fetch('/api/admin/settings', {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            action: 'reservation-settings',
            regionCode,
            year,
            month,
            ...settings,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          return { data: null, error: errorData.error || { message: '예약 설정 업데이트에 실패했습니다.' } }
        }

        const payload = await response.json()
        return { data: payload.data, error: null }
      } catch (error) {
        return { data: null, error: { message: getErrorMessage(error, '예약 설정 업데이트 중 오류가 발생했습니다.') } }
      }
    }

    const regionId = await this.getRegionId(regionCode)
    if (!regionId) {
      return { data: null, error: { message: '존재하지 않는 지역입니다.' } }
    }

    try {
      const { data, error } = await supabase
        .from('reservation_settings')
        .upsert([{
          region_id: regionId,
          year,
          month,
          is_open: settings.is_open ?? false, // 예약 종료가 기본값
          max_reservations_per_day: settings.max_reservations_per_day ?? 2,
          max_days_per_month: settings.max_days_per_month ?? 4
        }], {
          onConflict: 'region_id,year,month'
        })
        .select()

      return { data, error }
      
    } catch (err) {
      console.error('예약 설정 업데이트 예외:', err)
      return { data: null, error: { message: '예약 설정 업데이트 중 오류가 발생했습니다.' } }
    }
  },

  // 특정 날짜의 예약 현황 조회
  async getDateReservationStatus(regionCode: string, date: string) {
    if (typeof window !== 'undefined') {
      try {
        const query = new URLSearchParams({
          action: 'date-status',
          date,
        })
        const response = await fetch(`/api/user/settings?${query.toString()}`, {
          headers: getUserAuthHeaders(),
        })

        if (!response.ok) {
          const errorData = await response.json()
          return { data: null, error: errorData.error || { message: '해당 날짜의 예약 현황을 불러오지 못했습니다.' } }
        }

        const payload = await response.json()
        return { data: payload.data, error: null }
      } catch (error) {
        return { data: null, error: timeoutError(getErrorMessage(error, '해당 날짜의 예약 현황을 불러오는 중 오류가 발생했습니다.')) }
      }
    }

    const regionId = await this.getRegionId(regionCode)
    if (!regionId) {
      return { data: null, error: { message: '존재하지 않는 지역입니다.' } }
    }

    let reservations
    let reservationError
    try {
      const response = await runQueryWithTimeout(
        supabase
          .from('reservations')
          .select('id')
          .eq('region_id', regionId)
          .eq('date', date)
          .in('status', ['pending', 'approved', 'cancel_requested']),
        '해당 날짜의 예약 현황을 불러오는 중 시간이 초과되었습니다.'
      )
      reservations = response.data
      reservationError = response.error
    } catch (error) {
      return { data: null, error: timeoutError(getErrorMessage(error, '해당 날짜의 예약 현황을 불러오는 중 오류가 발생했습니다.')) }
    }

    if (reservationError) {
      return { data: null, error: reservationError }
    }

    const currentReservations = reservations?.length || 0

    // 먼저 해당 날짜의 특정 제한이 있는지 확인
    const { data: dailyLimit } = await this.getDailyReservationLimit(regionCode, date)
    
    let maxReservationsPerDay: number
    let isOpen: boolean

    if (dailyLimit) {
      // 특정 날짜 설정이 있으면 그것을 사용
      maxReservationsPerDay = dailyLimit.max_reservations
      isOpen = dailyLimit.max_reservations > 0 // 0이면 예약 금지
    } else {
      // 특정 설정이 없으면 월별 기본 설정 확인
      const targetDate = new Date(date)
      const year = targetDate.getFullYear()
      const month = targetDate.getMonth() + 1

      const { data: settings } = await this.getReservationSettings(regionCode, year, month)
      maxReservationsPerDay = settings?.max_reservations_per_day || 2
      isOpen = settings?.is_open ?? true // 기본값은 예약 오픈
    }

    return {
      data: {
        current_reservations: currentReservations,
        max_reservations_per_day: maxReservationsPerDay,
        is_full: currentReservations >= maxReservationsPerDay,
        available_slots: Math.max(0, maxReservationsPerDay - currentReservations),
        is_open: isOpen
      },
      error: null
    }
  },

  // 월별 예약 현황 일괄 조회 (성능 최적화)
  async getMonthReservationStatus(regionCode: string, year: number, month: number) {
    if (typeof window !== 'undefined') {
      try {
        const isAdminRequest = typeof localStorage !== 'undefined' && !!localStorage.getItem('adminInfo')
        const headers = isAdminRequest ? getAuthHeaders() : getUserAuthHeaders()
        const query = new URLSearchParams({
          action: 'month-status',
          year: String(year),
          month: String(month),
        })

        if (isAdminRequest) {
          query.set('regionCode', regionCode)
        }

        const response = await fetch(`${isAdminRequest ? '/api/admin/settings' : '/api/user/settings'}?${query.toString()}`, {
          headers,
        })

        if (!response.ok) {
          const errorData = await response.json()
          return { data: null, error: errorData.error || { message: '월별 예약 현황을 불러오지 못했습니다.' } }
        }

        const payload = await response.json()
        return { data: payload.data, error: null }
      } catch (error) {
        return { data: null, error: timeoutError(getErrorMessage(error, '월별 예약 현황을 불러오는 중 오류가 발생했습니다.')) }
      }
    }

    const regionId = await this.getRegionId(regionCode)
    if (!regionId) {
      return { data: null, error: { message: '존재하지 않는 지역입니다.' } }
    }

    // 해당 월의 모든 예약 수 조회 (한 번의 쿼리로)
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    try {
      const [{ data: reservations, error: reservationError }, { data: settings, error: settingsError }, { data: dailyLimits, error: dailyLimitsError }] = await Promise.all([
        runQueryWithTimeout(
          supabase
            .from('reservations')
            .select('date')
            .eq('region_id', regionId)
            .gte('date', startDate)
            .lte('date', endDate)
            .in('status', ['pending', 'approved', 'cancel_requested']),
          '월별 예약 현황을 불러오는 중 시간이 초과되었습니다.',
          LONG_QUERY_TIMEOUT_MS
        ),
        this.getReservationSettings(regionCode, year, month),
        runQueryWithTimeout(
          supabase
            .from('daily_reservation_limits')
            .select('date, max_reservations')
            .eq('region_id', regionId)
            .gte('date', startDate)
            .lte('date', endDate),
          '일별 예약 제한을 불러오는 중 시간이 초과되었습니다.'
        )
      ])

      if (reservationError) {
        return { data: null, error: reservationError }
      }

      if (settingsError) {
        return { data: null, error: settingsError }
      }

      if (dailyLimitsError) {
        return { data: null, error: dailyLimitsError }
      }

      const reservationCounts: Record<string, number> = {}
      reservations?.forEach(reservation => {
        const reservationDate = reservation.date
        reservationCounts[reservationDate] = (reservationCounts[reservationDate] || 0) + 1
      })

      const defaultMaxReservations = settings?.max_reservations_per_day || 2
      const defaultIsOpen = settings?.is_open ?? false

      const dailyLimitMap: Record<string, number> = {}
      dailyLimits?.forEach(limit => {
        dailyLimitMap[limit.date] = limit.max_reservations
      })

      const result: Record<string, {
        current_reservations: number
        max_reservations_per_day: number
        is_full: boolean
        available_slots: number
        is_open: boolean
      }> = {}

      for (let day = 1; day <= lastDay; day++) {
        const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        const currentReservations = reservationCounts[dateString] || 0
        const hasDailyLimit = Object.prototype.hasOwnProperty.call(dailyLimitMap, dateString)
        const maxReservations = hasDailyLimit ? dailyLimitMap[dateString] : defaultMaxReservations
        const isOpen = hasDailyLimit ? maxReservations > 0 : defaultIsOpen

        result[dateString] = {
          current_reservations: currentReservations,
          max_reservations_per_day: maxReservations,
          is_full: currentReservations >= maxReservations,
          available_slots: Math.max(0, maxReservations - currentReservations),
          is_open: isOpen
        }
      }

      return { data: result, error: null }
    } catch (error) {
      return { data: null, error: timeoutError(getErrorMessage(error, '월별 예약 현황을 불러오는 중 오류가 발생했습니다.')) }
    }
  },

  // 특정 날짜 예약 제한 설정
  async setDailyReservationLimit(regionCode: string, date: string, maxReservations: number) {
    if (typeof window !== 'undefined') {
      try {
        const response = await fetch('/api/admin/settings', {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            action: 'daily-limit',
            regionCode,
            date,
            max_reservations: maxReservations,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          return { data: null, error: errorData.error || { message: '특정일 예약 제한 설정에 실패했습니다.' } }
        }

        const payload = await response.json()
        return { data: payload.data, error: null }
      } catch (error) {
        return { data: null, error: { message: getErrorMessage(error, '특정일 예약 제한 설정 중 오류가 발생했습니다.') } }
      }
    }

    const regionId = await this.getRegionId(regionCode)
    if (!regionId) {
      return { data: null, error: { message: '존재하지 않는 지역입니다.' } }
    }

    const { data, error } = await supabase
      .from('daily_reservation_limits')
      .upsert([{
        region_id: regionId,
        date,
        max_reservations: maxReservations,
        updated_at: new Date().toISOString()
      }], {
        onConflict: 'region_id,date'
      })
      .select()

    return { data, error }
  },

  // 특정 날짜 예약 제한 조회
  async getDailyReservationLimit(regionCode: string, date: string) {
    const regionId = await this.getRegionId(regionCode)
    if (!regionId) {
      return { data: null, error: { message: '존재하지 않는 지역입니다.' } }
    }

    let data
    let error
    try {
      const response = await runQueryWithTimeout(
        supabase
          .from('daily_reservation_limits')
          .select('*')
          .eq('region_id', regionId)
          .eq('date', date),
        '일별 예약 제한을 불러오는 중 시간이 초과되었습니다.'
      )
      data = response.data
      error = response.error
    } catch (requestError) {
      return { data: null, error: timeoutError(getErrorMessage(requestError, '일별 예약 제한을 불러오는 중 오류가 발생했습니다.')) }
    }

    // 데이터가 없는 것은 정상 (특정날짜 설정이 없음을 의미)
    if (!data || data.length === 0) {
      return { data: null, error: null }
    }

    return { data: data[0], error }
  },

  // 지역의 모든 특정 날짜 예약 제한 조회
  async getAllDailyReservationLimits(regionCode: string) {
    if (typeof window !== 'undefined') {
      try {
        const query = new URLSearchParams({
          action: 'daily-limits',
          regionCode,
        })
        const response = await fetch(`/api/admin/settings?${query.toString()}`, {
          headers: getAuthHeaders(),
        })

        if (!response.ok) {
          const errorData = await response.json()
          return { data: null, error: errorData.error || { message: '특정일 예약 제한을 불러오지 못했습니다.' } }
        }

        const payload = await response.json()
        return { data: payload.data, error: null }
      } catch (error) {
        return { data: null, error: { message: getErrorMessage(error, '특정일 예약 제한을 불러오는 중 오류가 발생했습니다.') } }
      }
    }

    const regionId = await this.getRegionId(regionCode)
    if (!regionId) {
      return { data: null, error: { message: '존재하지 않는 지역입니다.' } }
    }

    const { data, error } = await supabase
      .from('daily_reservation_limits')
      .select('*')
      .eq('region_id', regionId)
      .gt('max_reservations', 0) // 0개 제한은 제외 (삭제된 것으로 간주)
      .order('date')

    return { data, error }
  },

  // 특정 날짜 예약 제한 제거
  async removeDailyReservationLimit(regionCode: string, date: string) {
    if (typeof window !== 'undefined') {
      try {
        const query = new URLSearchParams({
          action: 'daily-limit',
          regionCode,
          date,
        })
        const response = await fetch(`/api/admin/settings?${query.toString()}`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        })

        if (!response.ok) {
          const errorData = await response.json()
          return { data: null, error: errorData.error || { message: '특정일 예약 제한 삭제에 실패했습니다.' } }
        }

        const payload = await response.json()
        return { data: payload.data, error: null }
      } catch (error) {
        return { data: null, error: { message: getErrorMessage(error, '특정일 예약 제한 삭제 중 오류가 발생했습니다.') } }
      }
    }

    const regionId = await this.getRegionId(regionCode)
    if (!regionId) {
      return { data: null, error: { message: '존재하지 않는 지역입니다.' } }
    }

    const { data, error } = await supabase
      .from('daily_reservation_limits')
      .delete()
      .eq('region_id', regionId)
      .eq('date', date)

    return { data, error }
  }
}

// 예약 관련 함수들
export const reservationAPI = {
  async submitReservation(regionId: number, date: string, slots: Array<{
    start_time: string
    end_time: string
    grade: string
    participant_count: number
    location: string
    slot_order: number
  }>) {
    try {
      const response = await withTimeout(
        fetch('/api/reservations', {
          method: 'POST',
          headers: getUserAuthHeaders(),
          body: JSON.stringify({
            regionId,
            date,
            slots
          })
        }),
        MUTATION_TIMEOUT_MS,
        '예약 요청 처리 시간이 초과되었습니다.'
      )

      const result = await response.json()

      if (!response.ok) {
        return {
          data: null,
          error: { message: mapReservationErrorMessage(result.error || '예약 신청에 실패했습니다.') }
        }
      }

      return { data: result.data, error: null }
    } catch (error) {
      return {
        data: null,
        error: { message: getErrorMessage(error, '예약 신청 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.') }
      }
    }
  },

  // 승인 대기 예약 목록 조회
  async getPendingReservations(regionCode?: string) {
    if (typeof window !== 'undefined') {
      try {
        const query = new URLSearchParams({ scope: 'pending' })
        if (regionCode) {
          query.set('regionCode', regionCode)
        }
        const response = await fetch(`/api/admin/reservations?${query.toString()}`, {
          headers: getAuthHeaders(),
        })

        if (!response.ok) {
          const errorData = await response.json()
          return { data: null, error: errorData.error || { message: '승인 대기 예약을 불러오지 못했습니다.' } }
        }

        const payload = await response.json()
        return { data: payload.data, error: null }
      } catch (error) {
        return { data: null, error: timeoutError(getErrorMessage(error, '승인 대기 예약을 불러오는 중 오류가 발생했습니다.')) }
      }
    }

    let query = supabase
      .from('reservations')
      .select(`
        *,
        users!inner(
          organization_name,
          manager_name,
          phone,
          email,
          cities!inner(name, regions!inner(name, code))
        ),
        reservation_slots(*),
        regions!inner(name, code)
      `)
      .eq('status', 'pending')

    if (regionCode) {
      query = query.eq('users.cities.regions.code', regionCode)
    }

    try {
      const { data, error } = await runQueryWithTimeout(
        query,
        '승인 대기 예약을 불러오는 중 시간이 초과되었습니다.',
        LONG_QUERY_TIMEOUT_MS
      )
      return { data, error }
    } catch (error) {
      return { data: null, error: timeoutError(getErrorMessage(error, '승인 대기 예약을 불러오는 중 오류가 발생했습니다.')) }
    }
  },

  // 승인된 예약 목록 조회
  async getApprovedReservations(regionCode?: string) {
    if (typeof window !== 'undefined') {
      try {
        const query = new URLSearchParams({ scope: 'approved' })
        if (regionCode) {
          query.set('regionCode', regionCode)
        }
        const response = await fetch(`/api/admin/reservations?${query.toString()}`, {
          headers: getAuthHeaders(),
        })

        if (!response.ok) {
          const errorData = await response.json()
          return { data: null, error: errorData.error || { message: '승인된 예약을 불러오지 못했습니다.' } }
        }

        const payload = await response.json()
        return { data: payload.data, error: null }
      } catch (error) {
        return { data: null, error: timeoutError(getErrorMessage(error, '승인된 예약을 불러오는 중 오류가 발생했습니다.')) }
      }
    }

    let query = supabase
      .from('reservations')
      .select(`
        *,
        users!inner(
          organization_name,
          manager_name,
          phone,
          email,
          cities!inner(name, regions!inner(name, code))
        ),
        reservation_slots(*),
        regions!inner(name, code)
      `)
      .eq('status', 'approved')

    if (regionCode) {
      query = query.eq('users.cities.regions.code', regionCode)
    }

    try {
      const { data, error } = await runQueryWithTimeout(
        query,
        '승인된 예약을 불러오는 중 시간이 초과되었습니다.',
        LONG_QUERY_TIMEOUT_MS
      )
      return { data, error }
    } catch (error) {
      return { data: null, error: timeoutError(getErrorMessage(error, '승인된 예약을 불러오는 중 오류가 발생했습니다.')) }
    }
  },

  // 지역별 모든 예약 조회 (관리자용)
  async getAllReservationsForRegion(regionCode: string) {
    if (typeof window !== 'undefined') {
      try {
        const query = new URLSearchParams({ scope: 'all', regionCode })
        const response = await fetch(`/api/admin/reservations?${query.toString()}`, {
          headers: getAuthHeaders(),
        })

        if (!response.ok) {
          const errorData = await response.json()
          return { data: null, error: errorData.error || { message: '예약 목록을 불러오지 못했습니다.' } }
        }

        const payload = await response.json()
        return { data: payload.data, error: null }
      } catch (error) {
        return { data: null, error: { message: getErrorMessage(error, '예약 목록을 불러오지 못했습니다.') } }
      }
    }

    let query = supabase
      .from('reservations')
      .select(`
        *,
        users!inner(
          id,
          organization_name,
          manager_name,
          phone,
          email,
          cities!inner(name, regions!inner(name, code))
        ),
        reservation_slots(
          id,
          start_time,
          end_time,
          grade,
          participant_count,
          location,
          slot_order
        )
      `)
      .eq('users.cities.regions.code', regionCode)
      .order('created_at', { ascending: false })

    const { data, error } = await query
    return { data, error }
  },

  // 지역별 대기 중인 예약 목록 조회 (편의 함수)
  async getPendingReservationsForRegion(regionCode: string) {
    return await this.getPendingReservations(regionCode)
  },

  // 지역별 승인된 예약 목록 조회 (편의 함수)
  async getApprovedReservationsForRegion(regionCode: string) {
    return await this.getApprovedReservations(regionCode)
  },

  // 예약 승인/거부/취소
  async updateReservationStatus(reservationId: string, status: 'approved' | 'rejected' | 'cancelled') {
    if (typeof window !== 'undefined') {
      try {
        const response = await fetch('/api/admin/reservations', {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            action: 'status',
            reservationId,
            status,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          return { data: null, error: errorData.error || { message: '예약 상태 변경에 실패했습니다.' } }
        }

        const payload = await response.json()
        return { data: payload.data, error: null }
      } catch (error) {
        return { data: null, error: { message: getErrorMessage(error, '예약 상태 변경에 실패했습니다.') } }
      }
    }

    const { data, error } = await supabase
      .from('reservations')
      .update({ status })
      .eq('id', reservationId)
      .select()

    return { data, error }
  },

  // 예약 완전 삭제 (거절, 취소 시 사용)
  async deleteReservation(reservationId: string) {
    if (typeof window !== 'undefined') {
      try {
        const isAdminRequest = typeof localStorage !== 'undefined' && !!localStorage.getItem('adminInfo')
        const response = await fetch(
          `${isAdminRequest ? '/api/admin/reservations' : '/api/user/reservations'}?reservationId=${reservationId}`,
          {
            method: 'DELETE',
            headers: isAdminRequest ? getAuthHeaders() : getUserAuthHeaders(),
          }
        )

        if (!response.ok) {
          const errorData = await response.json()
          return { data: null, error: errorData.error || { message: '예약 삭제에 실패했습니다.' } }
        }

        const payload = await response.json()
        return { data: payload.data, error: null }
      } catch (error) {
        return { data: null, error: { message: getErrorMessage(error, '예약 삭제에 실패했습니다.') } }
      }
    }

    const { data, error } = await supabase
      .from('reservations')
      .delete()
      .eq('id', reservationId)
      .select()

    return { data, error }
  },

  // 사용자 예약 목록 조회
  async getUserReservations(userId: string) {
    if (typeof window !== 'undefined') {
      try {
        const response = await fetch('/api/user/reservations', {
          headers: getUserAuthHeaders(),
        })

        if (!response.ok) {
          const errorData = await response.json()
          return { data: null, error: errorData.error || { message: '내 예약 목록을 불러오지 못했습니다.' } }
        }

        const payload = await response.json()
        return { data: payload.data, error: null }
      } catch (error) {
        return { data: null, error: timeoutError(getErrorMessage(error, '내 예약 목록을 불러오는 중 오류가 발생했습니다.')) }
      }
    }

    try {
      const { data, error } = await runQueryWithTimeout(
        supabase
          .from('reservations')
          .select(`
            *,
            reservation_slots(*)
          `)
          .eq('user_id', userId)
          .order('date', { ascending: false }),
        '내 예약 목록을 불러오는 중 시간이 초과되었습니다.',
        LONG_QUERY_TIMEOUT_MS
      )

      return { data, error }
    } catch (error) {
      return { data: null, error: timeoutError(getErrorMessage(error, '내 예약 목록을 불러오는 중 오류가 발생했습니다.')) }
    }
  },

  // 예약 취소 요청 (승인된 예약의 경우)
  async requestCancellation(reservationId: string) {
    if (typeof window !== 'undefined') {
      try {
        const response = await fetch('/api/user/reservations', {
          method: 'PATCH',
          headers: getUserAuthHeaders(),
          body: JSON.stringify({ reservationId }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          return { data: null, error: errorData.error || { message: '취소 요청에 실패했습니다.' } }
        }

        const payload = await response.json()
        return { data: payload.data, error: null }
      } catch (error) {
        return { data: null, error: { message: getErrorMessage(error, '취소 요청에 실패했습니다.') } }
      }
    }

    const { data, error } = await supabase
      .from('reservations')
      .update({ 
        status: 'cancel_requested'
      })
      .eq('id', reservationId)
      .select()

    return { data, error }
  },

  // 취소 요청 예약 목록 조회
  async getCancellationRequests(regionCode?: string) {
    if (typeof window !== 'undefined') {
      try {
        const query = new URLSearchParams({ scope: 'cancel_requested' })
        if (regionCode) {
          query.set('regionCode', regionCode)
        }
        const response = await fetch(`/api/admin/reservations?${query.toString()}`, {
          headers: getAuthHeaders(),
        })

        if (!response.ok) {
          const errorData = await response.json()
          return { data: null, error: errorData.error || { message: '취소 요청 예약을 불러오지 못했습니다.' } }
        }

        const payload = await response.json()
        return { data: payload.data, error: null }
      } catch (error) {
        return { data: null, error: timeoutError(getErrorMessage(error, '취소 요청 예약을 불러오는 중 오류가 발생했습니다.')) }
      }
    }

    let query = supabase
      .from('reservations')
      .select(`
        *,
        users!inner(
          organization_name,
          manager_name,
          phone,
          email,
          cities!inner(name, regions!inner(name, code))
        ),
        reservation_slots(*),
        regions!inner(name, code)
      `)
      .eq('status', 'cancel_requested')

    if (regionCode) {
      query = query.eq('users.cities.regions.code', regionCode)
    }

    try {
      const { data, error } = await runQueryWithTimeout(
        query,
        '취소 요청 예약을 불러오는 중 시간이 초과되었습니다.',
        LONG_QUERY_TIMEOUT_MS
      )
      return { data, error }
    } catch (error) {
      return { data: null, error: timeoutError(getErrorMessage(error, '취소 요청 예약을 불러오는 중 오류가 발생했습니다.')) }
    }
  },
}

// 공통 유틸리티 함수들
export const utilityAPI = {
  // 모든 지역 조회
  async getRegions() {
    const { data, error } = await supabase
      .from('regions')
      .select('*')
      .order('name')

    return { data, error }
  },
}

export const dashboardAPI = {
  async getActiveMonth() {
    try {
      const response = await withTimeout(
        fetch('/api/dashboard/active-month', {
          method: 'GET',
          headers: getUserAuthHeaders()
        }),
        QUERY_TIMEOUT_MS,
        '활성 예약 월을 불러오는 중 시간이 초과되었습니다.'
      )

      const result = await response.json()

      if (!response.ok) {
        return { data: null, error: { message: result.error || '활성 예약 월을 불러오지 못했습니다.' } }
      }

      return { data: result.data, error: null }
    } catch (error) {
      return { data: null, error: { message: getErrorMessage(error, '활성 예약 월을 불러오는 중 오류가 발생했습니다.') } }
    }
  },
  async getCalendar(year: number, month: number, options?: { bypassCache?: boolean }) {
    try {
      const sessionScope = typeof window !== 'undefined' ? getCookieFirstClientSessionScope(localStorage) : 'cookie-session'
      const cacheKey = getDashboardCalendarClientCacheKey(year, month, sessionScope)
      if (typeof window !== 'undefined' && !options?.bypassCache) {
        const cachedValue = localStorage.getItem(cacheKey) || sessionStorage.getItem(cacheKey)
        if (cachedValue) {
          const cached = JSON.parse(cachedValue)
          const cachedTtlMs = getDashboardBootstrapClientCacheTtl(Boolean(cached.data?.monthGate?.is_open))
          if (Date.now() - cached.cachedAt < cachedTtlMs) {
            return { data: cached.data, error: null }
          }
        }
      }

      const response = await withTimeout(
        fetch(`/api/dashboard/calendar?year=${year}&month=${month}${options?.bypassCache ? '&bypassCache=1' : ''}`, {
          method: 'GET',
          headers: getUserAuthHeaders()
        }),
        LONG_QUERY_TIMEOUT_MS,
        '대시보드 달력 정보를 불러오는 중 시간이 초과되었습니다.'
      )

      const result = await response.json()

      if (!response.ok) {
        return { data: null, error: { message: result.error || '대시보드 달력 정보를 불러오지 못했습니다.' } }
      }

      if (typeof window !== 'undefined') {
        const cacheTtlMs = getDashboardBootstrapClientCacheTtl(Boolean(result.data?.monthGate?.is_open))
        const serialized = JSON.stringify({
          cachedAt: Date.now(),
          ttlMs: cacheTtlMs,
          data: result.data
        })
        localStorage.setItem(cacheKey, serialized)
        sessionStorage.setItem(cacheKey, serialized)
      }

      return { data: result.data, error: null }
    } catch (error) {
      return { data: null, error: { message: getErrorMessage(error, '대시보드 달력 정보를 불러오는 중 오류가 발생했습니다.') } }
    }
  },
  async getMe(year: number, month: number, options?: { bypassCache?: boolean }) {
    try {
      const sessionScope = typeof window !== 'undefined' ? getCookieFirstClientSessionScope(localStorage) : 'cookie-session'
      const cacheKey = getDashboardMeClientCacheKey(year, month, sessionScope)
      if (typeof window !== 'undefined' && !options?.bypassCache) {
        const cachedValue = localStorage.getItem(cacheKey) || sessionStorage.getItem(cacheKey)
        if (cachedValue) {
          const cached = JSON.parse(cachedValue)
          if (Date.now() - cached.cachedAt < 5000) {
            return { data: cached.data, error: null }
          }
        }
      }

      const response = await withTimeout(
        fetch(`/api/dashboard/me?year=${year}&month=${month}${options?.bypassCache ? '&bypassCache=1' : ''}`, {
          method: 'GET',
          headers: getUserAuthHeaders()
        }),
        LONG_QUERY_TIMEOUT_MS,
        '내 대시보드 정보를 불러오는 중 시간이 초과되었습니다.'
      )

      const result = await response.json()

      if (!response.ok) {
        return { data: null, error: { message: result.error || '내 대시보드 정보를 불러오지 못했습니다.' } }
      }

      if (typeof window !== 'undefined') {
        const serialized = JSON.stringify({
          cachedAt: Date.now(),
          data: result.data
        })
        localStorage.setItem(cacheKey, serialized)
        sessionStorage.setItem(cacheKey, serialized)
      }

      return { data: result.data, error: null }
    } catch (error) {
      return { data: null, error: { message: getErrorMessage(error, '내 대시보드 정보를 불러오는 중 오류가 발생했습니다.') } }
    }
  },
  clearClientCaches(year: number, month: number) {
    if (typeof window === 'undefined') {
      return
    }

    const sessionScope = getCookieFirstClientSessionScope(localStorage)
    clearDashboardClientCaches(year, month, sessionScope, [localStorage, sessionStorage])
  }
}

// 공지사항 관련 함수들
export const announcementAPI = {
  // 사용자용: 공지사항 목록 조회 (지역별 필터링 적용)
  async getAnnouncementsForUser(_userId: string) {
    void _userId
    try {
      const response = await withTimeout(
        fetch('/api/announcements/user', {
          headers: getUserAuthHeaders(),
        }),
        QUERY_TIMEOUT_MS,
        '공지사항 목록을 불러오는 중 시간이 초과되었습니다.'
      )

      const result = await response.json().catch(() => null)
      if (!response.ok) {
        return {
          data: null,
          error: result?.error || { message: '공지사항 목록을 불러오는 중 오류가 발생했습니다.' }
        }
      }

      return { data: result?.data || [], error: null }
    } catch (error) {
      console.error('getAnnouncementsForUser 오류:', error)
      return { data: null, error: timeoutError(getErrorMessage(error, '공지사항 목록을 불러오는 중 오류가 발생했습니다.')) }
    }
  },

  // 공개 공지사항만 조회 (로그인하지 않은 사용자용)
  async getPublicAnnouncements() {
    if (typeof window !== 'undefined') {
      try {
        const response = await withTimeout(
          fetch('/api/public/announcements', {
            headers: {
              'Content-Type': 'application/json'
            }
          }),
          QUERY_TIMEOUT_MS,
          '공지사항을 불러오는 중 시간이 초과되었습니다.'
        )

        const result = await response.json().catch(() => null)

        if (!response.ok) {
          return {
            data: null,
            error: {
              message: result?.error || '공지사항을 불러오는 중 오류가 발생했습니다.'
            }
          }
        }

        return { data: result?.data || [], error: null }
      } catch (error) {
        return {
          data: null,
          error: timeoutError(getErrorMessage(error, '공지사항을 불러오는 중 오류가 발생했습니다.'))
        }
      }
    }

    try {
      const { data, error } = await runQueryWithTimeout(
        supabase
          .from('announcements')
          .select(`
            *,
            admins(username),
            regions(name)
          `)
          .eq('is_published', true)
          .order('is_important', { ascending: false })
          .order('created_at', { ascending: false }),
        '공지사항을 불러오는 중 시간이 초과되었습니다.'
      )

      return { data, error }
    } catch (error) {
      return { data: null, error: timeoutError(getErrorMessage(error, '공지사항을 불러오는 중 오류가 발생했습니다.')) }
    }
  },

  // 관리자용: 공지사항 목록 조회
  async getAnnouncementsForAdmin(adminRole: string, adminRegionId?: number) {
    let query = supabase
      .from('announcements')
      .select(`
        *,
        admins(username),
        regions(name)
      `)

    // 모든 관리자가 모든 공지사항을 볼 수 있음 (수정/삭제 권한만 제한)

    try {
      const { data, error } = await runQueryWithTimeout(
        query
          .order('is_important', { ascending: false })
          .order('created_at', { ascending: false }),
        '관리자 공지사항 목록을 불러오는 중 시간이 초과되었습니다.'
      )

      return { data, error }
    } catch (error) {
      return { data: null, error: timeoutError(getErrorMessage(error, '관리자 공지사항 목록을 불러오는 중 오류가 발생했습니다.')) }
    }
  },

  // 공지사항 생성
  async createAnnouncement(announcementData: {
    title: string
    content: string
    author_id?: string
    target_type: 'all' | 'region'
    target_region_id?: number
    is_important?: boolean
    is_published?: boolean
  }) {
    try {
      const response = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(announcementData)
      })

      const result = await response.json()

      if (!response.ok) {
        return { data: null, error: { message: result.error || 'Failed to create announcement' } }
      }

      return { data: result.data, error: null }
    } catch (error) {
      console.error('API call error:', error)
      return { data: null, error: { message: 'Network error' } }
    }
  },

  // 공지사항 수정
  async updateAnnouncement(id: string, updateData: {
    title?: string
    content?: string
    target_type?: 'all' | 'region'
    target_region_id?: number
    is_important?: boolean
    is_published?: boolean
  }) {
    const response = await fetch(`/api/admin/announcements?id=${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updateData)
    })

    if (!response.ok) {
      const errorData = await response.json()
      return { data: null, error: { message: errorData.error } }
    }

    const data = await response.json()
    return { data: data.data, error: null }
  },

  // 공지사항 삭제
  async deleteAnnouncement(id: string) {
    const response = await fetch(`/api/admin/announcements?id=${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })

    if (!response.ok) {
      const errorData = await response.json()
      return { data: null, error: { message: errorData.error } }
    }

    const data = await response.json()
    return { data, error: null }
  },

  // 파일 첨부 관련 함수들

  // Storage에 파일 업로드
  async uploadAttachment(
    announcementId: string,
    file: File
  ): Promise<{ data: string | null; error: any }> {
    try {
      // 파일 검증
      const { validateFile, sanitizeFileName } = await import('@/lib/fileValidation')
      const validation = validateFile(file)

      if (!validation.valid) {
        return {
          data: null,
          error: { message: validation.error }
        }
      }

      // 안전한 파일명 생성
      const timestamp = Date.now()
      const safeFileName = sanitizeFileName(file.name)
      const filePath = `announcements/${announcementId}/${timestamp}_${safeFileName}`

      const { data, error } = await supabase.storage
        .from('announcement-attachments')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) throw error

      return { data: filePath, error: null }
    } catch (error) {
      console.error('File upload error:', error)
      return { data: null, error }
    }
  },

  // 첨부파일 레코드 생성
  async createAttachment(attachmentData: {
    announcement_id: string
    file_name: string
    file_size: number
    file_type: string
    storage_path: string
  }) {
    const { data, error } = await supabase
      .from('announcement_attachments')
      .insert([attachmentData])
      .select()
      .single()

    return { data, error }
  },

  // 공지사항의 첨부파일 목록 조회
  async getAttachments(announcementId: string) {
    try {
      const { data, error } = await runQueryWithTimeout(
        supabase
          .from('announcement_attachments')
          .select('*')
          .eq('announcement_id', announcementId)
          .order('uploaded_at', { ascending: true }),
        '첨부파일 목록을 불러오는 중 시간이 초과되었습니다.'
      )

      return { data, error }
    } catch (error) {
      return { data: null, error: timeoutError(getErrorMessage(error, '첨부파일 목록을 불러오는 중 오류가 발생했습니다.')) }
    }
  },

  // 첨부파일 삭제
  async deleteAttachment(attachmentId: string, storagePath: string) {
    // Storage에서 파일 삭제
    const { error: storageError } = await supabase.storage
      .from('announcement-attachments')
      .remove([storagePath])

    if (storageError) {
      console.error('Storage deletion error:', storageError)
      return { data: null, error: storageError }
    }

    // 데이터베이스에서 레코드 삭제
    const { data, error } = await supabase
      .from('announcement_attachments')
      .delete()
      .eq('id', attachmentId)

    return { data, error }
  },

  // 파일 다운로드용 Signed URL 생성
  async getAttachmentDownloadUrl(storagePath: string, downloadFileName?: string) {
    const { data, error } = await supabase.storage
      .from('announcement-attachments')
      .createSignedUrl(storagePath, 3600, {
        download: downloadFileName || true  // 원본 파일명으로 다운로드
      })

    return { data: data?.signedUrl || null, error }
  }
}

// 홈페이지 팝업 관련 함수들
export const popupAPI = {
  // 활성화된 팝업 조회 (홈페이지용)
  async getActivePopups() {
    if (typeof window !== 'undefined') {
      try {
        const response = await withTimeout(
          fetch('/api/public/popups', {
            headers: {
              'Content-Type': 'application/json'
            }
          }),
          QUERY_TIMEOUT_MS,
          '팝업 정보를 불러오는 중 시간이 초과되었습니다.'
        )

        const result = await response.json().catch(() => null)

        if (!response.ok) {
          return {
            data: null,
            error: {
              message: result?.error || '팝업 정보를 불러오는 중 오류가 발생했습니다.'
            }
          }
        }

        return { data: result?.data || [], error: null }
      } catch (error) {
        return {
          data: null,
          error: timeoutError(getErrorMessage(error, '팝업 정보를 불러오는 중 오류가 발생했습니다.'))
        }
      }
    }

    const currentTime = new Date().toISOString()

    try {
      const { data, error } = await runQueryWithTimeout(
        supabase
          .from('homepage_popups')
          .select(`
            *,
            admins(username)
          `)
          .eq('is_active', true)
          .lte('start_date', currentTime)
          .or(`end_date.is.null,end_date.gte.${currentTime}`)
          .order('display_order', { ascending: true })
          .order('created_at', { ascending: false }),
        '팝업 정보를 불러오는 중 시간이 초과되었습니다.'
      )

      return { data, error }
    } catch (error) {
      return { data: null, error: timeoutError(getErrorMessage(error, '팝업 정보를 불러오는 중 오류가 발생했습니다.')) }
    }
  },

  // 모든 팝업 조회 (관리자용)
  async getAllPopups() {
    try {
      const response = await fetch('/api/admin/popups', {
        headers: getAuthHeaders()
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { data: null, error: { message: errorData.error || 'Failed to fetch popups' } }
      }

      const result = await response.json()
      return { data: result.data, error: null }
    } catch (error) {
      console.error('팝업 조회 중 예외:', error)
      return { data: null, error: { message: '팝업 조회 중 오류가 발생했습니다.' } }
    }
  },

  // 팝업 생성
  async createPopup(popupData: {
    title: string;
    content: string;
    content_type: 'html' | 'markdown' | 'text';
    start_date: string;
    end_date?: string | null;
    author_id: string;
    display_order?: number;
  }) {
    try {
      const response = await fetch('/api/admin/popups', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(popupData)
      })

      const result = await response.json()

      if (!response.ok) {
        return { data: null, error: result.error ? { message: result.error } : { message: 'Failed to create popup' } }
      }

      return { data: result.data, error: null }
    } catch (error) {
      console.error('팝업 생성 중 예외:', error)
      return { data: null, error: { message: '팝업 생성 중 오류가 발생했습니다.' } }
    }
  },

  // 팝업 수정
  async updatePopup(id: string, updateData: {
    title?: string;
    content?: string;
    content_type?: 'html' | 'markdown' | 'text';
    is_active?: boolean;
    start_date?: string;
    end_date?: string | null;
    display_order?: number;
  }) {
    const response = await fetch(`/api/admin/popups?id=${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updateData)
    })

    if (!response.ok) {
      const errorData = await response.json()
      return { data: null, error: { message: errorData.error } }
    }

    const data = await response.json()
    return { data: data.data, error: null }
  },

  // 팝업 삭제
  async deletePopup(id: string) {
    const response = await fetch(`/api/admin/popups?id=${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })

    if (!response.ok) {
      const errorData = await response.json()
      return { data: null, error: { message: errorData.error } }
    }

    const data = await response.json()
    return { data, error: null }
  },

  // 팝업 활성화/비활성화
  async togglePopupStatus(id: string, isActive: boolean) {
    try {
      const response = await fetch(`/api/admin/popups?id=${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ is_active: isActive })
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { data: null, error: { message: errorData.error || 'Failed to toggle popup status' } }
      }

      const data = await response.json()
      return { data: data.data, error: null }
    } catch (error) {
      console.error('팝업 상태 변경 중 예외:', error)
      return { data: null, error: { message: '팝업 상태 변경 중 오류가 발생했습니다.' } }
    }
  }
}

// 세션 관리 API
export const sessionAPI = {
  // 세션 유효성 검사
  async validateSession(sessionToken?: string) {
    return authApiClient.validateUserSession(sessionToken)
  },

  // 세션 갱신 (활동 시간 업데이트)
  async refreshSession(sessionToken?: string) {
    return authApiClient.refreshUserSession(sessionToken)
  },

  // 로그아웃 (세션 비활성화)
  async logout(sessionToken?: string) {
    return authApiClient.logoutSession(sessionToken)
  },

  // 다중 로그인 감지
  async detectMultipleLogins(userId: string) {
    try {
      const { data, error } = await runQueryWithTimeout(
        supabase
          .from('user_sessions')
          .select('*')
          .eq('user_id', userId)
          .eq('is_active', true)
          .gte('expires_at', new Date().toISOString()),
        '다중 로그인 확인 응답이 지연되고 있습니다.'
      )

      return { 
        data: data || [], 
        error,
        hasMultipleSessions: (data?.length || 0) > 1
      }
    } catch (error) {
      return {
        data: [],
        error: timeoutError(getErrorMessage(error, '다중 로그인 확인 중 오류가 발생했습니다.')),
        hasMultipleSessions: false
      }
    }
  }
}

function getUserAuthHeaders(): HeadersInit {
  return buildCookieFirstClientHeaders()
}

// ==========================================
// TIER MANAGEMENT API - NEW ADDITION
// ==========================================
export const tierAPI = {
  // Get all available tiers
  async getAllTiers() {
    if (typeof window !== 'undefined') {
      try {
        const response = await fetch('/api/admin/tier-settings?action=tiers', {
          headers: getAuthHeaders(),
        })

        if (!response.ok) {
          const errorData = await response.json()
          return { data: null, error: errorData.error || { message: '티어 목록을 불러오지 못했습니다.' } }
        }

        const payload = await response.json()
        return { data: payload.data, error: null }
      } catch (error) {
        return { data: null, error: { message: getErrorMessage(error, '티어 목록을 불러오지 못했습니다.') } }
      }
    }

    const { data, error } = await supabase
      .from('member_tiers')
      .select('*')
      .eq('is_active', true)
      .order('tier_level')

    return { data, error }
  },
  // Get tier reservation settings for specific region/month
  async getActiveReservationMonth(regionCode: string) {
    if (typeof window !== 'undefined') {
      try {
        const query = new URLSearchParams({
          action: 'active-month',
          regionCode,
        })
        const response = await fetch(`/api/admin/tier-settings?${query.toString()}`, {
          headers: getAuthHeaders(),
        })

        if (!response.ok) {
          const errorData = await response.json()
          return { data: null, error: errorData.error || { message: '활성 예약 월을 불러오지 못했습니다.' } }
        }

        const payload = await response.json()
        return { data: payload.data, error: null }
      } catch (error) {
        return { data: null, error: { message: getErrorMessage(error, '활성 예약 월을 불러오지 못했습니다.') } }
      }
    }

    const { data, error } = await supabase
      .from('tier_reservation_settings')
      .select('year_month')
      .eq('region_code', regionCode)
      .eq('is_open', true)
      .limit(1)
      .maybeSingle()

    return { data: { yearMonth: data?.year_month ?? null }, error }
  },

  // Get tier reservation settings for specific region/month
  async getTierReservationSettings(regionCode: string, yearMonth: string) {
    if (typeof window !== 'undefined') {
      try {
        const query = new URLSearchParams({
          regionCode,
          yearMonth,
        })
        const response = await fetch(`/api/admin/tier-settings?${query.toString()}`, {
          headers: getAuthHeaders(),
        })

        if (!response.ok) {
          const errorData = await response.json()
          return { data: null, error: errorData.error || { message: '티어별 예약 설정을 불러오지 못했습니다.' } }
        }

        const payload = await response.json()
        return { data: payload.data, error: null }
      } catch (error) {
        return { data: null, error: { message: getErrorMessage(error, '티어별 예약 설정을 불러오지 못했습니다.') } }
      }
    }

    const { data, error } = await supabase
      .from('tier_reservation_settings')
      .select(`
        *,
        member_tiers!inner(tier_name, tier_level, advance_reservation_days)
      `)
      .eq('region_code', regionCode)
      .eq('year_month', yearMonth)
      .order('tier_id')

    return { data, error }
  },

  // Update tier reservation status (Admin only)
  async updateTierReservationStatus(
    regionCode: string,
    yearMonth: string,
    tierId: number,
    isOpen: boolean,
    adminId: string
  ) {
    if (typeof window !== 'undefined') {
      try {
        const response = await fetch('/api/admin/tier-settings', {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            regionCode,
            yearMonth,
            tierId,
            isOpen,
            adminId,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          return { data: null, error: errorData.error || { message: '티어 예약 상태 변경에 실패했습니다.' } }
        }

        const payload = await response.json()
        return { data: payload.data, error: null }
      } catch (error) {
        return { data: null, error: { message: getErrorMessage(error, '티어 예약 상태 변경에 실패했습니다.') } }
      }
    }

    // 현재 날짜로 설정 (수동 제어)
    const reservationStartDate = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('tier_reservation_settings')
      .upsert([{
        region_code: regionCode,
        year_month: yearMonth,
        tier_id: tierId,
        is_open: isOpen,
        reservation_start_date: reservationStartDate,
        created_by: adminId
      }], {
        onConflict: 'region_code,year_month,tier_id'
      })
      .select(`
        *,
        member_tiers!inner(tier_name, tier_level)
      `)

    return { data, error }
  },
}

// 예약 자동 시작/종료 스케줄 API (관리자 전용, 한국 시간 기준)
export const reservationScheduleAPI = {
  // 스케줄 목록 조회 (대기중 + 최근 실행 이력)
  async getSchedules(regionCode: string) {
    try {
      const query = new URLSearchParams({ regionCode })
      const response = await fetch(`/api/admin/reservation-schedules?${query.toString()}`, {
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { data: null, error: errorData.error || { message: '예약 스케줄을 불러오지 못했습니다.' } }
      }

      const payload = await response.json()
      return { data: payload.data, error: null }
    } catch (error) {
      return { data: null, error: { message: getErrorMessage(error, '예약 스케줄을 불러오지 못했습니다.') } }
    }
  },

  // 스케줄 등록 (scheduledAtKst: "YYYY-MM-DDTHH:mm" 한국 시간, tierId null이면 전체 티어)
  async createSchedule(input: {
    regionCode: string
    yearMonth: string
    tierId: number | null
    action: 'open' | 'close'
    scheduledAtKst: string
  }) {
    try {
      const response = await fetch('/api/admin/reservation-schedules', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(input),
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { data: null, error: errorData.error || { message: '예약 스케줄 등록에 실패했습니다.' } }
      }

      const payload = await response.json()
      return { data: payload.data, error: null }
    } catch (error) {
      return { data: null, error: { message: getErrorMessage(error, '예약 스케줄 등록에 실패했습니다.') } }
    }
  },

  // 대기중 스케줄 삭제
  async deleteSchedule(scheduleId: number, regionCode: string) {
    try {
      const query = new URLSearchParams({ id: String(scheduleId), regionCode })
      const response = await fetch(`/api/admin/reservation-schedules?${query.toString()}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { data: null, error: errorData.error || { message: '예약 스케줄 삭제에 실패했습니다.' } }
      }

      const payload = await response.json()
      return { data: payload.data, error: null }
    } catch (error) {
      return { data: null, error: { message: getErrorMessage(error, '예약 스케줄 삭제에 실패했습니다.') } }
    }
  },
}

// 담당자 관리 및 예약 배정 API (관리자 전용)
export const staffAPI = {
  // 담당자 목록 조회
  async getStaffMembers(regionCode: string) {
    try {
      const query = new URLSearchParams({ regionCode })
      const response = await fetch(`/api/admin/staff?${query.toString()}`, {
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { data: null, error: errorData.error || { message: '담당자 목록을 불러오지 못했습니다.' } }
      }

      const payload = await response.json()
      return { data: payload.data, error: null }
    } catch (error) {
      return { data: null, error: { message: getErrorMessage(error, '담당자 목록을 불러오지 못했습니다.') } }
    }
  },

  // 담당자 등록
  async createStaffMember(regionCode: string, name: string, teamNo: number | null) {
    try {
      const response = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ regionCode, name, teamNo }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { data: null, error: errorData.error || { message: '담당자 등록에 실패했습니다.' } }
      }

      const payload = await response.json()
      return { data: payload.data, error: null }
    } catch (error) {
      return { data: null, error: { message: getErrorMessage(error, '담당자 등록에 실패했습니다.') } }
    }
  },

  // 담당자 수정 (이름/팀/활성 여부)
  async updateStaffMember(
    regionCode: string,
    staffId: number,
    updates: { name?: string; teamNo?: number | null; isActive?: boolean }
  ) {
    try {
      const response = await fetch('/api/admin/staff', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ regionCode, staffId, ...updates }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { data: null, error: errorData.error || { message: '담당자 수정에 실패했습니다.' } }
      }

      const payload = await response.json()
      return { data: payload.data, error: null }
    } catch (error) {
      return { data: null, error: { message: getErrorMessage(error, '담당자 수정에 실패했습니다.') } }
    }
  },

  // 담당자 삭제
  async deleteStaffMember(regionCode: string, staffId: number) {
    try {
      const query = new URLSearchParams({ regionCode, id: String(staffId) })
      const response = await fetch(`/api/admin/staff?${query.toString()}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { data: null, error: errorData.error || { message: '담당자 삭제에 실패했습니다.' } }
      }

      const payload = await response.json()
      return { data: payload.data, error: null }
    } catch (error) {
      return { data: null, error: { message: getErrorMessage(error, '담당자 삭제에 실패했습니다.') } }
    }
  },

  // 월별 휴가 목록 조회
  async getVacations(regionCode: string, yearMonth: string) {
    try {
      const query = new URLSearchParams({ regionCode, yearMonth })
      const response = await fetch(`/api/admin/staff/vacations?${query.toString()}`, {
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { data: null, error: errorData.error || { message: '휴가 목록을 불러오지 못했습니다.' } }
      }

      const payload = await response.json()
      return { data: payload.data, error: null }
    } catch (error) {
      return { data: null, error: { message: getErrorMessage(error, '휴가 목록을 불러오지 못했습니다.') } }
    }
  },

  // 휴가 등록
  async addVacation(regionCode: string, staffId: number, date: string) {
    try {
      const response = await fetch('/api/admin/staff/vacations', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ regionCode, staffId, date }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { data: null, error: errorData.error || { message: '휴가 등록에 실패했습니다.' } }
      }

      const payload = await response.json()
      return { data: payload.data, error: null }
    } catch (error) {
      return { data: null, error: { message: getErrorMessage(error, '휴가 등록에 실패했습니다.') } }
    }
  },

  // 휴가 삭제
  async removeVacation(regionCode: string, vacationId: number) {
    try {
      const query = new URLSearchParams({ regionCode, id: String(vacationId) })
      const response = await fetch(`/api/admin/staff/vacations?${query.toString()}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { data: null, error: errorData.error || { message: '휴가 삭제에 실패했습니다.' } }
      }

      const payload = await response.json()
      return { data: payload.data, error: null }
    } catch (error) {
      return { data: null, error: { message: getErrorMessage(error, '휴가 삭제에 실패했습니다.') } }
    }
  },

  // 월별 배정 목록 조회
  async getAssignments(regionCode: string, year: number, month: number) {
    try {
      const query = new URLSearchParams({ regionCode, year: String(year), month: String(month) })
      const response = await fetch(`/api/admin/staff/assignments?${query.toString()}`, {
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { data: null, error: errorData.error || { message: '담당자 배정 정보를 불러오지 못했습니다.' } }
      }

      const payload = await response.json()
      return { data: payload.data, error: null }
    } catch (error) {
      return { data: null, error: { message: getErrorMessage(error, '담당자 배정 정보를 불러오지 못했습니다.') } }
    }
  },

  // 월 전체 랜덤 배정 (해당 월의 모든 예약을 날짜 순서대로 다시 배정)
  async assignRandomMonth(regionCode: string, year: number, month: number, method: 'random_team' | 'random_individual') {
    try {
      const response = await fetch('/api/admin/staff/assignments', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: 'random_month', regionCode, year, month, method }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { data: null, error: errorData.error || { message: '월 전체 랜덤 배정에 실패했습니다.' } }
      }

      const payload = await response.json()
      return { data: payload.data, error: null }
    } catch (error) {
      return { data: null, error: { message: getErrorMessage(error, '월 전체 랜덤 배정에 실패했습니다.') } }
    }
  },

  // 랜덤 배정 (해당 날짜의 모든 예약을 다시 배정)
  async assignRandom(regionCode: string, date: string, method: 'random_team' | 'random_individual') {
    try {
      const response = await fetch('/api/admin/staff/assignments', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: 'random', regionCode, date, method }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { data: null, error: errorData.error || { message: '랜덤 배정에 실패했습니다.' } }
      }

      const payload = await response.json()
      return { data: payload.data, error: null }
    } catch (error) {
      return { data: null, error: { message: getErrorMessage(error, '랜덤 배정에 실패했습니다.') } }
    }
  },

  // 수동 배정 (특정 예약의 담당자 목록 교체, 빈 배열이면 해제)
  async assignManual(regionCode: string, reservationId: string, staffIds: number[]) {
    try {
      const response = await fetch('/api/admin/staff/assignments', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: 'manual', regionCode, reservationId, staffIds }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { data: null, error: errorData.error || { message: '담당자 배정에 실패했습니다.' } }
      }

      const payload = await response.json()
      return { data: payload.data, error: null }
    } catch (error) {
      return { data: null, error: { message: getErrorMessage(error, '담당자 배정에 실패했습니다.') } }
    }
  },
}

// 관리자 계정 관리 API
export const adminAPI = {
  // 관리자 로그인 (하이브리드: bcrypt + 레거시 btoa 지원)
  async login(username: string, password: string) {
    return authApiClient.loginAdmin(username, password)
  },

  async logout(sessionToken?: string) {
    return authApiClient.logoutSession(sessionToken)
  },

  // 관리자 정보 업데이트
  async updateAdminInfo(adminId: string, updates: { username?: string; phone?: string; email?: string }) {
    try {
      const response = await fetch('/api/account/admin', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: 'profile',
          phone: updates.phone,
          email: updates.email,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { data: null, error: errorData.error || { message: '관리자 정보 업데이트에 실패했습니다.' } }
      }

      const data = await response.json()
      return { data: data.data, error: null }
    } catch (error) {
      console.error('예외 발생:', error)
      return { data: null, error: { message: getErrorMessage(error, '관리자 정보 업데이트에 실패했습니다.') } }
    }
  },

  // 관리자 비밀번호 변경
  async changeAdminPassword(adminId: string, currentPassword: string, newPassword: string) {
    try {
      const response = await fetch('/api/account/admin', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: 'password',
          currentPassword,
          newPassword,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { data: null, error: errorData.error || { message: '관리자 비밀번호 변경에 실패했습니다.' } }
      }

      const data = await response.json()
      return { data: data.data, error: null }
    } catch (error) {
      return { data: null, error: { message: getErrorMessage(error, '관리자 비밀번호 변경에 실패했습니다.') } }
    }
  },
}
