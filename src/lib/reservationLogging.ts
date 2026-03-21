export type ReservationLogPhase = 'rpc' | 'fallback' | 'request'

export type ReservationLogPayload = {
  event: 'reservation_request'
  phase: ReservationLogPhase
  outcome: string
  userKey: string
  regionId: number
  date: string
  slotCount: number
  durationMs?: number
  message?: string
}

export function classifyReservationOutcome(message: string | null | undefined): string {
  if (!message) {
    return 'unexpected_error'
  }

  if (message.includes('신청이 몰려 예약을 처리 중입니다')) {
    return 'contention_busy'
  }

  if (message.includes('예약이 마감되었습니다')) {
    return 'capacity_full'
  }

  if (message.includes('시간이 초과되었습니다')) {
    return 'timeout'
  }

  if (message.includes('이미 해당 날짜에 예약이 존재합니다')) {
    return 'duplicate_date'
  }

  if (message.includes('월 예약 한도를 초과했습니다')) {
    return 'monthly_limit'
  }

  if (message.includes('예약이 차단된')) {
    return 'blocked_schedule'
  }

  if (message.includes('신청기간이 아닙니다')) {
    return 'tier_closed'
  }

  return 'unexpected_error'
}

export function createReservationLogPayload({
  phase,
  outcome,
  userId,
  regionId,
  date,
  slotCount,
  durationMs,
  message,
}: {
  phase: ReservationLogPhase
  outcome: string
  userId: string
  regionId: number
  date: string
  slotCount: number
  durationMs?: number
  message?: string
}): ReservationLogPayload {
  return {
    event: 'reservation_request',
    phase,
    outcome,
    userKey: userId.slice(-4),
    regionId,
    date,
    slotCount,
    ...(typeof durationMs === 'number' ? { durationMs } : {}),
    ...(message ? { message } : {}),
  }
}
