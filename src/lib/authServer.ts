import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { v4 as uuidv4 } from 'uuid'

import { getErrorMessage, withTimeout } from '@/lib/requestUtils'
import { formatPhoneNumber } from '@/lib/phone'
import { hashPassword, isBcryptHash, legacyHashPassword, verifyPassword } from '@/lib/passwordHash'
import { sendNewMemberAdminNotification } from '@/lib/aligo'
import {
  buildAdminLoginResult,
  buildSessionValidationResult,
  buildUserLoginResult,
  getAdminRegionCode,
  getClientInfoFromHeaders,
} from '@/lib/authRouteHelpers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
  },
})

const QUERY_TIMEOUT_MS = 8000
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000

function generateSessionToken(): string {
  return `${uuidv4()}_${Date.now()}_${Math.random().toString(36).substring(2)}`
}

function timeoutError(message: string) {
  return { message }
}

async function runQueryWithTimeout<T>(promise: PromiseLike<T>, message: string): Promise<T> {
  return withTimeout(promise, QUERY_TIMEOUT_MS, message)
}

async function getCityIdByName(cityName: string): Promise<number | null> {
  const { data, error } = await runQueryWithTimeout(
    supabaseAdmin
      .from('cities')
      .select('id')
      .eq('name', cityName)
      .single(),
    '시/군 정보를 불러오는 중 시간이 초과되었습니다.'
  )

  if (error || !data) {
    return null
  }

  return data.id
}

async function getRegionIdByCode(regionCode: 'south' | 'north'): Promise<number | null> {
  const { data, error } = await runQueryWithTimeout(
    supabaseAdmin
      .from('regions')
      .select('id')
      .eq('code', regionCode)
      .single(),
    '지역 정보를 불러오는 중 시간이 초과되었습니다.'
  )

  if (error || !data) {
    return null
  }

  return data.id
}

// 신규 회원가입 신청 시 해당 지역(남부/북부) 관리자에게 알림톡 발송
// (회원가입 자체는 정상 처리하고, 알림 실패는 무시한다)
async function notifyRegionAdminsOfNewMember(cityId: number, organizationName: string) {
  // 신규 회원 안내 알림톡 템플릿 코드 (Aligo 등록 코드). 환경변수로 덮어쓸 수 있다.
  const tplCode = process.env.NEXT_PUBLIC_ALIGO_NEW_MEMBER_ADMIN_TPL_CODE || 'UI_6779'

  try {
    // 가입 도시 → 지역 코드(south/north) 조회
    const { data: city, error: cityError } = await runQueryWithTimeout(
      supabaseAdmin
        .from('cities')
        .select('regions!inner(code)')
        .eq('id', cityId)
        .single(),
      '지역 정보를 불러오는 중 시간이 초과되었습니다.'
    )

    const regionCode = (city as { regions?: { code?: string } } | null)?.regions?.code
    if (cityError || (regionCode !== 'south' && regionCode !== 'north')) {
      console.warn('신규 회원 알림: 지역 정보를 확인할 수 없어 발송을 건너뜁니다.', cityError)
      return
    }

    // 해당 지역 관리자(role = south/north) 중 휴대전화번호가 등록된 계정 조회
    const { data: admins, error: adminError } = await runQueryWithTimeout(
      supabaseAdmin
        .from('admins')
        .select('phone')
        .eq('role', regionCode),
      '관리자 정보를 불러오는 중 시간이 초과되었습니다.'
    )

    if (adminError) {
      console.error('신규 회원 알림: 관리자 조회 오류', adminError)
      return
    }

    const phones = (admins || [])
      .map((admin) => admin.phone)
      .filter((phone): phone is string => !!phone && phone.trim().length > 0)

    if (phones.length === 0) {
      console.warn(`신규 회원 알림: ${regionCode} 지역 관리자 연락처가 없어 발송을 건너뜁니다.`)
      return
    }

    await Promise.all(
      phones.map((phone) =>
        sendNewMemberAdminNotification(phone, organizationName, tplCode).catch((err) =>
          console.error('신규 회원 관리자 알림톡 발송 오류:', err)
        )
      )
    )
  } catch (err) {
    console.error('신규 회원 관리자 알림 처리 오류:', err)
  }
}

