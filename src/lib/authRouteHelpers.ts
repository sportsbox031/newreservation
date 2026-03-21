type HeaderMap = Record<string, string | null | undefined>

interface UserLike {
  password_hash?: string
  [key: string]: unknown
}

interface AdminLike {
  id: string
  username: string
  role: string
  phone?: string | null
  email?: string | null
}

interface SessionLike {
  id: string | number
  user_id: string
  users: unknown
}

export function getClientInfoFromHeaders(headers: HeaderMap) {
  const forwardedFor = headers['x-forwarded-for']
  const realIp = headers['x-real-ip']
  const userAgent = headers['user-agent']

  return {
    user_agent: userAgent || 'Unknown',
    ip_address: forwardedFor?.split(',')[0]?.trim() || realIp || 'Unknown',
  }
}

export function getAdminRegionCode(role: string | null | undefined): 'south' | 'north' | null {
  if (role === 'south' || role === 'north') {
    return role
  }

  return null
}

export function buildUserLoginResult<T extends UserLike>(
  user: T,
  sessionToken: string,
  expiresAt: string
) {
  const userWithoutPassword = { ...user }
  delete userWithoutPassword.password_hash

  return {
    ...userWithoutPassword,
    session_token: sessionToken,
    session_expires: expiresAt,
  }
}

export function buildAdminLoginResult(
  admin: AdminLike,
  sessionToken: string,
  expiresAt: string,
  regionId: number | null
) {
  return {
    id: admin.id,
    username: admin.username,
    role: admin.role,
    region_id: regionId,
    phone: admin.phone ?? null,
    email: admin.email ?? null,
    isAuthenticated: true,
    session_token: sessionToken,
    session_expires: expiresAt,
  }
}

export function buildSessionValidationResult(session: SessionLike) {
  return {
    id: session.id,
    user_id: session.user_id,
    users: session.users,
  }
}
