const SESSION_VALIDATED_AT_KEY_PREFIX = 'sessionValidatedAt'

export function getSessionValidatedAtStorageKey(sessionToken: string): string {
  return `${SESSION_VALIDATED_AT_KEY_PREFIX}:${sessionToken.slice(0, 12)}`
}

export function isFreshSessionValidation(
  lastValidatedAt: string | null,
  now: number,
  ttlMs: number
): boolean {
  const timestamp = Number(lastValidatedAt || '0')
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return false
  }

  return now - timestamp < ttlMs
}
