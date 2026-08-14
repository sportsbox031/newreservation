import { createClient } from '@supabase/supabase-js'
import { Database, SportsEvent, EventDate, EventFormFile } from '@/types/database'
import { getErrorMessage, withTimeout } from '@/lib/requestUtils'
import type { NormalizedEventInput } from '@/lib/eventAdminHelpers'

// 서버측에서 서비스 롤 키 사용 (src/lib/authServer.ts 패턴과 동일)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
  },
})

const QUERY_TIMEOUT_MS = 8000

async function runQueryWithTimeout<T>(promise: PromiseLike<T>, message: string): Promise<T> {
  return withTimeout(promise, QUERY_TIMEOUT_MS, message)
}

export interface EventRequester {
  id: string
  role: string
}

export type EventWithDates = SportsEvent & {
  event_dates: EventDate[]
  event_form_files: EventFormFile[]
}

type ServerResult<T> = { data: T | null; error: { message: string } | null; status?: number }

// event_dates를 통째로 교체 (기존 삭제 후 재삽입)
async function replaceEventDates(
  eventId: string,
  dates: NormalizedEventInput['dates']
): Promise<{ message: string } | null> {
  const { error: deleteError } = await runQueryWithTimeout(
    supabaseAdmin.from('event_dates').delete().eq('event_id', eventId),
    '기존 일정을 삭제하는 중 시간이 초과되었습니다.'
  )
  if (deleteError) {
    return { message: getErrorMessage(deleteError, '기존 일정을 삭제하는데 실패했습니다.') }
  }

  if (dates.length === 0) {
    return null
  }

  const rows = dates.map((d) => ({
    event_id: eventId,
    event_date: d.event_date,
    label: d.label,
    sort_order: d.sort_order,
  }))

  const { error: insertError } = await runQueryWithTimeout(
    supabaseAdmin.from('event_dates').insert(rows),
    '일정 저장 중 시간이 초과되었습니다.'
  )
  if (insertError) {
    return { message: getErrorMessage(insertError, '일정 저장에 실패했습니다.') }
  }
  return null
}

// 이벤트 생성. 이벤트는 지역과 무관한 전역 대상이다(지역 컬럼 없음).
// thumbnailPath: 대표이미지 업로드 결과 storage path (선택). validateEventInput의 핵심 필드 검증 대상이 아니므로 별도 인자로 받는다.
export async function createEventOnServer(
  input: NormalizedEventInput,
  authorId: string,
  thumbnailPath?: string | null
): Promise<ServerResult<SportsEvent>> {
  try {
    const { data: event, error } = await runQueryWithTimeout(
      supabaseAdmin
        .from('events')
        .insert([{
          title: input.title,
          description: input.description,
          content_type: input.content_type,
          thumbnail_path: thumbnailPath ?? null,
          video_url: input.video_url,
          author_id: authorId,
        }])
        .select()
        .single(),
      '이벤트 생성 중 시간이 초과되었습니다.'
    )

    if (error || !event) {
      return {
        data: null,
        error: { message: getErrorMessage(error, '이벤트 생성에 실패했습니다.') },
        status: 400,
      }
    }

    if (input.dates.length > 0) {
      const rows = input.dates.map((d) => ({
        event_id: event.id,
        event_date: d.event_date,
        label: d.label,
        sort_order: d.sort_order,
      }))
      const { error: dErr } = await runQueryWithTimeout(
        supabaseAdmin.from('event_dates').insert(rows),
        '일정 저장 중 시간이 초과되었습니다.'
      )
      if (dErr) {
        return {
          data: null,
          error: { message: getErrorMessage(dErr, '일정 저장에 실패했습니다.') },
          status: 400,
        }
      }
    }

    return { data: event, error: null }
  } catch (e) {
    return {
      data: null,
      error: { message: getErrorMessage(e, '이벤트 생성 중 오류가 발생했습니다.') },
      status: 500,
    }
  }
}

