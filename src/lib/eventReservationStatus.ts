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
  // now를 파싱할 수 없으면 안전하게 닫힘 처리(fail-safe)
  if (Number.isNaN(now)) {
    return false
  }
  if (reservation_start_at) {
    const start = new Date(reservation_start_at).getTime()
    // 스케줄 시각이 파싱 불가면 열려버리지 않도록 닫힘 처리
    if (Number.isNaN(start) || now < start) {
      return false
    }
  }
  if (reservation_end_at) {
    const end = new Date(reservation_end_at).getTime()
    if (Number.isNaN(end) || now >= end) {
      return false
    }
  }
  return true
}
