export type NormalizedEventDate = { event_date: string; label: string | null; sort_order: number }

export type NormalizedEventInput = {
  title: string
  description: string
  content_type: 'html' | 'text'
  video_url: string | null
  dates: NormalizedEventDate[]
}

type ValidateResult =
  | { ok: true; value: NormalizedEventInput }
  | { ok: false; message: string }

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function validateEventInput(input: unknown): ValidateResult {
  const raw = (input ?? {}) as Record<string, unknown>

  const title = typeof raw.title === 'string' ? raw.title.trim() : ''
  if (!title) {
    return { ok: false, message: '이벤트명을 입력해주세요.' }
  }

  const content_type = raw.content_type === 'text' ? 'text' : 'html'

  const rawDates = Array.isArray(raw.dates) ? raw.dates : []
  if (rawDates.length === 0) {
    return { ok: false, message: '일정 날짜를 최소 1개 이상 추가해주세요.' }
  }

  const dates: NormalizedEventDate[] = []
  for (let i = 0; i < rawDates.length; i++) {
    const d = (rawDates[i] ?? {}) as Record<string, unknown>
    const event_date = typeof d.event_date === 'string' ? d.event_date : ''
    if (!ISO_DATE.test(event_date)) {
      return { ok: false, message: '일정 날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)' }
    }
    dates.push({
      event_date,
      label: typeof d.label === 'string' && d.label.trim() ? d.label.trim() : null,
      sort_order: typeof d.sort_order === 'number' ? d.sort_order : i,
    })
  }

  const videoRaw = typeof raw.video_url === 'string' ? raw.video_url.trim() : ''
  const description = typeof raw.description === 'string' ? raw.description : ''

  return {
    ok: true,
    value: { title, description, content_type, video_url: videoRaw || null, dates },
  }
}
