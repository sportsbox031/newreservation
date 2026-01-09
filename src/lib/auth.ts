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

    // 세션 토큰으로 세션 검증
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select(`
        id,
        user_id,
        expires_at,
        users!inner(
          id,
          organization_name,
          role,
          region_id,
          status
        )
      `)
      .eq('session_token', token)
      .single()

    if (sessionError || !session) {
      return { authenticated: false, error: 'Invalid session token' }
    }

    // 세션 만료 확인
    const now = new Date()
    const expiresAt = new Date(session.expires_at)
    if (expiresAt < now) {
      return { authenticated: false, error: 'Session expired' }
    }

    // 사용자 상태 확인 (approved만 허용)
    const user = Array.isArray(session.users) ? session.users[0] : session.users
    if (user.status !== 'approved') {
      return { authenticated: false, error: 'User not approved' }
    }

    // 세션 활동 시간 업데이트
    await supabaseAdmin
      .from('sessions')
      .update({ last_activity: new Date().toISOString() })
      .eq('id', session.id)

    return {
      authenticated: true,
      user: {
        id: user.id,
        organization_name: user.organization_name,
        role: user.role || 'user',
        region_id: user.region_id
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
