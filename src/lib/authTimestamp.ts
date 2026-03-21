const EXPLICIT_TIMEZONE_SUFFIX = /(?:Z|[+-]\d{2}:\d{2})$/i

export function parseDatabaseTimestamp(value: string): Date {
  const normalizedValue = EXPLICIT_TIMEZONE_SUFFIX.test(value)
    ? value
    : `${value}Z`

  return new Date(normalizedValue)
}
