// 사용자 대시보드용 패널티 상태 배너 표시 로직 (순수 함수)
// - 서버가 내려준 패널티 요약을 사용자에게 보여줄 3가지 상태로 매핑한다.
// - 보호관찰 등 내부 개념은 노출하지 않는다(문구는 임계치 숫자로만 표현).
// - 의존성 없이 테스트 가능하도록 'YYYY-MM' → 'N월' 변환을 내부에 둔다.

// 'YYYY-MM' → 'N월' (penalty.ts의 formatYearMonthLabel와 동일 규칙)
function monthLabel(yearMonth: string): string {
  const month = Number(yearMonth.split('-')[1])
  return Number.isInteger(month) ? `${month}월` : yearMonth
}

export interface PenaltyBannerInput {
  // 현재 이용 제한(패널티) 중인지
  restricted: boolean
  // 신청 재개월 'YYYY-MM' (제한 중일 때만 의미 있음)
  resumeMonth: string | null
  // 현재 유효한 경고 수
  warningCount: number
  // 이용 제한까지 필요한 경고 수(일반 2, 상황에 따라 1)
  warningThreshold: number
}

export type PenaltyBannerLevel = 'ok' | 'warning' | 'restricted'

export interface PenaltyBanner {
  level: PenaltyBannerLevel
  title: string
  detail: string
}

export function getPenaltyBanner(input: PenaltyBannerInput): PenaltyBanner {
  const threshold = input.warningThreshold > 0 ? input.warningThreshold : 2

  if (input.restricted) {
    return {
      level: 'restricted',
      title: '이용 제한 중',
      detail: input.resumeMonth
        ? `${monthLabel(input.resumeMonth)}부터 다시 신청할 수 있습니다.`
        : '다음 달부터 다시 신청할 수 있습니다.',
    }
  }

  if (input.warningCount > 0) {
    return {
      level: 'warning',
      title: `경고 ${input.warningCount}/${threshold}회`,
      detail: `경고 ${threshold}회 누적 시 이용이 제한됩니다.`,
    }
  }

  return {
    level: 'ok',
    title: '양호',
    detail: `현재 경고가 없습니다. (경고 0/${threshold}회)`,
  }
}
