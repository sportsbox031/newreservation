// 사용자 패널티(경고/퇴장) 상태 계산 로직
//
// 규칙:
// - 경고는 부여된 해당 연도(KST) 말까지만 유효하다. (1월 1일이 되면 조회 조건상 자동 소멸)
// - 경고 2회 누적 시 자동 퇴장된다.
// - 퇴장되면 퇴장 당한 그 달(KST 기준 당월)만 신청이 제한되고, 다음달 1일부터 복귀한다.
// - 복귀 후에는 해당 연도 말까지 '보호관찰' 상태이며, 경고 1회만 받아도 다시 퇴장된다.

export const PENALTY_REASONS = ['학년 불일치', '인원 불일치', '장소 불일치', '시간 불일치'] as const
export type PenaltyReason = (typeof PENALTY_REASONS)[number]

export type PenaltyType = 'warning' | 'ejection'

export interface PenaltyRecord {
  id: string
  type: PenaltyType
  reason: string
  restricted_month: string | null
  triggered_by_warning: boolean
  issued_by: string | null
  created_at: string
}

export interface PenaltyStatus {
  // 현재 유효한 경고 수 (마지막 퇴장 이후에 받은 경고만 집계)
  warningCount: number
  // 퇴장까지 필요한 경고 수 기준 (보호관찰 중이면 1, 아니면 2)
  warningThreshold: number
  // 현재 신청 제한 중인지 (제한월 == 현재 KST 월)
  restricted: boolean
  // 제한월 'YYYY-MM' (제한 중일 때만)
  restrictedMonth: string | null
  // 신청 재개월 'YYYY-MM' (제한 중일 때만)
  resumeMonth: string | null
  // 보호관찰 여부 (올해 퇴장 이력이 있고 제한월이 지난 상태)
  probation: boolean
  // 올해 퇴장 횟수
  ejectionCount: number
  // 마지막 퇴장이 경고 누적 자동 퇴장이었는지
  lastEjectionTriggeredByWarning: boolean
}

const KST_YEAR_MONTH_FORMAT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit'
})

// KST 기준 'YYYY-MM'
export function getKstYearMonth(date: Date = new Date()): string {
  // en-CA 로케일은 'YYYY-MM' 형태를 반환한다.
  return KST_YEAR_MONTH_FORMAT.format(date)
}

// KST 기준 연도
export function getKstYear(date: Date = new Date()): number {
  return Number(getKstYearMonth(date).slice(0, 4))
}

// 'YYYY-MM'의 다음달 'YYYY-MM'
export function getNextYearMonth(yearMonth: string): string {
  const [yearText, monthText] = yearMonth.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return yearMonth
  }

  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}`
}

// 'YYYY-MM' → 'N월'
export function formatYearMonthLabel(yearMonth: string): string {
  const month = Number(yearMonth.split('-')[1])
  return Number.isInteger(month) ? `${month}월` : yearMonth
}

export function derivePenaltyStatus(
  penalties: PenaltyRecord[],
  now: Date = new Date()
): PenaltyStatus {
  const currentYear = getKstYear(now)
  const currentYearMonth = getKstYearMonth(now)

  const thisYearPenalties = penalties
    .filter(penalty => getKstYear(new Date(penalty.created_at)) === currentYear)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  const ejections = thisYearPenalties.filter(penalty => penalty.type === 'ejection')
  const lastEjection = ejections.length > 0 ? ejections[ejections.length - 1] : null

  const warnings = thisYearPenalties.filter(penalty => {
    if (penalty.type !== 'warning') {
      return false
    }
    if (!lastEjection) {
      return true
    }
    return new Date(penalty.created_at).getTime() > new Date(lastEjection.created_at).getTime()
  })

  const restricted = lastEjection?.restricted_month === currentYearMonth
  const restrictedMonth = restricted ? lastEjection?.restricted_month ?? null : null

  return {
    warningCount: warnings.length,
    warningThreshold: lastEjection ? 1 : 2,
    restricted,
    restrictedMonth,
    resumeMonth: restrictedMonth ? getNextYearMonth(restrictedMonth) : null,
    probation: !!lastEjection && !restricted,
    ejectionCount: ejections.length,
    lastEjectionTriggeredByWarning: lastEjection?.triggered_by_warning === true
  }
}
