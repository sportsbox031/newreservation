export type AuthCacheEntry<T> = {
  cachedAt: number
  data: T
}

export function createAuthCacheEntry<T>(data: T, cachedAt = Date.now()): AuthCacheEntry<T> {
  return {
    cachedAt,
    data,
  }
}

export function getCachedAuthResult<T>(
  cache: Map<string, AuthCacheEntry<T>>,
  token: string,
  now: number,
  ttlMs: number
): T | null {
  const cached = cache.get(token)
  if (!cached) {
    return null
  }

  if (now - cached.cachedAt >= ttlMs) {
    cache.delete(token)
    return null
  }

  return cached.data
}

export function pruneExpiredAuthCacheEntries<T>(
  cache: Map<string, AuthCacheEntry<T>>,
  now: number,
  ttlMs: number,
  maxEntries: number
): void {
  for (const [key, entry] of cache.entries()) {
    if (now - entry.cachedAt >= ttlMs) {
      cache.delete(key)
    }
  }

  if (cache.size <= maxEntries) {
    return
  }

  const overflowEntries = [...cache.entries()]
    .sort(([, a], [, b]) => a.cachedAt - b.cachedAt)
    .slice(0, cache.size - maxEntries)

  for (const [key] of overflowEntries) {
    cache.delete(key)
  }
}
