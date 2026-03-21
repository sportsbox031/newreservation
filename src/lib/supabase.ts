import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { v4 as uuidv4 } from 'uuid'
import { hashPassword, isBcryptHash, legacyHashPassword, verifyPassword } from './passwordHash'
import { getErrorMessage, withTimeout } from '@/lib/requestUtils'
import {
  getDashboardCalendarClientCacheKey,
  getDashboardBootstrapClientCacheTtl,
  getDashboardMeClientCacheKey,
} from '@/lib/dashboardBootstrap'
import { mapReservationErrorMessage } from '@/lib/reservationMessages'

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
  if (typeof window === 'undefined') return { 'Content-Type': 'application/json' }

  const sessionToken = localStorage.getItem('sessionToken')
  return {
    'Content-Type': 'application/json',
    ...(sessionToken && { 'Authorization': `Bearer ${sessionToken}` })
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
  const { data, error } = await runQueryWithTimeout(
    supabase
      .from('cities')
      .select('id')
      .eq('name', cityName)
      .single(),
    '시/군 정보를 불러오는 중 시간이 초과되었습니다.'
  )
  
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
    // Get city_id from city name
    const cityId = await getCityId(userData.city_name)
    if (!cityId) {
      return { data: null, error: { message: '존재하지 않는 시/군입니다.' } }
    }

    // Hash password with bcrypt (안전한 해싱)
    const password_hash = await hashPassword(userData.password)

    console.log('🔍 회원가입 데이터:', {
      organization_type: userData.organization_type,
      student_count: userData.student_count,
      class_count: userData.class_count,
      student_count_type: typeof userData.student_count,
      class_count_type: typeof userData.class_count
    })

    // organization_type을 DB에 저장, DB 트리거가 이를 기반으로 tier 자동 계산
    // welfare → 무조건 Standard, school → student_count/class_count 기반 계산
    const insertData: any = {
      organization_type: userData.organization_type,
      organization_name: userData.organization_name,
      password_hash,
      manager_name: userData.manager_name,
      city_id: cityId,
      phone: userData.phone,
      email: userData.email,
      student_count: userData.student_count,
      class_count: userData.class_count,
      privacy_consent: userData.privacy_consent,
      status: 'pending'
    }

    console.log('📤 Insert 데이터:', insertData)

    const { data, error } = await supabase
      .from('users')
      .insert([insertData])
      .select()

    console.log('✅ Insert 결과:', { data, error })

    return { data, error }
  },

  // 로그인 (하이브리드: bcrypt + 레거시 btoa 지원)
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

    // 1단계: bcrypt로 검증 시도
    let isPasswordValid = false
    let needsMigration = false

    try {
      if (isBcryptHash(data.password_hash)) {
        isPasswordValid = await verifyPassword(password, data.password_hash)
      } else {
        console.error('Invalid user password hash format during login', {
          userId: data.id,
          organizationName: data.organization_name,
          hashPreview: String(data.password_hash).slice(0, 20),
        })
      }
    } catch (error) {
      console.error('User bcrypt verification failed', {
        userId: data.id,
        organizationName: data.organization_name,
        error,
      })
    }

    // bcrypt 검증 실패 시 → 레거시 btoa 해싱 시도
    if (!isPasswordValid) {
      const legacyHash = legacyHashPassword(password)
      if (data.password_hash === legacyHash) {
        isPasswordValid = true
        needsMigration = true // 마이그레이션 필요 표시
      }
    }

    if (!isPasswordValid) {
      return { data: null, error: { message: '비밀번호가 일치하지 않습니다.' } }
    }

    // 2단계: 레거시 해싱이면 bcrypt로 즉시 업데이트
    if (needsMigration) {
      const newHash = await hashPassword(password)
      await supabase
        .from('users')
        .update({ password_hash: newHash })
        .eq('id', data.id)

      // 업데이트된 해시로 data 갱신
      data.password_hash = newHash
    }

    // 멀티 로그인 방지: 기존 활성 세션 모두 비활성화 (일반 사용자는 한 PC에서만 로그인 가능)
    await supabase
      .from('user_sessions')
      .update({ is_active: false })
      .eq('user_id', data.id)
      .eq('is_active', true)

    // 새 세션 생성
    const sessionToken = generateSessionToken()
    const clientInfo = getClientInfo(request)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24시간 후 만료

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
      console.error('Session creation failed')
      return { data: null, error: { message: '로그인 처리 중 오류가 발생했습니다.' } }
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

    try {
      const { data, error } = await runQueryWithTimeout(
        query,
        '승인 대기 회원을 불러오는 중 시간이 초과되었습니다.',
        LONG_QUERY_TIMEOUT_MS
      )
      return { data, error }
    } catch (error) {
      return { data: null, error: timeoutError(getErrorMessage(error, '승인 대기 회원을 불러오는 중 오류가 발생했습니다.')) }
    }
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

    try {
      const { data, error } = await runQueryWithTimeout(
        query,
        '승인된 회원을 불러오는 중 시간이 초과되었습니다.',
        LONG_QUERY_TIMEOUT_MS
      )
      return { data, error }
    } catch (error) {
      return { data: null, error: timeoutError(getErrorMessage(error, '승인된 회원을 불러오는 중 오류가 발생했습니다.')) }
    }
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
    const password_hash = await hashPassword(newPassword)

    if (!isBcryptHash(password_hash)) {
      console.error('Generated invalid password hash during user reset', {
        userId,
        hashPreview: String(password_hash).slice(0, 20),
      })
      return { data: null, error: { message: '비밀번호 초기화 중 해시 생성에 실패했습니다.' } }
    }

    const { data, error } = await supabase
      .from('users')
      .update({ password_hash })
      .eq('id', userId)
      .select()

    return { data, error }
  },

  // 회원 삭제 (관리자용) - 관련 데이터 모두 삭제
  async deleteMember(userId: string) {
    try {
      // 1. 먼저 해당 사용자의 모든 예약 ID 조회
      const { data: reservations } = await supabase
        .from('reservations')
        .select('id')
        .eq('user_id', userId)

      const reservationIds = reservations?.map(r => r.id) || []

      // 2. 예약 슬롯 삭제 (reservations를 참조)
      if (reservationIds.length > 0) {
        await supabase
          .from('reservation_slots')
          .delete()
          .in('reservation_id', reservationIds)

        // 3. 예약 로그 삭제 (reservations를 참조)
        await supabase
          .from('reservation_logs')
          .delete()
          .in('reservation_id', reservationIds)
      }

      // 4. 예약 삭제
      await supabase
        .from('reservations')
        .delete()
        .eq('user_id', userId)

      // 5. 예약 트랜잭션 삭제
      await supabase
        .from('reservation_transactions')
        .delete()
        .eq('user_id', userId)

      // 6. 공지사항 조회 기록 삭제
      await supabase
        .from('announcement_views')
        .delete()
        .eq('user_id', userId)

      // 7. 사용자 세션 삭제
      await supabase
        .from('user_sessions')
        .delete()
        .eq('user_id', userId)

      // 8. 마지막으로 사용자 삭제
      const { data, error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)

      return { data, error }
    } catch (error) {
      console.error('회원 삭제 중 오류:', error)
      return { data: null, error }
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
    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()

    return { data, error }
  },

  // 비밀번호 변경 (현재 비밀번호 확인 필요)
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    // 현재 비밀번호 확인
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', userId)
      .single()

    if (fetchError) {
      return { data: null, error: { message: '사용자 정보를 찾을 수 없습니다.' } }
    }

    // 현재 비밀번호 검증 (bcrypt 사용)
    const isPasswordValid = await verifyPassword(currentPassword, user.password_hash)
    if (!isPasswordValid) {
      return { data: null, error: { message: '현재 비밀번호가 일치하지 않습니다.' } }
    }

    // 새 비밀번호로 업데이트
    const newPasswordHash = await hashPassword(newPassword)
    const { data, error } = await supabase
      .from('users')
      .update({ password_hash: newPasswordHash })
      .eq('id', userId)
      .select()

    return { data, error }
  },

  // 회원 등급 변경
  async updateMemberTier(userId: string, tier: 'Priority' | 'Standard') {
    const { data, error } = await supabase
      .from('users')
      .update({ tier })
      .eq('id', userId)
      .select()

    return { data, error }
  },

  // 회원 학생수/학급수 업데이트
  async updateMemberCounts(userId: string, student_count: number, class_count: number) {
    const { data, error } = await supabase
      .from('users')
      .update({ student_count, class_count })
      .eq('id', userId)
      .select()

    return { data, error }
  }
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

  // 차단된 날짜 추가 (지역별) - 시간대별 차단 지원
  async addBlockedDate(
    date: string,
    reason: string,
    regionCode: string,
    startTime?: string | null,  // HH:MM 형식, null이면 하루 전체 차단
    endTime?: string | null     // HH:MM 형식, null이면 하루 전체 차단
  ) {
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
      .in('status', ['pending', 'approved', 'cancel_requested'])

    if (regionCode) {
      query = query.eq('users.cities.regions.code', regionCode)
    }

    const { data, error } = await query.order('created_at', { ascending: true })
    return { data, error }
  },

  // 사용자 예약 목록 조회
  async getUserReservations(userId: string) {
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

    const startTimes = slots.map(slot => slot.start_time)
    const uniqueStartTimes = new Set(startTimes)

    if (startTimes.length !== uniqueStartTimes.size) {
      return {
        data: null,
        error: { message: '시작 시간이 중복됩니다. 각 타임의 시작 시간은 서로 달라야 합니다.' }
      }
    }
    
    // 1. 관리자 설정값 조회
    const selectedDateObj = new Date(date)
    const year = selectedDateObj.getFullYear()
    const month = selectedDateObj.getMonth() + 1

    const lastDayOfMonth = new Date(year, month, 0).getDate()
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`

    let settings
    let reservations
    let blockedDates

    try {
      const [settingsResult, reservationsResult, blockedDatesResult] = await Promise.all([
        settingsAPI.getReservationSettings(regionCode, year, month),
        runQueryWithTimeout(
          supabase
            .from('reservations')
            .select('date')
            .eq('user_id', userId)
            .gte('date', startDate)
            .lte('date', endDate)
            .in('status', ['pending', 'approved', 'cancel_requested']),
          '월 예약 한도를 확인하는 중 시간이 초과되었습니다.'
        ),
        runQueryWithTimeout(
          supabase
            .from('blocked_dates')
            .select('*')
            .eq('region_id', regionId)
            .eq('date', date),
          '차단 시간을 확인하는 중 시간이 초과되었습니다.'
        )
      ])

      if (settingsResult.error || !settingsResult.data) {
        return { data: null, error: { message: settingsResult.error?.message || '예약 설정을 확인할 수 없습니다.' } }
      }

      if (reservationsResult.error) {
        return { data: null, error: reservationsResult.error }
      }

      if (blockedDatesResult.error) {
        return { data: null, error: blockedDatesResult.error }
      }

      settings = settingsResult.data
      reservations = reservationsResult.data
      blockedDates = blockedDatesResult.data
    } catch (error) {
      return { data: null, error: { message: getErrorMessage(error, '예약 가능 여부를 확인하는 중 오류가 발생했습니다.') } }
    }

    const maxDaysPerMonth = settings.max_days_per_month || 4

    // 같은 날짜 중복 예약 검증
    const existingReservationOnDate = reservations?.find(r => r.date === date)
    if (existingReservationOnDate) {
      return {
        data: null,
        error: { message: '이미 해당 날짜에 예약이 존재합니다. 같은 날짜에 중복 예약은 불가능합니다.' }
      }
    }

    const uniqueDatesThisMonth = new Set(reservations?.map(r => r.date) || [])
    if (uniqueDatesThisMonth.size >= maxDaysPerMonth) {
      return {
        data: null,
        error: { message: `월 예약 한도를 초과했습니다. (${uniqueDatesThisMonth.size}/${maxDaysPerMonth}일)` }
      }
    }

    if (blockedDates && blockedDates.length > 0) {
      for (const blocked of blockedDates) {
        // 하루 전체 차단인 경우 (start_time, end_time이 null)
        if (!blocked.start_time || !blocked.end_time) {
          return {
            data: null,
            error: { message: `${date}은(는) 예약이 차단된 날짜입니다. 사유: ${blocked.reason || '관리자 설정'}` }
          }
        }

        // 시간대별 차단인 경우 - 예약 슬롯과 차단 시간대 겹침 검사
        for (const slot of slots) {
          const slotStart = slot.start_time
          const slotEnd = slot.end_time
          const blockedStart = blocked.start_time
          const blockedEnd = blocked.end_time

          // 시간대 겹침 검사: 슬롯 시작 < 차단 종료 AND 슬롯 종료 > 차단 시작
          if (slotStart < blockedEnd && slotEnd > blockedStart) {
            return {
              data: null,
              error: {
                message: `${date} ${blockedStart}~${blockedEnd}는 예약이 차단된 시간대입니다. 사유: ${blocked.reason || '관리자 설정'}`
              }
            }
          }
        }
      }
    }

    // 3. 예약 생성 (DB Trigger가 정원 체크를 담당)
    // Trigger: check_capacity_before_insert가 정원 초과 시 자동으로 에러 발생
    try {
      // 예약 생성
      const { data: reservation, error: reservationError } = await runQueryWithTimeout(
        supabase
          .from('reservations')
          .insert([{
            user_id: userId,
            region_id: regionId,
            date,
            status: 'pending'
          }])
          .select()
          .single(),
        '예약 신청이 지연되고 있습니다. 잠시 후 다시 시도해주세요.',
        MUTATION_TIMEOUT_MS
      )

      if (reservationError) {
        // Trigger에서 발생한 정원 초과 에러 처리
        // P0001: Advisory Lock 트리거 에러 코드
        // 23505: 레거시 unique_violation 코드 (호환성 유지)
        if (reservationError.message?.includes('예약이 마감되었습니다') ||
            reservationError.code === 'P0001' ||
            reservationError.code === '23505') {
          return {
            data: null,
            error: { message: '예약이 마감되었습니다. 다른 날짜를 선택해주세요.' }
          }
        }
        return { data: null, error: reservationError }
      }

      // 슬롯 생성
      const slotsWithReservationId = slots.map(slot => ({
        ...slot,
        reservation_id: reservation.id
      }))

      const { data: createdSlots, error: slotsError } = await runQueryWithTimeout(
        supabase
          .from('reservation_slots')
          .insert(slotsWithReservationId)
          .select(),
        '예약 시간 저장이 지연되고 있습니다. 잠시 후 다시 시도해주세요.',
        MUTATION_TIMEOUT_MS
      )

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

export const dashboardAPI = {
  async getCalendar(year: number, month: number) {
    try {
      const sessionToken = typeof window !== 'undefined' ? localStorage.getItem('session_token') : null
      const cacheKey = getDashboardCalendarClientCacheKey(year, month, sessionToken)
      if (typeof window !== 'undefined') {
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
        fetch(`/api/dashboard/calendar?year=${year}&month=${month}`, {
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
  async getMonthGate(year: number, month: number) {
    try {
      const response = await withTimeout(
        fetch(`/api/dashboard/gate?year=${year}&month=${month}`, {
          method: 'GET',
          headers: getUserAuthHeaders()
        }),
        QUERY_TIMEOUT_MS,
        '예약 오픈 상태를 불러오는 중 시간이 초과되었습니다.'
      )

      const result = await response.json()

      if (!response.ok) {
        return { data: null, error: { message: result.error || '예약 오픈 상태를 불러오지 못했습니다.' } }
      }

      return { data: result.data, error: null }
    } catch (error) {
      return { data: null, error: { message: getErrorMessage(error, '예약 오픈 상태를 불러오는 중 오류가 발생했습니다.') } }
    }
  },
  async getMe(year: number, month: number) {
    try {
      const sessionToken = typeof window !== 'undefined' ? localStorage.getItem('session_token') : null
      const cacheKey = getDashboardMeClientCacheKey(year, month, sessionToken)
      if (typeof window !== 'undefined') {
        const cachedValue = localStorage.getItem(cacheKey) || sessionStorage.getItem(cacheKey)
        if (cachedValue) {
          const cached = JSON.parse(cachedValue)
          if (Date.now() - cached.cachedAt < 5000) {
            return { data: cached.data, error: null }
          }
        }
      }

      const response = await withTimeout(
        fetch(`/api/dashboard/me?year=${year}&month=${month}`, {
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
  async getBootstrap(year: number, month: number) {
    try {
      const [calendarResult, meResult] = await Promise.all([
        this.getCalendar(year, month),
        this.getMe(year, month)
      ])

      if (calendarResult.error) {
        return { data: null, error: calendarResult.error }
      }

      if (meResult.error) {
        return { data: null, error: meResult.error }
      }

      return {
        data: {
          ...(meResult.data || {}),
          ...(calendarResult.data || {}),
        },
        error: null
      }
    } catch (error) {
      return { data: null, error: { message: getErrorMessage(error, '대시보드 정보를 불러오는 중 오류가 발생했습니다.') } }
    }
  }
}

// 공지사항 관련 함수들
export const announcementAPI = {
  // 사용자용: 공지사항 목록 조회 (지역별 필터링 적용)
  async getAnnouncementsForUser(userId: string) {
    try {
      // 먼저 사용자의 지역 정보를 조회
      const { data: userData, error: userError } = await runQueryWithTimeout(
        supabase
          .from('users')
          .select('cities!inner(region_id)')
          .eq('id', userId)
          .single(),
        '사용자 공지사항 설정을 불러오는 중 시간이 초과되었습니다.'
      )

      if (userError) {
        return { data: null, error: userError }
      }

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

      const { data, error } = await runQueryWithTimeout(
        query
          .order('is_important', { ascending: false })
          .order('created_at', { ascending: false }),
        '공지사항 목록을 불러오는 중 시간이 초과되었습니다.'
      )

      return { data, error }
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
  async validateSession(sessionToken: string) {
    try {
      const { data, error } = await runQueryWithTimeout(
        supabase
          .from('user_sessions')
          .select(`
            *,
            users!inner(
              *,
              cities!inner(name, regions!inner(name, code))
            )
          `)
          .eq('session_token', sessionToken)
          .eq('is_active', true)
          .gte('expires_at', new Date().toISOString())
          .single(),
        '세션 확인 응답이 지연되고 있습니다.'
      )

      return { data, error }
    } catch (error) {
      return { data: null, error: timeoutError(getErrorMessage(error, '세션 확인 중 오류가 발생했습니다.')) }
    }
  },

  // 세션 갱신 (활동 시간 업데이트)
  async refreshSession(sessionToken: string) {
    try {
      const { data, error } = await runQueryWithTimeout(
        supabase
          .from('user_sessions')
          .update({ 
            last_activity: new Date().toISOString(),
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          })
          .eq('session_token', sessionToken)
          .eq('is_active', true),
        '세션 갱신 응답이 지연되고 있습니다.'
      )

      return { data, error }
    } catch (error) {
      return { data: null, error: timeoutError(getErrorMessage(error, '세션 갱신 중 오류가 발생했습니다.')) }
    }
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
  if (typeof window === 'undefined') return { 'Content-Type': 'application/json' }

  const sessionToken = localStorage.getItem('session_token')
  return {
    'Content-Type': 'application/json',
    ...(sessionToken && { 'Authorization': `Bearer ${sessionToken}` })
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
    let user
    let error
    try {
      const response = await runQueryWithTimeout(
        supabase
          .from('users')
          .select('tier')
          .eq('id', userId)
          .single(),
        '사용자 등급을 불러오는 중 시간이 초과되었습니다.'
      )
      user = response.data
      error = response.error
    } catch (requestError) {
      return { data: null, error: timeoutError(getErrorMessage(requestError, '사용자 등급을 불러오는 중 오류가 발생했습니다.')) }
    }

    if (error || !user) {
      return { data: null, error }
    }

    // Map simple tier to expected structure
    const tierName = user.tier || 'Standard'
    const tierId = tierName === 'Priority' ? 1 : 2

    const data = {
      tier_id: tierId,
      member_tiers: {
        id: tierId,
        tier_name: tierName,
        tier_level: tierId,
        description: tierName === 'Priority'
          ? 'Priority 회원 (학생수 ≤240 OR 학급수 ≤11)'
          : 'Standard 회원',
        advance_reservation_days: tierName === 'Priority' ? 1 : 0,
        monthly_reservation_limit: 4,
        daily_slot_limit: 2
      }
    }

    return { data, error: null }
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
    let settings
    let error
    try {
      const response = await runQueryWithTimeout(
        supabase
          .from('tier_reservation_settings')
          .select('*')
          .eq('region_code', regionCode)
          .eq('year_month', yearMonth)
          .eq('tier_id', userTier.data.tier_id)
          .single(),
        '예약 신청 가능 여부를 확인하는 중 시간이 초과되었습니다.'
      )
      settings = response.data
      error = response.error
    } catch (requestError) {
      return {
        canReserve: false,
        reason: getErrorMessage(requestError, '예약 신청 가능 여부를 확인하는 중 오류가 발생했습니다.')
      }
    }

    // 설정이 없으면 기본적으로 예약 종료 상태
    if (error || !settings) {
      const tierName = userTier.data.member_tiers?.tier_name || 'Standard'
      const startDate = tierName === 'Priority' ? '20일' : '21일'
      return {
        canReserve: false,
        reason: `신청기간이 아닙니다. 공지사항의 신청기간을 확인해주세요.`
      }
    }

    // Check if tier reservation is open (admin must have started it)
    if (!settings.is_open) {
      const tierName = userTier.data.member_tiers?.tier_name || 'Standard'
      const startDate = tierName === 'Priority' ? '20일' : '21일'
      return {
        canReserve: false,
        reason: `신청기간이 아닙니다. 공지사항의 신청기간을 확인해주세요.`
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

// 관리자 계정 관리 API
export const adminAPI = {
  // 관리자 로그인 (하이브리드: bcrypt + 레거시 btoa 지원)
  async login(username: string, password: string, request?: Request) {
    try {
      // 관리자 조회
      const { data: admin, error: fetchError } = await supabase
        .from('admins')
        .select('*')
        .eq('username', username)
        .single()

      if (fetchError || !admin) {
        return { data: null, error: { message: '등록되지 않은 관리자 계정입니다.' } }
      }

      // 비밀번호 검증 (하이브리드)
      let isPasswordValid = false
      let needsMigration = false

      try {
        isPasswordValid = await verifyPassword(password, admin.password_hash)
      } catch (error) {
        // bcrypt 검증 실패 - 레거시 방식 시도
      }

      // bcrypt 검증 실패 시 → 레거시 btoa 해싱 시도
      if (!isPasswordValid) {
        const legacyHash = legacyHashPassword(password)
        if (admin.password_hash === legacyHash) {
          isPasswordValid = true
          needsMigration = true
        }
      }

      if (!isPasswordValid) {
        return { data: null, error: { message: '비밀번호가 일치하지 않습니다.' } }
      }

      // 레거시 해싱이면 bcrypt로 즉시 업데이트
      if (needsMigration) {
        const newHash = await hashPassword(password)
        await supabase
          .from('admins')
          .update({ password_hash: newHash })
          .eq('id', admin.id)
      }

      // 관리자는 여러 PC에서 동시 로그인 가능 (기존 세션 유지)
      // 일반 사용자와 달리 관리자는 멀티 로그인 허용

      // 새 세션 생성
      const sessionToken = generateSessionToken()
      const clientInfo = getClientInfo(request)
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24시간 후 만료

      const { error: sessionError } = await supabase
        .from('admin_sessions')
        .insert([{
          admin_id: admin.id,
          session_token: sessionToken,
          user_agent: clientInfo.user_agent,
          ip_address: clientInfo.ip_address,
          expires_at: expiresAt.toISOString(),
          is_active: true
        }])

      if (sessionError) {
        console.error('Session creation failed:', sessionError)
        return { data: null, error: { message: '로그인 처리 중 오류가 발생했습니다.' } }
      }

      // 지역 ID 가져오기 (role이 south/north인 경우)
      let region_id = null
      if (admin.role === 'south' || admin.role === 'north') {
        const regionCode = admin.role === 'south' ? 'south' : 'north'
        const regionIdResult = await this.getRegionIdByCode(regionCode)
        region_id = regionIdResult
      }

      // 로그인 성공 (세션 토큰 포함)
      return {
        data: {
          id: admin.id,
          username: admin.username,
          role: admin.role,
          region_id: region_id,
          phone: admin.phone,
          email: admin.email,
          isAuthenticated: true,
          session_token: sessionToken,
          session_expires: expiresAt
        },
        error: null
      }
    } catch (error) {
      console.error('관리자 로그인 오류:', error)
      return { data: null, error: { message: '로그인 중 오류가 발생했습니다.' } }
    }
  },

  // 지역 코드로 지역 ID 조회
  async getRegionIdByCode(code: string): Promise<number | null> {
    const { data, error } = await supabase
      .from('regions')
      .select('id')
      .eq('code', code)
      .single()

    if (error) return null
    return data.id
  },

  // 관리자 정보 업데이트
  async updateAdminInfo(adminId: string, updates: { username?: string; phone?: string; email?: string }) {
    try {
      console.log('📥 updateAdminInfo 호출:', { adminId, updates })

      const { data, error } = await supabase
        .from('admins')
        .update(updates)
        .eq('id', adminId)
        .select()

      console.log('📤 Supabase 응답:', {
        data,
        error,
        errorType: error ? typeof error : 'null',
        errorKeys: error ? Object.keys(error) : []
      })

      if (error) {
        console.error('DB 업데이트 오류:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: JSON.stringify(error)
        })
      }

      return { data, error }
    } catch (error) {
      console.error('예외 발생:', error)
      return { data: null, error: { message: '업데이트 중 예외가 발생했습니다.' } }
    }
  },

  // 관리자 비밀번호 변경
  async changeAdminPassword(adminId: string, currentPassword: string, newPassword: string) {
    // 현재 비밀번호 확인
    const { data: admin, error: fetchError } = await supabase
      .from('admins')
      .select('password_hash')
      .eq('id', adminId)
      .single()

    if (fetchError) {
      return { data: null, error: { message: '관리자 정보를 찾을 수 없습니다.' } }
    }

    // 현재 비밀번호 검증 (bcrypt 사용)
    const isPasswordValid = await verifyPassword(currentPassword, admin.password_hash)
    if (!isPasswordValid) {
      return { data: null, error: { message: '현재 비밀번호가 일치하지 않습니다.' } }
    }

    // 새 비밀번호로 업데이트
    const newPasswordHash = await hashPassword(newPassword)
    const { data, error } = await supabase
      .from('admins')
      .update({ password_hash: newPasswordHash })
      .eq('id', adminId)
      .select()

    return { data, error }
  },

  // 관리자 ID로 조회
  async getAdminById(adminId: string) {
    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .eq('id', adminId)
      .single()

    return { data, error }
  }
}
