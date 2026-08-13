import { createClient } from '@supabase/supabase-js'
import { Database, SportsEvent, EventDate } from '@/types/database'
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

export interface EventListScope {
  role: string
  regionId: number | null
}

export type EventWithDates = SportsEvent & { event_dates: EventDate[] }

type ServerResult<T> = { data: T | null; error: { message: string } | null; status?: number }

// target_region_code(south/north) -> regions.id 조회
async function regionIdForCode(code: 'south' | 'north' | null): Promise<number | null> {
  if (!code) return null
  const { data } = await runQueryWithTimeout(
    supabaseAdmin.from('regions').select('id').eq('code', code).single(),
    '지역 정보를 불러오는 중 시간이 초과되었습니다.'
  )
  return data?.id ?? null
}

// 지역관리자 role(south/north) -> 본인 지역의 regions.id 조회 (목록 조회 스코프 계산용)
export async function regionIdForAdminRole(role: 'south' | 'north'): Promise<number | null> {
  return regionIdForCode(role)
}

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

// 이벤트 생성. target_region_id는 input.target_region_code로부터 서버에서 직접 조회한다.
// (호출측인 라우트에서 지역 스코프 강제를 이미 마친 뒤 effective code를 넘겨준다)
// thumbnailPath: 대표이미지 업로드 결과 storage path (선택). validateEventInput의 핵심 필드 검증 대상이 아니므로 별도 인자로 받는다.
export async function createEventOnServer(
  input: NormalizedEventInput,
  authorId: string,
  thumbnailPath?: string | null
): Promise<ServerResult<SportsEvent>> {
  try {
    const target_region_id = await regionIdForCode(input.target_region_code)

    const { data: event, error } = await runQueryWithTimeout(
      supabaseAdmin
        .from('events')
        .insert([{
          title: input.title,
          description: input.description,
          content_type: input.content_type,
          thumbnail_path: thumbnailPath ?? null,
          video_url: input.video_url,
          target_type: input.target_type,
          target_region_id,
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

// 이벤트 수정. 소유권 확인(super가 아니면 본인 작성 이벤트만) 후 events + event_dates 통째 교체.
// thumbnailPath: 대표이미지 storage path 갱신값 (선택). undefined면 기존 값을 그대로 유지하고,
// string 또는 null이면 명시적으로 덮어쓴다 (호출측에서 body에 키가 있었는지로 구분해 넘겨준다).
export async function updateEventOnServer(
  id: string,
  input: NormalizedEventInput,
  requester: EventRequester,
  thumbnailPath?: string | null
): Promise<ServerResult<SportsEvent>> {
  try {
    const { data: existing, error: fetchError } = await runQueryWithTimeout(
      supabaseAdmin.from('events').select('id, author_id').eq('id', id).single(),
      '이벤트 정보를 불러오는 중 시간이 초과되었습니다.'
    )

    if (fetchError || !existing) {
      return { data: null, error: { message: '이벤트를 찾을 수 없습니다.' }, status: 404 }
    }

    if (requester.role !== 'super' && existing.author_id !== requester.id) {
      return {
        data: null,
        error: { message: '본인이 등록한 이벤트만 수정/삭제할 수 있습니다.' },
        status: 403,
      }
    }

    const target_region_id = await regionIdForCode(input.target_region_code)

    const updatePayload: Database['public']['Tables']['events']['Update'] = {
      title: input.title,
      description: input.description,
      content_type: input.content_type,
      video_url: input.video_url,
      target_type: input.target_type,
      target_region_id,
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

// 이벤트 삭제. 소유권 확인(super가 아니면 본인 작성 이벤트만) 후 삭제 (하위 event_dates 등은 CASCADE).
export async function deleteEventOnServer(
  id: string,
  requester: EventRequester
): Promise<ServerResult<{ id: string }>> {
  try {
    const { data: existing, error: fetchError } = await runQueryWithTimeout(
      supabaseAdmin.from('events').select('id, author_id').eq('id', id).single(),
      '이벤트 정보를 불러오는 중 시간이 초과되었습니다.'
    )

    if (fetchError || !existing) {
      return { data: null, error: { message: '이벤트를 찾을 수 없습니다.' }, status: 404 }
    }

    if (requester.role !== 'super' && existing.author_id !== requester.id) {
      return {
        data: null,
        error: { message: '본인이 등록한 이벤트만 수정/삭제할 수 있습니다.' },
        status: 403,
      }
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

// 이벤트 목록 조회. super는 전체, 지역관리자는 target_type='all' 이거나 본인 지역 이벤트만.
export async function listEventsOnServer(
  scope: EventListScope
): Promise<ServerResult<EventWithDates[]>> {
  try {
    let query = supabaseAdmin.from('events').select('*, event_dates(*)')

    if (scope.role !== 'super') {
      if (scope.regionId !== null) {
        query = query.or(`target_type.eq.all,target_region_id.eq.${scope.regionId}`)
      } else {
        query = query.eq('target_type', 'all')
      }
    }

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
