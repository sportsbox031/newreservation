export function getDefaultDashboardMonth(now: Date = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth() + 1, 1)
}

export function getDashboardMonthCacheKey(
  userId: string,
  regionCode: 'south' | 'north',
  year: number,
  month: number
): string {
  return `dashboardMonthGate:${userId}:${regionCode}:${year}-${String(month).padStart(2, '0')}`
}

export function getDashboardTargetDate(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`
}
