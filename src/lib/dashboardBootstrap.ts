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
  id: string
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
