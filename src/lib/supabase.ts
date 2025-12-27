import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { v4 as uuidv4 } from 'uuid'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false
  }
})

// Helper function to hash password (simple implementation - use bcrypt in production)
const hashPassword = (password: string): string => {
  // This is a very simple hash - in production, use bcrypt or similar
  // Use Buffer.from to handle UTF-8 characters properly
  try {
    return btoa(unescape(encodeURIComponent(password + 'sportsbox_salt')))
  } catch (error) {
    console.error('Password encoding error:', error)
    // Fallback: use a simple transformation for problematic characters
    const safePassword = (password + 'sportsbox_salt').replace(/[^\x00-\x7F]/g, '_')
    return btoa(safePassword)
  }
}

// Helper function to generate session token
const generateSessionToken = (): string => {
  return uuidv4() + '_' + Date.now() + '_' + Math.random().toString(36).substring(2)
}

// Helper function to get user agent and IP
const getClientInfo = (request?: Request) => {
  return {
    user_agent: request?.headers.get('user-agent') || 'Unknown',
    ip_address: request?.headers.get('x-forwarded-for') || request?.headers.get('x-real-ip') || 'Unknown'
  }
}

// Helper function to get city_id from city name
const getCityId = async (cityName: string): Promise<number | null> => {
  const { data, error } = await supabase
    .from('cities')
    .select('id')
    .eq('name', cityName)
    .single()
  
  if (error) {
    console.error('City lookup error:', error)
    return null
  }
  
  return data.id
}

// 회원 관련 함수들
export const memberAPI = {
  // 회원가입
  async register(userData: {
    organization_name: string;
    password: string;
    manager_name: string;
    city_name: string;
    phone: string;
    email: string;
    privacy_consent: boolean;
  }) {
    // Get city_id from city name
    const cityId = await getCityId(userData.city_name)
    if (!cityId) {
      return { data: null, error: { message: '존재하지 않는 시/군입니다.' } }
    }

    // Hash password
    const password_hash = hashPassword(userData.password)

    const { data, error } = await supabase
      .from('users')
      .insert([{
        organization_name: userData.organization_name,
        password_hash,
        manager_name: userData.manager_name,
        city_id: cityId,
        phone: userData.phone,
        email: userData.email,
        privacy_consent: userData.privacy_consent,
        status: 'pending'
      }])
      .select()

    return { data, error }
  },

  // 로그인 (동시 접속 제한 포함)
  async login(organization_name: string, password: string, request?: Request) {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        cities!inner(name, regions!inner(name, code))
      `)
      .eq('organization_name', organization_name)
      .eq('status', 'approved')
      .single()

    if (error) return { data: null, error }

    // Verify password
    const hashedInput = hashPassword(password)
    if (data.password_hash !== hashedInput) {
      return { data: null, error: { message: '비밀번호가 일치하지 않습니다.' } }
    }

    // 기존 활성 세션 비활성화 (한 계정 한 세션 제한)
    await supabase
      .from('user_sessions')
      .update({ is_active: false })
      .eq('user_id', data.id)
      .eq('is_active', true)

    // 새 세션 생성
    const sessionToken = generateSessionToken()
    const clientInfo = getClientInfo(request)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24시간 후 만료

    // 디버깅을 위한 로그 추가
    console.log('세션 생성 시도:', {
      user_id: data.id,
      user_id_type: typeof data.id,
      session_token: sessionToken,
      expires_at: expiresAt.toISOString()
    })

    const { data: sessionData, error: sessionError } = await supabase
      .from('user_sessions')
      .insert([{
        user_id: data.id,
        session_token: sessionToken,
        user_agent: clientInfo.user_agent,
        ip_address: clientInfo.ip_address,
        expires_at: expiresAt.toISOString(),
        is_active: true
      }])
      .select()

    if (sessionError) {
      console.error('세션 생성 오류 상세:', {
        error: sessionError,
        code: sessionError.code,
        message: sessionError.message,
        details: sessionError.details,
        hint: sessionError.hint
      })
      return { data: null, error: { message: `로그인 처리 중 오류가 발생했습니다: ${sessionError.message}` } }
    }

    // Remove password_hash from response for security
    const { password_hash, ...userWithoutPassword } = data
    return { 
      data: {
        ...userWithoutPassword,
        session_token: sessionToken,
        session_expires: expiresAt
      }, 
      error: null 
    }
  },

  // 승인 대기 회원 목록 조회
  async getPendingMembers(regionCode?: string) {
    let query = supabase
      .from('users')
      .select(`
        *,
        cities!inner(name, regions!inner(name, code))
      `)
      .eq('status', 'pending')

    if (regionCode) {
      query = query.eq('cities.regions.code', regionCode)
    }

    const { data, error } = await query
    return { data, error }
  },

  // 승인된 회원 목록 조회
  async getApprovedMembers(regionCode?: string) {
    let query = supabase
      .from('users')
      .select(`
        *,
        cities!inner(name, regions!inner(name, code))
      `)
      .eq('status', 'approved')

    if (regionCode) {
      query = query.eq('cities.regions.code', regionCode)
    }

    const { data, error } = await query
    return { data, error }
  },

  // 모든 회원 조회 (관리자용)
  async getAllMembers() {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        cities(name, regions(name))
      `)
      .order('created_at', { ascending: false })

    return { data, error }
  },

  // 지역별 회원 조회 (관리자용)
  async getAllMembersForRegion(regionCode: string) {
    let query = supabase
      .from('users')
      .select(`
        *,
        cities!inner(name, regions!inner(name, code))
      `)
      .eq('cities.regions.code', regionCode)
      .order('created_at', { ascending: false })

    const { data, error } = await query
    return { data, error }
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
    const { data, error } = await supabase
      .from('users')
      .update({ status })
      .eq('id', userId)
      .select()

    return { data, error }
  },

  // 비밀번호 초기화 (관리자용)
  async resetPassword(userId: string, newPassword: string) {
    const password_hash = hashPassword(newPassword)
    
    const { data, error } = await supabase
      .from('users')
      .update({ password_hash })
      .eq('id', userId)
      .select()

    return { data, error }
  }
}



