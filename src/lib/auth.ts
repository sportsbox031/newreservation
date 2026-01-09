import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey)

export interface AuthResult {
  authenticated: boolean
  user?: {
    id: string
    organization_name: string
    role: string
    region_id: number | null
  }
  error?: string
}

/**
 * API 요청에서 세션 토큰을 검증하고 사용자 정보를 반환합니다.
 * @param request Next.js API 요청 객체
 * @returns 인증 결과 및 사용자 정보
 */
export async function validateApiRequest(request: NextRequest): Promise<AuthResult> {
  try {
    // Authorization 헤더에서 토큰 추출
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return { authenticated: false, error: 'Authorization header missing' }
    }

    const token = authHeader.replace('Bearer ', '')
    if (!token) {
      return { authenticated: false, error: 'Token missing' }
    }

    // 먼저 관리자 세션 확인
    const { data: adminSession, error: adminSessionError } = await supabaseAdmin
      .from('admin_sessions')
      .select(`
        id,
        admin_id,
        expires_at,
        is_active,
        admins!inner(
          id,
          username,
          role
        )
      `)
      .eq('session_token', token)
      .eq('is_active', true)
      .single()

    if (!adminSessionError && adminSession) {
      // 세션 만료 확인
      const now = new Date()
      const expiresAt = new Date(adminSession.expires_at)
      if (expiresAt < now) {
        return { authenticated: false, error: 'Session expired' }
      }

      // 세션 활동 시간 업데이트
      await supabaseAdmin
        .from('admin_sessions')
        .update({ last_activity: new Date().toISOString() })
        .eq('id', adminSession.id)

      const admin = Array.isArray(adminSession.admins) ? adminSession.admins[0] : adminSession.admins

      return {
        authenticated: true,
        user: {
          id: admin.id,
          organization_name: admin.username,
          role: admin.role,
          region_id: null
        }
      }
    }

    // 관리자 세션이 없으면 일반 사용자 세션 확인
    const { data: userSession, error: userSessionError } = await supabaseAdmin
      .from('user_sessions')
      .select(`
        id,
        user_id,
        expires_at,
        is_active,
        users!inner(
          id,
          organization_name,
          city_id,
          status
        )
      `)
      .eq('session_token', token)
      .eq('is_active', true)
      .single()

    if (userSessionError || !userSession) {
      return { authenticated: false, error: 'Invalid session token' }
    }

    // 세션 만료 확인
    const now = new Date()
    const expiresAt = new Date(userSession.expires_at)
    if (expiresAt < now) {
      return { authenticated: false, error: 'Session expired' }
    }

    // 사용자 상태 확인 (approved만 허용)
    const user = Array.isArray(userSession.users) ? userSession.users[0] : userSession.users
    if (user.status !== 'approved') {
      return { authenticated: false, error: 'User not approved' }
    }

    // 세션 활동 시간 업데이트
    await supabaseAdmin
      .from('user_sessions')
      .update({ last_activity: new Date().toISOString() })
      .eq('id', userSession.id)

    // city_id로 region_id 조회
    const { data: cityData } = await supabaseAdmin
      .from('cities')
      .select('region_id')
      .eq('id', user.city_id)
      .single()

    return {
      authenticated: true,
      user: {
        id: user.id,
        organization_name: user.organization_name,
        role: 'user',
        region_id: cityData?.region_id || null
      }
    }
  } catch (error) {
    console.error('Auth validation error:', error)
    return { authenticated: false, error: 'Authentication failed' }
  }
}

/**
 * 관리자 권한 검증 (super, south, north)
 * @param user 사용자 객체
 * @returns 관리자 여부
 */
export function isAdmin(user: AuthResult['user']): boolean {
  if (!user) return false
  return ['super', 'south', 'north'].includes(user.role)
}

/**
 * 특정 역할 검증
 * @param user 사용자 객체
 * @param allowedRoles 허용된 역할 목록
 * @returns 역할 일치 여부
 */
export function hasRole(user: AuthResult['user'], allowedRoles: string[]): boolean {
  if (!user) return false
  return allowedRoles.includes(user.role)
}

/**
 * 지역 접근 권한 검증
 * @param user 사용자 객체
 * @param regionCode 확인할 지역 코드 (south/north)
 * @returns 접근 가능 여부
 */
export function canAccessRegion(user: AuthResult['user'], regionCode: 'south' | 'north'): boolean {
  if (!user) return false

  // super 관리자는 모든 지역 접근 가능
  if (user.role === 'super') return true

  // 해당 지역 관리자만 접근 가능
  return user.role === regionCode
}
