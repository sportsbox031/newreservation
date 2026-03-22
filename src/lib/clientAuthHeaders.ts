export function buildCookieFirstClientHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
  }
}

export function clearLegacySessionTokens(storage: Pick<Storage, 'removeItem'>) {
  storage.removeItem('session_token')
  storage.removeItem('sessionToken')
}
