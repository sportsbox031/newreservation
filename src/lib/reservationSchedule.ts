// 예약 자동 시작/종료 스케줄 공통 유틸 (한국 시간 KST 기준)

export const KST_OFFSET_MINUTES = 9 * 60

export type ReservationScheduleAction = 'open' | 'close'

export const RESERVATION_SCHEDULE_ACTIONS: ReservationScheduleAction[] = ['open', 'close']

export function isReservationScheduleAction(value: unknown): value is ReservationScheduleAction {
  return value === 'open' || value === 'close'
}

const KST_LOCAL_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/

// "YYYY-MM-DDTHH:mm" (한국 시간) → UTC ISO 문자열. 형식/날짜가 잘못되면 null
export function kstLocalStringToUtcIso(kstLocal: string): string | null {
  const match = KST_LOCAL_PATTERN.exec(kstLocal)
  if (!match) {
    return null
  }

  const [, year, month, day, hour, minute] = match
  const utcMs = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute)
  ) - KST_OFFSET_MINUTES * 60 * 1000

  const date = new Date(utcMs)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  // 존재하지 않는 날짜(예: 2월 30일)는 Date.UTC가 넘겨서 계산하므로 왕복 검증으로 거른다
  if (utcIsoToKstLocalString(date.toISOString()) !== kstLocal) {
    return null
  }

  return date.toISOString()
}

// UTC ISO 문자열 → "YYYY-MM-DDTHH:mm" (한국 시간)
export function utcIsoToKstLocalString(utcIso: string): string | null {
  const date = new Date(utcIso)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  const kst = new Date(date.getTime() + KST_OFFSET_MINUTES * 60 * 1000)
  const year = kst.getUTCFullYear()
  const month = String(kst.getUTCMonth() + 1).padStart(2, '0')
  const day = String(kst.getUTCDate()).padStart(2, '0')
  const hour = String(kst.getUTCHours()).padStart(2, '0')
  const minute = String(kst.getUTCMinutes()).padStart(2, '0')

  return `${year}-${month}-${day}T${hour}:${minute}`
}

// 현재 한국 시간을 datetime-local 형식("YYYY-MM-DDTHH:mm")으로 반환
export function getKstNowLocalString(now: Date = new Date()): string {
  return utcIsoToKstLocalString(now.toISOString()) as string
}

export function formatScheduleActionLabel(action: ReservationScheduleAction): string {
  return action === 'open' ? '예약 시작' : '예약 종료'
}