export async function registerMemberOnServer(userData: {
  organization_type: 'school' | 'welfare'
  organization_name: string
  password: string
  manager_name: string
  city_name: string
  phone: string
  email: string
  student_count: number
  class_count: number
  privacy_consent: boolean
}) {
  try {
    const cityId = await getCityIdByName(userData.city_name)
    if (!cityId) {
      return { data: null, error: { message: '존재하지 않는 시/군입니다.' } }
    }

    const passwordHash = await hashPassword(userData.password)

    const { data, error } = await runQueryWithTimeout(
      supabaseAdmin
        .from('users')
        .insert([{
          organization_type: userData.organization_type,
          organization_name: userData.organization_name,
          password_hash: passwordHash,
          manager_name: userData.manager_name,
          city_id: cityId,
          phone: formatPhoneNumber(userData.phone),
          email: userData.email,
          student_count: userData.student_count,
          class_count: userData.class_count,
          privacy_consent: userData.privacy_consent,
          // 학교가 아닌 단체(아동복지시설 등)는 학교알리미 조회 대상이 아니므로 Standard 고정.
          // tier를 명시하면 DB 트리거가 재계산하지 않는다.
          ...(userData.organization_type === 'welfare' ? { tier: 'Standard' as const } : {}),
          status: 'pending',
        }])
        .select(),
      '회원가입 처리 중 시간이 초과되었습니다.'
    )

    // 가입 성공 시 해당 지역 관리자에게 알림톡 발송 (실패해도 가입은 정상 처리)
    if (!error && data && data.length > 0) {
      await notifyRegionAdminsOfNewMember(cityId, userData.organization_name)
    }

    return { data, error }
  } catch (error) {
    return {
      data: null,
      error: timeoutError(getErrorMessage(error, '회원가입 처리 중 오류가 발생했습니다.')),
    }
  }
}

export async function loginMemberOnServer(
  organizationName: string,
  password: string,
  headers: Headers
) {
  try {
    const { data, error } = await runQueryWithTimeout(
      supabaseAdmin
        .from('users')
        .select(`
          *,
          cities!inner(name, regions!inner(name, code))
        `)
        .eq('organization_name', organizationName)
        .eq('status', 'approved')
        .single(),
      '로그인 처리 중 시간이 초과되었습니다.'
    )

    if (error || !data) {
      return { data: null, error: error || { message: '등록되지 않은 단체명입니다.' } }
    }

    let isPasswordValid = false
    let needsMigration = false

    try {
      if (isBcryptHash(data.password_hash)) {
        isPasswordValid = await verifyPassword(password, data.password_hash)
      }
    } catch (error) {
      console.error('사용자 bcrypt 검증 오류:', error)
    }

    if (!isPasswordValid) {
      const legacyHash = legacyHashPassword(password)
      if (data.password_hash === legacyHash) {
        isPasswordValid = true
        needsMigration = true
      }
    }

    if (!isPasswordValid) {
      return { data: null, error: { message: '비밀번호가 일치하지 않습니다.' } }
    }

    if (needsMigration) {
      const newHash = await hashPassword(password)
      await supabaseAdmin
        .from('users')
        .update({ password_hash: newHash })
        .eq('id', data.id)

      data.password_hash = newHash
    }

    await supabaseAdmin
      .from('user_sessions')
      .update({ is_active: false })
      .eq('user_id', data.id)
      .eq('is_active', true)

    const sessionToken = generateSessionToken()
    const clientInfo = getClientInfoFromHeaders({
      'user-agent': headers.get('user-agent'),
      'x-forwarded-for': headers.get('x-forwarded-for'),
      'x-real-ip': headers.get('x-real-ip'),
    })
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString()

    const { error: sessionError } = await runQueryWithTimeout(
      supabaseAdmin
        .from('user_sessions')
        .insert([{
          user_id: data.id,
          session_token: sessionToken,
          user_agent: clientInfo.user_agent,
          ip_address: clientInfo.ip_address,
          expires_at: expiresAt,
          is_active: true,
        }]),
      '세션 생성 중 시간이 초과되었습니다.'
    )

    if (sessionError) {
      return { data: null, error: { message: '로그인 처리 중 오류가 발생했습니다.' } }
    }

    return {
      data: buildUserLoginResult(data, sessionToken, expiresAt),
      error: null,
    }
  } catch (error) {
    return {
      data: null,
      error: timeoutError(getErrorMessage(error, '로그인 처리 중 오류가 발생했습니다.')),
    }
  }
}