// 이벤트 수정. 이벤트는 지역관리자도 전체관리자와 동일하게 모든 이벤트를 수정할 수 있으므로
// 소유권/지역 확인 없이 존재 여부만 확인한 뒤 events + event_dates를 통째 교체한다.
// thumbnailPath: 대표이미지 storage path 갱신값 (선택). undefined면 기존 값을 그대로 유지하고,
// string 또는 null이면 명시적으로 덮어쓴다 (호출측에서 body에 키가 있었는지로 구분해 넘겨준다).
export async function updateEventOnServer(
  id: string,
  input: NormalizedEventInput,
  requester: EventRequester,
  thumbnailPath?: string | null
): Promise<ServerResult<SportsEvent>> {
  void requester // 이벤트는 관리자 간 권한 구분이 없으므로 사용하지 않음 (감사/시그니처 호환 위해 유지)
  try {
    const { data: existing, error: fetchError } = await runQueryWithTimeout(
      supabaseAdmin.from('events').select('id').eq('id', id).single(),
      '이벤트 정보를 불러오는 중 시간이 초과되었습니다.'
    )

    if (fetchError || !existing) {
      return { data: null, error: { message: '이벤트를 찾을 수 없습니다.' }, status: 404 }
    }

    const updatePayload: Database['public']['Tables']['events']['Update'] = {
      title: input.title,
      description: input.description,
      content_type: input.content_type,
      video_url: input.video_url,
      updated_at: new Date().toISOString(),
    }
    if (thumbnailPath !== undefined) {
      updatePayload.thumbnail_path = thumbnailPath
    }

    const { data: updated, error } = await runQueryWithTimeout(
      supabaseAdmin
        .from('events')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single(),
      '이벤트 수정 중 시간이 초과되었습니다.'
    )

    if (error || !updated) {
      return {
        data: null,
        error: { message: getErrorMessage(error, '이벤트 수정에 실패했습니다.') },
        status: 400,
      }
    }

    const datesError = await replaceEventDates(id, input.dates)
    if (datesError) {
      return { data: null, error: datesError, status: 400 }
    }

    return { data: updated, error: null }
  } catch (e) {
    return {
      data: null,
      error: { message: getErrorMessage(e, '이벤트 수정 중 오류가 발생했습니다.') },
      status: 500,
    }
  }
}

// 이벤트 삭제. 이벤트는 지역관리자도 전체관리자와 동일하게 모든 이벤트를 삭제할 수 있으므로
// 소유권/지역 확인 없이 존재 여부만 확인한 뒤 삭제한다 (하위 event_dates 등은 CASCADE).
export async function deleteEventOnServer(
  id: string,
  requester: EventRequester
): Promise<ServerResult<{ id: string }>> {
  void requester // 이벤트는 관리자 간 권한 구분이 없으므로 사용하지 않음 (감사/시그니처 호환 위해 유지)
  try {
    const { data: existing, error: fetchError } = await runQueryWithTimeout(
      supabaseAdmin.from('events').select('id').eq('id', id).single(),
      '이벤트 정보를 불러오는 중 시간이 초과되었습니다.'
    )

    if (fetchError || !existing) {
      return { data: null, error: { message: '이벤트를 찾을 수 없습니다.' }, status: 404 }
    }

    const { error } = await runQueryWithTimeout(
      supabaseAdmin.from('events').delete().eq('id', id),
      '이벤트 삭제 중 시간이 초과되었습니다.'
    )

    if (error) {
      return {
        data: null,
        error: { message: getErrorMessage(error, '이벤트 삭제에 실패했습니다.') },
        status: 400,
      }
    }

    return { data: { id }, error: null }
  } catch (e) {
    return {
      data: null,
      error: { message: getErrorMessage(e, '이벤트 삭제 중 오류가 발생했습니다.') },
      status: 500,
    }
  }
}

// 이벤트 목록 조회. 이벤트는 지역 구분이 없으므로 모든 관리자가 전체 목록을 조회한다.
export async function listEventsOnServer(): Promise<ServerResult<EventWithDates[]>> {
  try {
    const query = supabaseAdmin.from('events').select('*, event_dates(*), event_form_files(*)')

    const { data, error } = await runQueryWithTimeout(
      query.order('created_at', { ascending: false }),
      '이벤트 목록을 불러오는 중 시간이 초과되었습니다.'
    )

    if (error) {
      return {
        data: null,
        error: { message: getErrorMessage(error, '이벤트 목록을 불러오는데 실패했습니다.') },
        status: 400,
      }
    }

    return { data: (data ?? []) as EventWithDates[], error: null }
  } catch (e) {
    return {
      data: null,
      error: { message: getErrorMessage(e, '이벤트 목록을 불러오는 중 오류가 발생했습니다.') },
      status: 500,
    }
  }
}
