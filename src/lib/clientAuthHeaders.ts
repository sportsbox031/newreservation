export function buildCookieFirstClientHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
  }
}

export function buildCookieFirstJsonRequestInit(body: unknown, method: 'POST' | 'PATCH' | 'PUT' | 'DELETE' = 'POST'): RequestInit {
  return {
    method,
    credentials: 'include',
    headers: buildCookieFirstClientHeaders(),
    body: JSON.stringify(body),
  }
}

export function clearLegacySessionTokens(storage: Pick<Storage, 'removeItem'>) {
  storage.removeItem('session_token')
  storage.removeItem('sessionToken')
}
