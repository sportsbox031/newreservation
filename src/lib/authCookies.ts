type SessionCookieKind = 'user' | 'admin'

type HeaderLike = {
  get: (name: string) => string | null
}

type CookieStoreLike = {
  get: (name: string) => { value: string } | undefined
}

type RequestLike = {
  headers: HeaderLike
  cookies: CookieStoreLike
}

export const USER_SESSION_COOKIE_NAME = 'sportsbox_user_session'
export const ADMIN_SESSION_COOKIE_NAME = 'sportsbox_admin_session'

export function getSessionCookieName(kind: SessionCookieKind): string {
  return kind === 'admin' ? ADMIN_SESSION_COOKIE_NAME : USER_SESSION_COOKIE_NAME
}

export function buildSessionCookieOptions(expiresAt: string) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    expires: new Date(expiresAt),
  }
}

export function buildClearedSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    expires: new Date(0),
    maxAge: 0,
  }
}

export function buildSessionCookieConfig(kind: SessionCookieKind, token: string, expiresAt: string) {
  return {
    name: getSessionCookieName(kind),
    value: token,
    options: buildSessionCookieOptions(expiresAt),
  }
}

export function getBearerTokenFromHeaders(headers: HeaderLike): string | null {
  const authHeader = headers.get('authorization')
  if (!authHeader) {
    return null
  }

  const token = authHeader.replace('Bearer ', '').trim()
  return token || null
}

export function getSessionCookieToken(request: RequestLike, kind: SessionCookieKind): string | null {
  return request.cookies.get(getSessionCookieName(kind))?.value || null
}

export function getAuthTokenFromRequest(
  request: RequestLike,
  kinds: SessionCookieKind[] = ['user', 'admin']
): string | null {
  const bearerToken = getBearerTokenFromHeaders(request.headers)
  if (bearerToken) {
    return bearerToken
  }

  for (const kind of kinds) {
    const cookieToken = getSessionCookieToken(request, kind)
    if (cookieToken) {
      return cookieToken
    }
  }

  return null
}
