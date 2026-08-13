type EventOpenInput = {
  is_open: boolean
  reservation_start_at: string | null
  reservation_end_at: string | null
}

export function computeEffectiveOpen(event: EventOpenInput, nowIso: string): boolean {
  const { reservation_start_at, reservation_end_at } = event
  const hasSchedule = Boolean(reservation_start_at) || Boolean(reservation_end_at)

  if (!hasSchedule) {
    return event.is_open
  }

  const now = new Date(nowIso).getTime()
  if (reservation_start_at && now < new Date(reservation_start_at).getTime()) {
    return false
  }
  if (reservation_end_at && now >= new Date(reservation_end_at).getTime()) {
    return false
  }
  return true
}