export async function loginAdminOnServer(username: string, password: string, headers: Headers) {
  try {
    const { data: admin, error: fetchError } = await runQueryWithTimeout(
      supabaseAdmin
        .from('admins')
        .select('*')
        .eq('username', username)
        .single(),
      '관리자 로그인 처리 중 시간이 초과되었습니다.'
    )

    if (fetchError || !admin) {
      return { data: null, error: { message: '등록되지 않은 관리자 계정입니다.' } }
    }

    let isPasswordValid = false
    let needsMigration = false

    try {
      isPasswordValid = await verifyPassword(password, admin.password_hash)
    } catch {
      isPasswordValid = false
    }

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

    if (needsMigration) {
      const newHash = await hashPassword(password)
      await supabaseAdmin
        .from('admins')
        .update({ password_hash: newHash })
        .eq('id', admin.id)
    }

    const sessionToken = generateSessionToken()
    const clientInfo = getClientInfoFromHeaders({
      'user-agent': headers.get('user-agent'),
      'x-forwarded-for': headers.get('x-forwarded-for'),
      'x-real-ip': headers.get('x-real-ip'),
    })
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString()

    const { error: sessionError } = await runQueryWithTimeout(
      supabaseAdmin
        .from('admin_sessions')
        .insert([{
          admin_id: admin.id,
          session_token: sessionToken,
          user_agent: clientInfo.user_agent,
          ip_address: clientInfo.ip_address,
          expires_at: expiresAt,
          is_active: true,
        }]),
      '관리자 세션 생성 중 시간이 초과되었습니다.'
    )

    if (sessionError) {
      return { data: null, error: { message: '로그인 처리 중 오류가 발생했습니다.' } }
    }

    const regionCode = getAdminRegionCode(admin.role)
    const regionId = regionCode ? await getRegionIdByCode(regionCode) : null

    return {
      data: buildAdminLoginResult(admin, sessionToken, expiresAt, regionId),
      error: null,
    }
  } catch (error) {
    console.error('관리자 로그인 오류:', error)
    return {
      data: null,
      error: timeoutError(getErrorMessage(error, '로그인 중 오류가 발생했습니다.')),
    }
  }
}

export async function validateUserSessionOnServer(sessionToken: string) {
  try {
    const { data, error } = await runQueryWithTimeout(
      supabaseAdmin
        .from('user_sessions')
        .select(`
          id,
          user_id,
          expires_at,
          is_active,
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

    if (error || !data) {
      return { data: null, error: error || { message: '세션이 만료되었거나 유효하지 않습니다.' } }
    }

    return {
      data: buildSessionValidationResult(data),
      error: null,
    }
  } catch (error) {
    return {
      data: null,
      error: timeoutError(getErrorMessage(error, '세션 확인 중 오류가 발생했습니다.')),
    }
  }
}

export async function refreshUserSessionOnServer(sessionToken: string) {
  try {
    const { data, error } = await runQueryWithTimeout(
      supabaseAdmin
        .from('user_sessions')
        .update({
          last_activity: new Date().toISOString(),
          expires_at: new Date(Date.now() + SESSION_DURATION_MS).toISOString(),
        })
        .eq('session_token', sessionToken)
        .eq('is_active', true),
      '세션 갱신 응답이 지연되고 있습니다.'
    )

    return { data, error }
  } catch (error) {
    return {
      data: null,
      error: timeoutError(getErrorMessage(error, '세션 갱신 중 오류가 발생했습니다.')),
    }
  }
}

export async function logoutSessionOnServer(sessionToken: string) {
  const { data: userSessionData, error: userSessionError } = await supabaseAdmin
    .from('user_sessions')
    .update({ is_active: false })
    .eq('session_token', sessionToken)
    .eq('is_active', true)
    .select('id')

  if (userSessionError) {
    return { data: null, error: userSessionError }
  }

  if ((userSessionData?.length || 0) > 0) {
    return { data: userSessionData, error: null }
  }

  const { data: adminSessionData, error: adminSessionError } = await supabaseAdmin
    .from('admin_sessions')
    .update({ is_active: false })
    .eq('session_token', sessionToken)
    .eq('is_active', true)
    .select('id')

  return { data: adminSessionData, error: adminSessionError }
}
