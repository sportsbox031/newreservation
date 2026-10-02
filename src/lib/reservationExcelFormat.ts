// 예약관리 엑셀 다운로드용 포맷 헬퍼
// 슬롯(최대 2개)의 학년/장소를 셀에 표시할 문자열로 변환한다.

export type ExcelSlotLike = {
  startTime?: string | null
  endTime?: string | null
  grade?: string | null
  location?: string | null
}

// 학년 표기 규칙
// - 1개 학년: "3학년"
// - 2개 이상 숫자 학년: "3,4학년" (숫자만 콤마로 묶고 뒤에 학년)
// - 기타(숫자가 아닌 값): 그대로 표기 ("기타")
// - 숫자 학년과 기타가 섞인 경우: "3학년, 기타"
export function formatSlotGrades(slots: ExcelSlotLike[]): string {
  const grades = Array.from(
    new Set(
      slots
        .map((slot) => (slot.grade ?? '').trim())
        .filter((grade) => grade.length > 0)
    )
  )

  const numericGrades: number[] = []
  const otherGrades: string[] = []

  for (const grade of grades) {
    const match = /^(\d+)\s*학년$/.exec(grade)
    if (match) {
      numericGrades.push(Number(match[1]))
    } else {
      otherGrades.push(grade)
    }
  }

  const parts: string[] = []
  if (numericGrades.length > 0) {
    numericGrades.sort((a, b) => a - b)
    parts.push(`${numericGrades.join(',')}학년`)
  }
  parts.push(...otherGrades)

  return parts.join(', ')
}

// 장소 표기: 슬롯별 장소를 중복 제거 후 콤마로 연결
export function formatSlotLocations(slots: ExcelSlotLike[]): string {
  return Array.from(
    new Set(
      slots
        .map((slot) => (slot.location ?? '').trim())
        .filter((location) => location.length > 0)
    )
  ).join(', ')
}

// 시간 표기: 첫 슬롯 시작 ~ 마지막 슬롯 종료
export function formatSlotTimeRange(slots: ExcelSlotLike[]): string {
  if (slots.length === 0) return ''
  const firstSlot = slots[0]
  const lastSlot = slots[slots.length - 1]
  const start = (firstSlot.startTime ?? '').trim()
  const end = (lastSlot.endTime ?? '').trim()
  if (!start && !end) return ''
  return `${start}~${end}`
}

// 셀에 표시할 전체 문자열 (줄바꿈 구분)
// 1줄: 단체명
// 2줄: 학년 / 장소  (예: "3학년 / 운동장")
// 3줄: 시간
export function formatReservationCell(
  organizationName: string,
  slots: ExcelSlotLike[]
): string {
  const lines: string[] = [organizationName]

  if (slots.length > 0) {
    const grades = formatSlotGrades(slots)
    const locations = formatSlotLocations(slots)
    const gradeLocation = [grades, locations].filter(Boolean).join(' / ')
    if (gradeLocation) lines.push(gradeLocation)

    const timeRange = formatSlotTimeRange(slots)
    if (timeRange) lines.push(timeRange)
  }

  return lines.join('\n')
}