// 설정 관련 함수들
export const settingsAPI = {
  // 지역 ID 조회 헬퍼
  async getRegionId(regionCode: string): Promise<number | null> {
    const { data, error } = await supabase
      .from('regions')
      .select('id')
      .eq('code', regionCode)
      .single()
    
    if (error) return null
    return data.id
  },

  // 차단된 날짜 목록 조회
  async getBlockedDates(regionCode: string) {
    const regionId = await this.getRegionId(regionCode)
    if (!regionId) {
      return { data: null, error: { message: '존재하지 않는 지역입니다.' } }
    }

    const { data, error } = await supabase
      .from('blocked_dates')
      .select(`
        *,
        regions!inner(name, code)
      `)
      .eq('region_id', regionId)

    return { data, error }
  },

  // 모든 차단된 날짜 조회 (Super Admin용)
  async getAllBlockedDates() {
    const { data, error } = await supabase
      .from('blocked_dates')
      .select(`
        *,
        regions(name, code)
      `)
      .order('date', { ascending: false })

    return { data, error }
  },

  // 차단된 날짜 추가 (지역별)
  async addBlockedDate(date: string, reason: string, regionCode: string) {
    const regionId = await this.getRegionId(regionCode)
    if (!regionId) {
      return { data: null, error: { message: '존재하지 않는 지역입니다.' } }
    }

    const { data, error } = await supabase
      .from('blocked_dates')
      .insert([{
        region_id: regionId,
        date,
        reason
      }])
      .select()

    return { data, error }
  },

  // 차단된 날짜 제거 (ID로)
  async removeBlockedDate(dateId: string) {
    const { data, error } = await supabase
      .from('blocked_dates')
      .delete()
      .eq('id', dateId)

    return { data, error }
  },

  // 예약 설정 조회
  async getReservationSettings(regionCode: string, year: number, month: number) {
    const regionId = await this.getRegionId(regionCode)
    if (!regionId) {
      return { data: null, error: { message: '존재하지 않는 지역입니다.' } }
    }

    const { data, error } = await supabase
      .from('reservation_settings')
      .select('*')
      .eq('region_id', regionId)
      .eq('year', year)
      .eq('month', month)
      .single()

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
    const regionId = await this.getRegionId(regionCode)
    if (!regionId) {
      return { data: null, error: { message: '존재하지 않는 지역입니다.' } }
    }

    // 해당 날짜의 현재 예약 수 조회
    const { data: reservations, error: reservationError } = await supabase
      .from('reservations')
      .select('id')
      .eq('region_id', regionId)
      .eq('date', date)
      .in('status', ['pending', 'approved'])

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
    const regionId = await this.getRegionId(regionCode)
    if (!regionId) {
      return { data: null, error: { message: '존재하지 않는 지역입니다.' } }
    }

    // 해당 월의 모든 예약 수 조회 (한 번의 쿼리로)
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const { data: reservations, error: reservationError } = await supabase
      .from('reservations')
      .select('date')
      .eq('region_id', regionId)
      .gte('date', startDate)
      .lte('date', endDate)
      .in('status', ['pending', 'approved'])

    if (reservationError) {
      return { data: null, error: reservationError }
    }

    // 날짜별 예약 수 집계
    const reservationCounts = {}
    reservations?.forEach(reservation => {
      const date = reservation.date
      reservationCounts[date] = (reservationCounts[date] || 0) + 1
    })

    // 월별 기본 설정 조회
    const { data: settings } = await this.getReservationSettings(regionCode, year, month)
    const defaultMaxReservations = settings?.max_reservations_per_day || 2
    
    // 월별 개별 설정 적용 - 각 월마다 관리자가 별도로 예약 시작/종료 제어
    const defaultIsOpen = settings?.is_open || false  // DB 설정값 사용, 없으면 false
    
    // 디버깅을 위한 로그
    console.log(`getMonthReservationStatus ${regionCode} ${year}년 ${month}월:`, {
      settings,
      defaultIsOpen, // DB에서 가져온 실제 설정값 사용
      defaultMaxReservations
    })

    // 특정 날짜별 제한 설정 조회 (한 번의 쿼리로)
    const { data: dailyLimits } = await supabase
      .from('daily_reservation_limits')
      .select('date, max_reservations')
      .eq('region_id', regionId)
      .gte('date', startDate)
      .lte('date', endDate)
      .gt('max_reservations', 0)

    // 특정 날짜별 제한을 맵으로 변환
    const dailyLimitMap = {}
    dailyLimits?.forEach(limit => {
      dailyLimitMap[limit.date] = limit.max_reservations
    })

    // 결과 생성
    const result = {}
    for (let day = 1; day <= lastDay; day++) {
      const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const currentReservations = reservationCounts[dateString] || 0
      const maxReservations = dailyLimitMap[dateString] || defaultMaxReservations
      
      // 예약 상태 결정 로직
      let isOpen = false
      
      // 기존 전체 예약 시스템 제거 - 티어별 제어로 대체됨
      // 달력 표시용으로만 사용 (실제 예약 가능 여부는 티어별로 체크)
      isOpen = true // 기본적으로 달력은 열려있음 (티어별 체크에서 실제 제어)
        
      // 개별 날짜 설정만 적용 (예약불가 날짜)
      if (dailyLimitMap[dateString] && maxReservations === 0) {
        isOpen = false // 관리자가 특정 날짜를 막은 경우만 닫힘
      }
      // 달력 상태 설정 완료

      result[dateString] = {
        current_reservations: currentReservations,
        max_reservations_per_day: maxReservations,
        is_full: currentReservations >= maxReservations,
        available_slots: Math.max(0, maxReservations - currentReservations),
        is_open: isOpen
      }
    }

    return { data: result, error: null }
  },

  // 일별 예약 제한 수 동적 설정
  async updateDailyLimit(regionCode: string, date: string, maxReservations: number) {
    const targetDate = new Date(date)
    const year = targetDate.getFullYear()
    const month = targetDate.getMonth() + 1

    return await this.updateReservationSettings(regionCode, year, month, {
      max_reservations_per_day: maxReservations
    })
  },

  // 특정 날짜 예약 제한 설정
  async setDailyReservationLimit(regionCode: string, date: string, maxReservations: number) {
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

    const { data, error } = await supabase
      .from('daily_reservation_limits')
      .select('*')
      .eq('region_id', regionId)
      .eq('date', date)

    // 데이터가 없는 것은 정상 (특정날짜 설정이 없음을 의미)
    if (!data || data.length === 0) {
      return { data: null, error: null }
    }

    return { data: data[0], error }
  },

  // 지역의 모든 특정 날짜 예약 제한 조회
  async getAllDailyReservationLimits(regionCode: string) {
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
  // 승인 대기 예약 목록 조회
  async getPendingReservations(regionCode?: string) {
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

    const { data, error } = await query
    return { data, error }
  },

  // 승인된 예약 목록 조회
  async getApprovedReservations(regionCode?: string) {
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

    const { data, error } = await query
    return { data, error }
  },

  // 모든 예약 조회 (관리자용)
  async getAllReservations() {
    const { data, error } = await supabase
      .from('reservations')
      .select(`
        *,
        users(
          id,
          organization_name,
          manager_name,
          phone,
          email,
          cities(name, regions(name))
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
      .order('created_at', { ascending: false })

    return { data, error }
  },

  // 지역별 모든 예약 조회 (관리자용)
  async getAllReservationsForRegion(regionCode: string) {
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
    const { data, error } = await supabase
      .from('reservations')
      .update({ status })
      .eq('id', reservationId)
      .select()

    return { data, error }
  },

  // 예약 완전 삭제 (거절, 취소 시 사용)
  async deleteReservation(reservationId: string) {
    const { data, error } = await supabase
      .from('reservations')
      .delete()
      .eq('id', reservationId)
      .select()

    return { data, error }
  },

  // 관리자 예약 강제 취소
  async forceCancel(reservationId: string) {
    // 먼저 단순 업데이트만 수행
    const { error: updateError } = await supabase
      .from('reservations')
      .update({ 
        status: 'cancelled'
      })
      .eq('id', reservationId)

    if (updateError) {
      return { data: null, error: updateError }
    }

    // 업데이트 성공 후 데이터 조회
    const { data, error } = await supabase
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
      .eq('id', reservationId)
      .single()

    return { data, error }
  },

  // 특정 날짜의 모든 예약 조회 (관리자용)
  async getReservationsByDate(regionCode: string, date: string) {
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
      .eq('date', date)
      .in('status', ['pending', 'approved'])

    if (regionCode) {
      query = query.eq('users.cities.regions.code', regionCode)
    }

    const { data, error } = await query.order('created_at', { ascending: true })
    return { data, error }
  },

  // 사용자 예약 목록 조회
  async getUserReservations(userId: string) {
    const { data, error } = await supabase
      .from('reservations')
      .select(`
        *,
        reservation_slots(*)
      `)
      .eq('user_id', userId)
      .order('date', { ascending: false })

    return { data, error }
  },

  // 예약 취소 요청 (승인된 예약의 경우)
  async requestCancellation(reservationId: string) {
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

    const { data, error } = await query
    return { data, error }
  },

  // 예약 생성 시 제한 확인
  async createReservationWithValidation(
    userId: string,
    regionId: number,
    date: string,
    slots: Array<{
      start_time: string;
      end_time: string;
      grade: string;
      participant_count: number;
      location: string;
      slot_order: number;
    }>
  ) {
    const regionCode = regionId === 1 ? 'south' : 'north'
    
    // 1. 관리자 설정값 조회
    const selectedDateObj = new Date(date)
    const year = selectedDateObj.getFullYear()
    const month = selectedDateObj.getMonth() + 1
    
    const { data: settings, error: settingsError } = await settingsAPI.getReservationSettings(regionCode, year, month)
    if (settingsError) {
      return { data: null, error: { message: '예약 설정을 확인할 수 없습니다.' } }
    }

    // 기존 전체 예약 시스템 체크 제거 - 티어별 제어로 대체됨

    // 2. 사용자 월별 예약 제한 체크 (4일/월)
    const maxDaysPerMonth = settings.max_days_per_month || 4
    
    // 해당 월의 마지막 날짜 계산 (정확한 날짜)
    const lastDayOfMonth = new Date(year, month, 0).getDate()
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`
    
    const { data: reservations } = await supabase
      .from('reservations')
      .select('date')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .in('status', ['pending', 'approved'])

    const uniqueDatesThisMonth = new Set(reservations?.map(r => r.date) || [])
    if (uniqueDatesThisMonth.size >= maxDaysPerMonth) {
      return { 
        data: null, 
        error: { message: `월 예약 한도를 초과했습니다. (${uniqueDatesThisMonth.size}/${maxDaysPerMonth}일)` } 
      }
    }

    // 3. 해당 날짜의 예약 현황 확인 (동시성 제어)
    const { data: dateStatus, error: statusError } = await settingsAPI.getDateReservationStatus(regionCode, date)
    if (statusError) {
      return { data: null, error: statusError }
    }

    // 티어 시스템이 예약 가능 여부를 검증하므로 기존 is_open 체크는 제거
    // if (!dateStatus?.is_open) {
    //   return { data: null, error: { message: '해당 날짜는 예약이 종료되었습니다.' } }
    // }

    if (dateStatus?.is_full) {
      return {
        data: null,
        error: { message: `해당 날짜는 예약이 마감되었습니다. (최대 ${dateStatus.max_reservations_per_day}개)` }
      }
    }

    // 4. 동시성 제어를 위한 트랜잭션으로 예약 생성
    try {
      // PostgreSQL 트랜잭션 시작 및 FOR UPDATE로 행 잠금
      const { data: lockCheck } = await supabase
        .from('reservations')
        .select('id')
        .eq('region_id', regionId)
        .eq('date', date)
        .in('status', ['pending', 'approved'])

      // 다시 한번 정원 체크 (동시 요청 방지)
      const currentCount = lockCheck?.length || 0
      const maxReservations = dateStatus.max_reservations_per_day
      
      if (currentCount >= maxReservations) {
        return { 
          data: null, 
          error: { message: `해당 날짜는 예약이 마감되었습니다. (최대 ${maxReservations}개)` }
        }
      }

      // 예약 생성
      const { data: reservation, error: reservationError } = await supabase
        .from('reservations')
        .insert([{
          user_id: userId,
          region_id: regionId,
          date,
          status: 'pending'
        }])
        .select()
        .single()

      if (reservationError) {
        return { data: null, error: reservationError }
      }

      // 슬롯 생성
      const slotsWithReservationId = slots.map(slot => ({
        ...slot,
        reservation_id: reservation.id
      }))

      const { data: createdSlots, error: slotsError } = await supabase
        .from('reservation_slots')
        .insert(slotsWithReservationId)
        .select()

      if (slotsError) {
        // 예약 롤백
        await supabase
          .from('reservations')
          .delete()
          .eq('id', reservation.id)
        
        return { data: null, error: slotsError }
      }

      return {
        data: {
          ...reservation,
          reservation_slots: createdSlots
        },
        error: null
      }

    } catch (error) {
      console.error('예약 생성 중 예외:', error)
      return { data: null, error: { message: '예약 생성 중 오류가 발생했습니다.' } }
    }
  }
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

  // 지역별 시/군 조회
  async getCitiesByRegion(regionCode: string) {
    const { data, error } = await supabase
      .from('cities')
      .select(`
        *,
        regions!inner(name, code)
      `)
      .eq('regions.code', regionCode)
      .order('name')

    return { data, error }
  },

  // 모든 시/군 조회
  async getAllCities() {
    const { data, error } = await supabase
      .from('cities')
      .select(`
        *,
        regions!inner(name, code)
      `)
      .order('name')

    return { data, error }
  }
}

// 공지사항 관련 함수들
export const announcementAPI = {
  // 사용자용: 공지사항 목록 조회 (지역별 필터링 적용)
  async getAnnouncementsForUser(userId: string) {
    try {
      // 먼저 사용자의 지역 정보를 조회
      const { data: userData } = await supabase
        .from('users')
        .select('cities!inner(region_id)')
        .eq('id', userId)
        .single()

      const userRegionId = userData?.cities?.region_id

      let query = supabase
        .from('announcements')
        .select(`
          *,
          admins(username),
          regions(name)
        `)
        .eq('is_published', true)

      // userRegionId가 있으면 지역별 필터링 적용, 없으면 전체 공지만
      if (userRegionId) {
        query = query.or(`target_type.eq.all,and(target_type.eq.region,target_region_id.eq.${userRegionId})`)
      } else {
        query = query.eq('target_type', 'all')
      }

      const { data, error } = await query
        .order('is_important', { ascending: false })
        .order('created_at', { ascending: false })

      return { data, error }
    } catch (error) {
      console.error('getAnnouncementsForUser 오류:', error)
      return { data: null, error }
    }
  },

  // 공개 공지사항만 조회 (로그인하지 않은 사용자용)
  async getPublicAnnouncements() {
    const { data, error } = await supabase
      .from('announcements')
      .select(`
        *,
        admins(username),
        regions(name)
      `)
      .eq('is_published', true)
      .eq('target_type', 'all')
      .order('is_important', { ascending: false })
      .order('created_at', { ascending: false })

    return { data, error }
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

    const { data, error } = await query
      .order('is_important', { ascending: false })
      .order('created_at', { ascending: false })

    return { data, error }
  },

  // 공지사항 상세 조회
  async getAnnouncementById(id: string) {
    const { data, error } = await supabase
      .from('announcements')
      .select(`
        *,
        admins(username),
        regions(name)
      `)
      .eq('id', id)
      .single()

    return { data, error }
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
        headers: {
          'Content-Type': 'application/json',
        },
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
      headers: {
        'Content-Type': 'application/json',
      },
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
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      return { data: null, error: { message: errorData.error } }
    }
    
    const data = await response.json()
    return { data, error: null }
  },

  // 공지사항 조회수 증가
  async incrementViewCount(announcementId: string, userId: string) {
    // 중복 조회 방지를 위한 체크
    const { data: existingView } = await supabase
      .from('announcement_views')
      .select('id')
      .eq('announcement_id', announcementId)
      .eq('user_id', userId)
      .single()

    if (!existingView) {
      // 조회 기록 추가
      await supabase
        .from('announcement_views')
        .insert([{
          announcement_id: announcementId,
          user_id: userId
        }])

      // 조회수 증가
      const { data, error } = await supabase
        .rpc('increment_view_count', { announcement_id: announcementId })

      return { data, error }
    }

    return { data: null, error: null }
  }
}

// 홈페이지 팝업 관련 함수들
export const popupAPI = {
  // 활성화된 팝업 조회 (홈페이지용)
  async getActivePopups() {
    const currentTime = new Date().toISOString()
    
    const { data, error } = await supabase
      .from('homepage_popups')
      .select(`
        *,
        admins(username)
      `)
      .eq('is_active', true)
      .lte('start_date', currentTime)
      .or(`end_date.is.null,end_date.gte.${currentTime}`)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false })

    return { data, error }
  },

  // 모든 팝업 조회 (관리자용)
  async getAllPopups() {
    try {
      const response = await fetch('/api/admin/popups')
      
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
        headers: {
          'Content-Type': 'application/json',
        },
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
      headers: {
        'Content-Type': 'application/json',
      },
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
        headers: {
          'Content-Type': 'application/json',
        },
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
  async validateSession(sessionToken: string) {
    const { data, error } = await supabase
      .from('user_sessions')
      .select(`
        *,
        users!inner(*)
      `)
      .eq('session_token', sessionToken)
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString())
      .single()

    return { data, error }
  },

  // 세션 갱신 (활동 시간 업데이트)
  async refreshSession(sessionToken: string) {
    const { data, error } = await supabase
      .from('user_sessions')
      .update({ 
        last_activity: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24시간 연장
      })
      .eq('session_token', sessionToken)
      .eq('is_active', true)

    return { data, error }
  },

  // 로그아웃 (세션 비활성화)
  async logout(sessionToken: string) {
    const { data, error } = await supabase
      .from('user_sessions')
      .update({ is_active: false })
      .eq('session_token', sessionToken)

    return { data, error }
  },

  // 사용자의 모든 세션 비활성화
  async logoutAllSessions(userId: string) {
    const { data, error } = await supabase
      .from('user_sessions')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('is_active', true)

    return { data, error }
  },

  // 다중 로그인 감지
  async detectMultipleLogins(userId: string) {
    const { data, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString())

    return { 
      data: data || [], 
      error,
      hasMultipleSessions: (data?.length || 0) > 1
    }
  }
}

