import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { getErrorMessage, withTimeout } from '@/lib/requestUtils'
import { computeEffectiveOpen } from '@/lib/eventReservationStatus'
import type { EventWithDates } from '@/lib/eventServer'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
})

const QUERY_TIMEOUT_MS = 8000

export async function listOpenEventsOnServer(
  nowIso: string
): Promise<{ data: EventWithDates[] | null; error: { message: string } | null }> {
  try {
    const { data, error } = await withTimeout(
      supabaseAdmin
        .from('events')
        .select('*, event_dates(*), event_form_files(*)')
        .order('created_at', { ascending: false }),
      QUERY_TIMEOUT_MS,
      '이벤트 목록을 불러오는 중 시간이 초과되었습니다.'
    )
    if (error) {
      return { data: null, error: { message: getErrorMessage(error, '이벤트 목록을 불러오는데 실패했습니다.') } }
    }
    const rows = (data ?? []) as EventWithDates[]
    const open = rows.filter((e) => computeEffectiveOpen(e, nowIso))
    return { data: open, error: null }
  } catch (e) {
    return { data: null, error: { message: getErrorMessage(e, '이벤트 목록을 불러오는 중 오류가 발생했습니다.') } }
  }
}

export async function getEventForUserOnServer(
  id: string,
  userId: string,
  nowIso: string
): Promise<{ data: EventWithDates | null; error: { message: string } | null; status?: number }> {
  try {
    const { data, error } = await withTimeout(
      supabaseAdmin
        .from('events')
        .select('*, event_dates(*), event_form_files(*)')
        .eq('id', id)
        .single(),
      QUERY_TIMEOUT_MS,
      '이벤트 정보를 불러오는 중 시간이 초과되었습니다.'
    )
    if (error || !data) {
      return { data: null, error: { message: '이벤트를 찾을 수 없습니다.' }, status: 404 }
    }
    const event = data as EventWithDates

    if (computeEffectiveOpen(event, nowIso)) {
      return { data: event, error: null }
    }

    // 모집 종료: 본인 신청 이력이 있으면 열람 허용
    const { data: app } = await withTimeout(
      supabaseAdmin
        .from('event_applications')
        .select('id')
        .eq('event_id', id)
        .eq('user_id', userId)
        .limit(1),
      QUERY_TIMEOUT_MS,
      '신청 이력을 확인하는 중 시간이 초과되었습니다.'
    )
    if (app && app.length > 0) {
      return { data: event, error: null }
    }

    return { data: null, error: { message: '모집이 종료된 이벤트입니다.' }, status: 403 }
  } catch (e) {
    return { data: null, error: { message: getErrorMessage(e, '이벤트 정보를 불러오는 중 오류가 발생했습니다.') }, status: 500 }
  }
}

export async function signedUrlForFormFileOnServer(
  formFileId: string,
  userId: string,
  nowIso: string
): Promise<{ data: { url: string } | null; error: { message: string } | null; status?: number }> {
  try {
    const { data: ff } = await withTimeout(
      supabaseAdmin.from('event_form_files').select('event_id, file_name, storage_path').eq('id', formFileId).maybeSingle(),
      QUERY_TIMEOUT_MS, '서류양식 정보를 확인하는 중 시간이 초과되었습니다.'
    )
    if (!ff) return { data: null, error: { message: '서류양식을 찾을 수 없습니다.' }, status: 404 }

    const { data: ev } = await withTimeout(
      supabaseAdmin.from('events').select('is_open, reservation_start_at, reservation_end_at').eq('id', ff.event_id).maybeSingle(),
      QUERY_TIMEOUT_MS, '이벤트 정보를 확인하는 중 시간이 초과되었습니다.'
    )
    let allowed = ev ? computeEffectiveOpen(ev, nowIso) : false
    if (!allowed) {
      const { data: app } = await withTimeout(
        supabaseAdmin.from('event_applications').select('id').eq('event_id', ff.event_id).eq('user_id', userId).limit(1),
        QUERY_TIMEOUT_MS, '신청 이력을 확인하는 중 시간이 초과되었습니다.'
      )
      allowed = Boolean(app && app.length > 0)
    }
    if (!allowed) return { data: null, error: { message: '다운로드 권한이 없습니다.' }, status: 403 }

    const { data: signed, error } = await supabaseAdmin.storage.from('event-files').createSignedUrl(ff.storage_path, 3600, { download: ff.file_name })
    if (error || !signed?.signedUrl) return { data: null, error: { message: '다운로드 링크를 생성할 수 없습니다.' }, status: 400 }
    return { data: { url: signed.signedUrl }, error: null }
  } catch (e) {
    return { data: null, error: { message: getErrorMessage(e, '다운로드 처리 중 오류가 발생했습니다.') }, status: 500 }
  }
}
