type CurrentUserStorage = Pick<Storage, 'getItem'>

export function readStoredCurrentUserId(storage: CurrentUserStorage): string | null {
  try {
    const rawCurrentUser = storage.getItem('currentUser')
    if (!rawCurrentUser) {
      return null
    }

    const parsed = JSON.parse(rawCurrentUser)
    return typeof parsed?.id === 'string' && parsed.id ? parsed.id : null
  } catch {
    return null
  }
}

export function getCookieFirstClientSessionScope(storage?: CurrentUserStorage | null): string {
  if (!storage) {
    return 'cookie-session'
  }

  const userId = readStoredCurrentUserId(storage)
  return userId ? `user:${userId}` : 'cookie-session'
}