// 예약 동시성 제어 API
export const reservationConcurrencyAPI = {
  // 하루 최대예약개수 조회
  async getReservationCapacity(date: string, timeSlot: string) {
    const { data, error } = await supabase
      .from('daily_reservation_limits')
      .select('*')
      .eq('date', date)
      .single()

    return { data, error }
  },

  // 하루 최대예약개수 설정 (관리자용)
  async setDailyReservationLimit(regionId: number, date: string, maxReservations: number) {
    const { data, error } = await supabase
      .from('daily_reservation_limits')
      .upsert([{
        region_id: regionId,
        date: date,
        max_reservations: maxReservations
      }], {
        onConflict: 'region_id,date'
      })

    return { data, error }
  },

  // 하루 최대예약개수 체크 (동시성 제어)
  async checkDailyReservationLimit(userId: string, regionId: number, date: string, maxReservationsPerDay: number = 2) {
    const { data, error } = await supabase
      .rpc('check_daily_reservation_limit', {
        p_user_id: userId,
        p_region_id: regionId,
        p_date: date,
        p_max_reservations_per_day: maxReservationsPerDay
      })

    return { data, error }
  },

  // 사용자 월별 예약 제한 체크
  async checkUserMonthlyLimit(userId: string, year: number, month: number, maxDaysPerMonth: number = 4) {
    const { data, error } = await supabase
      .rpc('check_user_monthly_limit', {
        p_user_id: userId,
        p_year: year,
        p_month: month,
        p_max_days_per_month: maxDaysPerMonth
      })

    return { data, error }
  },

  // 예약 취소 시 하루 최대예약개수 감소는 실제 예약 삭제 시 자동 처리

  // 예약 대기열 조회
  async getReservationQueue(date: string, timeSlot: string) {
    const { data, error } = await supabase
      .from('reservation_transactions')
      .select(`
        *,
        users(organization_name, manager_name)
      `)
      .eq('reservation_date', date)
      .eq('time_slot', timeSlot)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    return { data, error }
  },

  // 일별 예약 현황 조회
  async getDailyReservationStatus(date: string) {
    const { data, error } = await supabase
      .from('daily_reservation_limits')
      .select('*')
      .eq('date', date)

    return { data, error }
  },

  // 월별 예약 현황 조회 (관리자용)
  async getMonthlyReservationStats(yearMonth: string) {
    const startDate = `${yearMonth}-01`
    const endDate = `${yearMonth}-31`

    const { data, error } = await supabase
      .from('daily_reservation_limits')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date')

    return { data, error }
  }
}

