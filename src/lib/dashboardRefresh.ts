export function shouldStartDashboardRefresh({
  now,
  inFlight,
  lastCompletedAt,
  minIntervalMs,
  force,
}: {
  now: number
  inFlight: boolean
  lastCompletedAt: number
  minIntervalMs: number
  force: boolean
}): boolean {
  if (inFlight) {
    return false
  }

  if (force) {
    return true
  }

  return now - lastCompletedAt >= minIntervalMs
}
