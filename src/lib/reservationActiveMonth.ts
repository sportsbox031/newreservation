export function parseYearMonthParts(yearMonth: string): { year: number; month: number } | null {
  const normalized = normalizeYearMonth(yearMonth)
  if (!normalized) {
    return null
  }

  const [yearText, monthText] = normalized.split('-')
  const year = Number(yearText)
  const month = Number(monthText)

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null
  }

  return { year, month }
}

export function normalizeYearMonth(yearMonth: string | null | undefined): string | null {
  if (!yearMonth) {
    return null
  }

  const match = yearMonth.trim().match(/^(\d{4})-(\d{1,2})$/)
  if (!match) {
    return null
  }

  const [, year, month] = match
  const monthNumber = Number(month)
  if (!Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > 12) {
    return null
  }

  return `${year}-${String(monthNumber).padStart(2, '0')}`
}

export function resolveActiveReservationMonth(input: {
  activeMonths: Array<string | null | undefined>
  tierOpenMonths: Array<string | null | undefined>
}): string | null {
  const normalizedActiveMonths = [...new Set(input.activeMonths.map(normalizeYearMonth).filter(Boolean))]
    .sort()
  if (normalizedActiveMonths.length > 0) {
    return normalizedActiveMonths[0] ?? null
  }

  const normalizedTierOpenMonths = [...new Set(input.tierOpenMonths.map(normalizeYearMonth).filter(Boolean))]
    .sort()

  return normalizedTierOpenMonths[0] ?? null
}

export function formatReservationMonthLabel(yearMonth: string): string {
  const parsed = parseYearMonthParts(yearMonth)
  if (!parsed) {
    return yearMonth
  }

  return `${parsed.month}월`
}

export function buildReservationMonthTransitionMessage(currentYearMonth: string, nextYearMonth: string): string {
  const currentLabel = formatReservationMonthLabel(currentYearMonth)
  const nextLabel = formatReservationMonthLabel(nextYearMonth)

  return `${currentLabel}이 예약중입니다. ${currentLabel} 예약을 종료하고 ${nextLabel} 예약을 시작하시겠습니까?`
}

export function getInitialDashboardMonth(
  activeYearMonth: string | null,
  now: Date = new Date()
): Date {
  const parsed = activeYearMonth ? parseYearMonthParts(activeYearMonth) : null
  if (parsed) {
    return new Date(parsed.year, parsed.month - 1, 1)
  }

  return new Date(now.getFullYear(), now.getMonth(), 1)
}
