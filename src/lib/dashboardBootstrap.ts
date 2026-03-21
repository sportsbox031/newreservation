export type DashboardReservationStatus = Record<string, {
  current_reservations: number
  max_reservations_per_day: number
  is_full: boolean
  available_slots: number
  is_open: boolean
}>

export type DashboardBlockedDate = {
  date: string
  start_time: string | null
  end_time: string | null
  reason: string | null
  id: string | number
}

export type DashboardSharedData = {
  user: {
    tier: string
    region_code: string
    region_name: string
  }
  reservationStatus: DashboardReservationStatus
  blockedDates: DashboardBlockedDate[]
}

export type DashboardBootstrapUser = {
  organization_name: string
  tier: string
  region_code: string
  region_name: string
}

export type DashboardBootstrapData = {
  user: DashboardBootstrapUser
  remainingDays: number
  reservationStatus: DashboardReservationStatus
  blockedDates: DashboardBlockedDate[]
  monthGate: {
    is_open: boolean
  }
}

export type DashboardCalendarData = {
  reservationStatus: DashboardReservationStatus
  blockedDates: DashboardBlockedDate[]
  monthGate: {
    is_open: boolean
  }
}

export type DashboardMeData = {
  user: DashboardBootstrapUser
  remainingDays: number
}

export type TimestampedCacheEntry<T> = {
  cachedAt: number
  data: T
}

export function calculateRemainingReservationDays(
  reservations: Array<{ date: string }>,
  monthlyLimit: number
): number {
  const usedReservationDays = new Set(reservations.map(item => item.date)).size
  return Math.max(0, monthlyLimit - usedReservationDays)
}

export function pruneExpiredDashboardCacheEntries<T>(
  cache: Map<string, TimestampedCacheEntry<T>>,
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

export function applyTierReservationOpenState(
  reservationStatus: DashboardReservationStatus,
  isTierOpen: boolean
): DashboardReservationStatus {
  const nextStatus: DashboardReservationStatus = {}

  for (const [date, status] of Object.entries(reservationStatus)) {
    nextStatus[date] = {
      ...status,
      is_open: isTierOpen && status.max_reservations_per_day > 0
    }
  }

  return nextStatus
}

export function buildClosedDashboardBootstrapData(
  user: DashboardBootstrapUser,
  remainingDays = 4
): DashboardBootstrapData {
  return {
    user,
    remainingDays,
    reservationStatus: {},
    blockedDates: [],
    monthGate: {
      is_open: false
    }
  }
}

export function buildOpenDashboardBootstrapData(
  user: DashboardBootstrapUser,
  remainingDays: number,
  reservationStatus: DashboardReservationStatus,
  blockedDates: DashboardBlockedDate[],
  isTierOpen: boolean
): DashboardBootstrapData {
  const nextReservationStatus = applyTierReservationOpenState(reservationStatus, isTierOpen)
  const hasAnyOpenDay = Object.values(nextReservationStatus).some(status => status.is_open)

  return {
    user,
    remainingDays,
    reservationStatus: nextReservationStatus,
    blockedDates,
    monthGate: {
      is_open: hasAnyOpenDay
    }
  }
}

export function buildDashboardCalendarData(
  reservationStatus: DashboardReservationStatus,
  blockedDates: DashboardBlockedDate[],
  isTierOpen: boolean
): DashboardCalendarData {
  const nextReservationStatus = applyTierReservationOpenState(reservationStatus, isTierOpen)
  const hasAnyOpenDay = Object.values(nextReservationStatus).some(status => status.is_open)

  return {
    reservationStatus: nextReservationStatus,
    blockedDates,
    monthGate: {
      is_open: hasAnyOpenDay
    }
  }
}

export function buildDashboardMeData(
  user: DashboardBootstrapUser,
  remainingDays: number
): DashboardMeData {
  return {
    user,
    remainingDays,
  }
}

export function getDashboardBootstrapClientCacheTtl(isMonthOpen: boolean): number {
  return isMonthOpen ? 15 * 1000 : 3 * 1000
}

export function getDashboardBootstrapClientCacheKey(
  year: number,
  month: number,
  sessionToken?: string | null
): string {
  const monthKey = `${year}-${String(month).padStart(2, '0')}`
  const tokenKey = sessionToken ? sessionToken.slice(0, 12) : 'anonymous'
  return `dashboardBootstrap:${tokenKey}:${monthKey}`
}

export function getDashboardCalendarClientCacheKey(
  year: number,
  month: number,
  sessionToken?: string | null
): string {
  const monthKey = `${year}-${String(month).padStart(2, '0')}`
  const tokenKey = sessionToken ? sessionToken.slice(0, 12) : 'anonymous'
  return `dashboardCalendar:${tokenKey}:${monthKey}`
}

export function getDashboardMeClientCacheKey(
  year: number,
  month: number,
  sessionToken?: string | null
): string {
  const monthKey = `${year}-${String(month).padStart(2, '0')}`
  const tokenKey = sessionToken ? sessionToken.slice(0, 12) : 'anonymous'
  return `dashboardMe:${tokenKey}:${monthKey}`
}

export function getDashboardClientCacheKeys(
  year: number,
  month: number,
  sessionToken?: string | null
): string[] {
  return [
    getDashboardBootstrapClientCacheKey(year, month, sessionToken),
    getDashboardCalendarClientCacheKey(year, month, sessionToken),
    getDashboardMeClientCacheKey(year, month, sessionToken),
  ]
}

type StorageLike = {
  removeItem: (key: string) => void
}

export function clearDashboardClientCaches(
  year: number,
  month: number,
  sessionToken?: string | null,
  storages?: StorageLike[]
): void {
  const cacheKeys = getDashboardClientCacheKeys(year, month, sessionToken)

  for (const storage of storages || []) {
    for (const cacheKey of cacheKeys) {
      storage.removeItem(cacheKey)
    }
  }
}

export function getDashboardBootstrapSharedCacheKey(regionId: number, year: number, month: number): string {
  return `dashboardShared:${regionId}:${year}:${month}`
}

export function getDashboardCalendarSharedCacheKey(regionId: number, tierId: number, year: number, month: number): string {
  return `dashboardCalendar:${regionId}:${tierId}:${year}:${month}`
}

export function getDashboardBootstrapUserMetaCacheKey(userId: string, year: number, month: number): string {
  return `dashboardUserMeta:${userId}:${year}:${month}`
}

export function getDashboardBootstrapUserSummaryCacheKey(userId: string, year: number, month: number): string {
  return `dashboardUserSummary:${userId}:${year}:${month}`
}