// ==========================================
// TIER MANAGEMENT API - NEW ADDITION
// ==========================================
export const tierAPI = {
  // Get all available tiers
  async getAllTiers() {
    const { data, error } = await supabase
      .from('member_tiers')
      .select('*')
      .eq('is_active', true)
      .order('tier_level')

    return { data, error }
  },

  // Get user's tier information with details
  async getUserTier(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select(`
        tier_id,
        member_tiers!inner(
          id,
          tier_name,
          tier_level,
          description,
          advance_reservation_days,
          monthly_reservation_limit,
          daily_slot_limit
        )
      `)
      .eq('id', userId)
      .single()

    return { data, error }
  },

  // Update member tier (Admin only)
  async updateMemberTier(userId: string, tierId: number) {
    const { data, error } = await supabase
      .from('users')
      .update({ tier_id: tierId })
      .eq('id', userId)
      .select(`
        *,
        member_tiers!inner(tier_name, tier_level)
      `)

    return { data, error }
  },

  // Bulk update member tiers (Admin only)
  async bulkUpdateMemberTiers(userIds: string[], tierId: number) {
    const { data, error } = await supabase
      .from('users')
      .update({ tier_id: tierId })
      .in('id', userIds)

    return { data, error }
  },

  // Get tier reservation settings for specific region/month
  async getTierReservationSettings(regionCode: string, yearMonth: string) {
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

  // Helper: Get tier by ID
  async getTierById(tierId: number) {
    const { data, error } = await supabase
      .from('member_tiers')
      .select('*')
      .eq('id', tierId)
      .single()

    return { data, error }
  },

  // Check if user can make reservation based on tier
  async canUserReserveByTier(userId: string, regionCode: string, targetDate: string) {
    // Get user's tier information
    const userTier = await this.getUserTier(userId)
    if (!userTier.data) {
      return {
        canReserve: false,
        reason: '사용자 티어 정보를 찾을 수 없습니다.'
      }
    }

    const yearMonth = targetDate.substring(0, 7) // Extract YYYY-MM from YYYY-MM-DD

    // Get tier reservation settings for the region and month
    const { data: settings, error } = await supabase
      .from('tier_reservation_settings')
      .select('*')
      .eq('region_code', regionCode)
      .eq('year_month', yearMonth)
      .eq('tier_id', userTier.data.tier_id)
      .single()

    // 설정이 없으면 기본적으로 예약 종료 상태
    if (error || !settings) {
      const tierName = userTier.data.member_tiers?.tier_name || 'Standard'
      const startDate = tierName === 'Priority' ? '20일' : '21일'
      return {
        canReserve: false,
        reason: `예약기간이 아닙니다. ${tierName} 회원은 매월 ${startDate} 예약을 시작합니다. ${startDate}이 주말일경우 이전 영업일에 시작합니다.`
      }
    }

    // Check if tier reservation is open (admin must have started it)
    if (!settings.is_open) {
      const tierName = userTier.data.member_tiers?.tier_name || 'Standard'
      const startDate = tierName === 'Priority' ? '20일' : '21일'
      return {
        canReserve: false,
        reason: `예약기간이 아닙니다. ${tierName} 회원은 매월 ${startDate} 예약을 시작합니다. ${startDate}이 주말일경우 이전 영업일에 시작합니다.`
      }
    }

    // 관리자가 티어별 예약을 시작한 경우 예약 가능
    return { canReserve: true }
  },

  // Get tier settings for all tiers in a region/month (Admin use)
  async getAllTierSettingsForMonth(regionCode: string, yearMonth: string) {
    const { data, error } = await supabase
      .from('tier_reservation_settings')
      .select(`
        *,
        member_tiers!inner(*)
      `)
      .eq('region_code', regionCode)
      .eq('year_month', yearMonth)
      .order('tier_id')

    return { data, error }
  }
}