export type NormalizedApplicationInput = {
  event_id: string
  event_date_id: string
  student_count: number
  leader_count: number
}

type ValidateResult =
  | { ok: true; value: NormalizedApplicationInput }
  | { ok: false; message: string }

function toCount(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null
  if (!Number.isInteger(v) || v < 0) return null
  return v
}

export function validateApplicationInput(input: unknown): ValidateResult {
  const raw = (input ?? {}) as Record<string, unknown>

  const event_id = typeof raw.event_id === 'string' ? raw.event_id.trim() : ''
  if (!event_id) return { ok: false, message: '이벤트 정보가 올바르지 않습니다.' }

  const event_date_id = typeof raw.event_date_id === 'string' ? raw.event_date_id.trim() : ''
  if (!event_date_id) return { ok: false, message: '신청할 일정 날짜를 선택해주세요.' }

  const student_count = toCount(raw.student_count)
  const leader_count = toCount(raw.leader_count)
  if (student_count === null || leader_count === null) {
    return { ok: false, message: '참여 인원은 0 이상의 정수로 입력해주세요.' }
  }
  if (student_count + leader_count < 1) {
    return { ok: false, message: '참여 인원을 1명 이상 입력해주세요.' }
  }

  return { ok: true, value: { event_id, event_date_id, student_count, leader_count } }
}

export function computeTotalCount(student: number, leader: number): number {
  return student + leader
}

export function canCancelApplication(status: string): boolean {
  return status === 'applied'
}
