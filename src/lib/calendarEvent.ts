// 예약 정보 → 구글캘린더 이벤트 변환 (순수 함수)
//
// 이벤트 구성: 단체명, 시작~종료 시간, 학년, 장소, 담당자
// 시간은 모두 한국 시간(Asia/Seoul) 기준이다.

export interface CalendarSlotInput {
  startTime: string // HH:MM
  endTime: string   // HH:MM
  grade: string
  participantCount: number
  location: string
}

export interface CalendarReservationInput {
  organizationName: string
  date: string // YYYY-MM-DD
  slots: CalendarSlotInput[]
  staffNames: string[]
}

export interface GoogleCalendarEventPayload {
  summary: string
  description: string
  location: string
  start: { dateTime: string; timeZone: string }
  end: { dateTime: string; timeZone: string }
}

const KST_TIMEZONE = 'Asia/Seoul'

// HH:MM 형식 검증
function isValidTime(time: string): boolean {
  return /^\d{2}:\d{2}$/.test(time)
}

// 슬롯이 없거나 시간 형식이 잘못되면 null (동기화 대상에서 제외)
export function buildCalendarEvent(input: CalendarReservationInput): GoogleCalendarEventPayload | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    return null
  }

  const validSlots = input.slots
    .filter((slot) => isValidTime(slot.startTime) && isValidTime(slot.endTime))
    .sort((a, b) => a.startTime.localeCompare(b.startTime))

  if (validSlots.length === 0) {
    return null
  }

  const firstSlot = validSlots[0]
  const lastSlot = validSlots[validSlots.length - 1]
  const staffText = input.staffNames.length > 0 ? input.staffNames.join(', ') : '미지정'

  const descriptionLines = [
    `단체명: ${input.organizationName}`,
    ...validSlots.map((slot, index) =>
      `${validSlots.length > 1 ? `${index + 1}타임 ` : ''}${slot.startTime}~${slot.endTime} · ${slot.grade} · ${slot.participantCount}명 · ${slot.location}`
    ),
    `담당자: ${staffText}`,
  ]

  return {
    summary: `${input.organizationName} (담당: ${staffText})`,
    description: descriptionLines.join('\n'),
    location: firstSlot.location,
    start: {
      dateTime: `${input.date}T${firstSlot.startTime}:00`,
      timeZone: KST_TIMEZONE,
    },
    end: {
      dateTime: `${input.date}T${lastSlot.endTime}:00`,
      timeZone: KST_TIMEZONE,
    },
  }
}
