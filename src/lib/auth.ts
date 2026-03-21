import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { getAuthTokenFromRequest } from '@/lib/authCookies'
import {
  createAuthCacheEntry,
  getCachedAuthResult,
  pruneExpiredAuthCacheEntries,
  type AuthCacheEntry,
} from '@/lib/authCache'
import { parseDatabaseTimestamp } from '@/lib/authTimestamp'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey)
const AUTH_CACHE_TTL_MS = 5 * 1000
const AUTH_CACHE_MAX_ENTRIES = 1000
const authResultCache = new Map<string, AuthCacheEntry<AuthResult>>()
type AuthScope = 'any' | 'user'

export interface AuthResult {
  authenticated: boolean
  user?: {
    id: string
    organization_name: string
    role: string
    region_id: number | null
    region_code?: string | null
    region_name?: string | null
    tier?: 'Priority' | 'Standard' | null
  }
  error?: string
}

function getScopedAuthCacheKey(token: string, scope: AuthScope): string {
  return `${scope}:${token}`
}

async function validateUserSessionToken(token: string, nowTimestamp: number): Promise<AuthResult> {
  const scopedCacheKey = getScopedAuthCacheKey(token, 'user')
  const cachedResult = getCachedAuthResult(authResultCache, scopedCacheKey, nowTimestamp, AUTH_CACHE_TTL_MS)
  if (cachedResult) {
    return cachedResult
  }

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
        tier,
        city_id,
        status,
        cities(
          region_id,
          regions(id, code, name)
        )
      )
    `)
    .eq('session_token', token)
    .eq('is_active', true)
    .single()

  if (userSessionError || !userSession) {
    return { authenticated: false, error: 'Invalid session token' }
  }

  const now = new Date()
  const expiresAt = parseDatabaseTimestamp(userSession.expires_at)
  if (expiresAt < now) {
    return { authenticated: false, error: 'Session expired' }
  }

  const user = Array.isArray(userSession.users) ? userSession.users[0] : userSession.users
  if (user.status !== 'approved') {
    return { authenticated: false, error: 'User not approved' }
  }

  const city = Array.isArray(user.cities) ? user.cities[0] : user.cities
  const region = Array.isArray(city?.regions) ? city.regions[0] : city?.regions
  let regionId = city?.region_id ?? region?.id ?? null
  let regionCode = region?.code ?? null
  let regionName = region?.name ?? null

  if (regionId === null && user.city_id) {
    const { data: cityData } = await supabaseAdmin
      .from('cities')
      .select('region_id, regions(id, code, name)')
      .eq('id', user.city_id)
      .single()

    regionId = cityData?.region_id || null
    const fallbackRegion = Array.isArray(cityData?.regions) ? cityData.regions[0] : cityData?.regions
    regionCode = fallbackRegion?.code || regionCode
    regionName = fallbackRegion?.name || regionName
  }

  const result = {
    authenticated: true,
    user: {
      id: user.id,
      organization_name: user.organization_name,
      role: 'user',
      region_id: regionId,
      region_code: regionCode,
      region_name: regionName,
      tier: user.tier || 'Standard'
    }
  }
  authResultCache.set(scopedCacheKey, createAuthCacheEntry(result, nowTimestamp))
  return result
}

/**
 * API 요청에서 세션 토큰을 검증하고 사용자 정보를 반환합니다.
 * @param request Next.js API 요청 객체
 * @returns 인증 결과 및 사용자 정보
 */
export async function validateApiRequest(request: NextRequest): Promise<AuthResult> {
  try {
    const token = getAuthTokenFromRequest(request)
    if (!token) {
      return { authenticated: false, error: 'Token missing' }
    }

    const nowTimestamp = Date.now()
    pruneExpiredAuthCacheEntries(authResultCache, nowTimestamp, AUTH_CACHE_TTL_MS, AUTH_CACHE_MAX_ENTRIES)
    const cachedResult = getCachedAuthResult(
      authResultCache,
      getScopedAuthCacheKey(token, 'any'),
      nowTimestamp,
      AUTH_CACHE_TTL_MS
    )
    if (cachedResult) {
      return cachedResult
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
      const expiresAt = parseDatabaseTimestamp(adminSession.expires_at)
      if (expiresAt < now) {
        return { authenticated: false, error: 'Session expired' }
      }

      const admin = Array.isArray(adminSession.admins) ? adminSession.admins[0] : adminSession.admins

      const result = {
        authenticated: true,
        user: {
          id: admin.id,
          organization_name: admin.username,
          role: admin.role,
          region_id: null
        }
      }
      authResultCache.set(getScopedAuthCacheKey(token, 'any'), createAuthCacheEntry(result, nowTimestamp))
      return result
    }

    const userResult = await validateUserSessionToken(token, nowTimestamp)
    if (userResult.authenticated) {
      authResultCache.set(
        getScopedAuthCacheKey(token, 'any'),
        createAuthCacheEntry(userResult, nowTimestamp)
      )
    }
    return userResult
  } catch (error) {
    console.error('Auth validation error:', error)
    return { authenticated: false, error: 'Authentication failed' }
  }
}

export async function validateUserApiRequest(request: NextRequest): Promise<AuthResult> {
  try {
    const token = getAuthTokenFromRequest(request, ['user'])
    if (!token) {
      return { authenticated: false, error: 'Token missing' }
    }

    const nowTimestamp = Date.now()
    pruneExpiredAuthCacheEntries(authResultCache, nowTimestamp, AUTH_CACHE_TTL_MS, AUTH_CACHE_MAX_ENTRIES)
    return validateUserSessionToken(token, nowTimestamp)
  } catch (error) {
    console.error('User auth validation error:', error)
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
