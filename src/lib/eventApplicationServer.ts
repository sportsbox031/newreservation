// src/lib/eventApplicationServer.ts
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { getErrorMessage, withTimeout } from '@/lib/requestUtils'
import { computeEffectiveOpen } from '@/lib/eventReservationStatus'
import { canCancelApplication, type NormalizedApplicationInput } from '@/lib/eventApplicationHelpers'
import { notifyEventApplication, notifyEventCancellation } from '@/lib/eventNotifications'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
})
const T = 8000

export type ServerResult<T> = { data: T | null; error: { message: string } | null; status?: number }
export type MyEventDateOption = { id: string; event_date: string; label: string | null }
export type MyApplicationRow = {
  id: string
  event_id: string
  event_title: string
  event_date: string | null       // 선택한 일정(표시용)
  event_date_id: string | null    // 선택한 일정 id(수정 프리필용)
  student_count: number
  leader_count: number
  status: string
  total_count: number
  created_at: string
  event_dates: MyEventDateOption[] // 이벤트의 전체 일정 옵션(수정 달력용)
}

async function resolveUserRegionId(userId: string, cityId: number | null): Promise<number | null> {
  if (!cityId) return null
  const { data } = await withTimeout(
    supabaseAdmin.from('cities').select('region_id').eq('id', cityId).single(),
    T,
    '지역 정보를 확인하는 중 시간이 초과되었습니다.'
  )
  return data?.region_id ?? null
}

export async function createApplicationOnServer(
  input: NormalizedApplicationInput,
  userId: string,
  nowIso: string
): Promise<ServerResult<{ id: string }>> {
  try {
    // 1) 이벤트 존재 + 모집중
    const { data: event, error: evErr } = await withTimeout(
      supabaseAdmin
        .from('events')
        .select('id, is_open, reservation_start_at, reservation_end_at')
        .eq('id', input.event_id)
        .single(),
      T,
      '이벤트 정보를 불러오는 중 시간이 초과되었습니다.'
    )
    if (evErr || !event) return { data: null, error: { message: '이벤트를 찾을 수 없습니다.' }, status: 404 }
    if (!computeEffectiveOpen(event, nowIso)) {
      return { data: null, error: { message: '현재 신청할 수 없는 이벤트입니다.' }, status: 400 }
    }

    // 2) 선택 날짜가 이벤트 소속인지
    const { data: date, error: dateErr } = await withTimeout(
      supabaseAdmin
        .from('event_dates')
        .select('id')
        .eq('id', input.event_date_id)
        .eq('event_id', input.event_id)
        .maybeSingle(),
      T,
      '일정 정보를 확인하는 중 시간이 초과되었습니다.'
    )
    if (dateErr) return { data: null, error: { message: getErrorMessage(dateErr, '일정 정보를 확인하는데 실패했습니다.') }, status: 500 }
    if (!date) return { data: null, error: { message: '선택한 일정이 올바르지 않습니다.' }, status: 400 }

    // 3) 스냅샷: users 행에서 단체/담당/연락처/지역
    const { data: user, error: uErr } = await withTimeout(
      supabaseAdmin
        .from('users')
        .select('organization_name, manager_name, phone, city_id')
        .eq('id', userId)
        .single(),
      T,
      '회원 정보를 불러오는 중 시간이 초과되었습니다.'
    )
    if (uErr || !user) return { data: null, error: { message: '회원 정보를 확인할 수 없습니다.' }, status: 400 }
    const region_id = await resolveUserRegionId(userId, user.city_id ?? null)

    // 4) insert (부분 유니크 위반 = 이미 신청)
    const { data: inserted, error: insErr } = await withTimeout(
      supabaseAdmin
        .from('event_applications')
        .insert([{
          event_id: input.event_id,
          user_id: userId,
          event_date_id: input.event_date_id,
          student_count: input.student_count,
          leader_count: input.leader_count,
          applicant_org_name: user.organization_name,
          applicant_manager_name: user.manager_name,
          applicant_phone: user.phone,
          region_id,
          status: 'applied',
        }])
        .select('id')
        .single(),
      T,
      '신청 저장 중 시간이 초과되었습니다.'
    )
    if (insErr || !inserted) {
      const msg = /duplicate|unique/i.test(insErr?.message || '')
        ? '이미 신청한 이벤트입니다.'
        : getErrorMessage(insErr, '신청에 실패했습니다.')
      return { data: null, error: { message: msg }, status: 400 }
    }
    // 신청 완료 알림(서류 제출 안내 포함). 실패해도 신청 자체는 유지된다.
    await notifyEventApplication(inserted.id)
    return { data: { id: inserted.id }, error: null }
  } catch (e) {
    return { data: null, error: { message: getErrorMessage(e, '신청 처리 중 오류가 발생했습니다.') }, status: 500 }
  }
}

export async function listMyApplicationsOnServer(userId: string): Promise<ServerResult<MyApplicationRow[]>> {
  try {
    const { data, error } = await withTimeout(
      supabaseAdmin
        .from('event_applications')
        .select('id, event_id, event_date_id, student_count, leader_count, status, total_count, created_at, events(title, event_dates(id, event_date, label, sort_order))')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      T,
      '신청 내역을 불러오는 중 시간이 초과되었습니다.'
    )
    if (error) return { data: null, error: { message: getErrorMessage(error, '신청 내역을 불러오는데 실패했습니다.') } }
    const rows: MyApplicationRow[] = (data ?? []).map((r: Record<string, unknown>) => {
      const ev = r.events as { title?: string; event_dates?: { id: string; event_date: string; label: string | null; sort_order: number }[] } | null
      const options: MyEventDateOption[] = (ev?.event_dates ?? [])
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((d) => ({ id: d.id, event_date: d.event_date, label: d.label }))
      const chosen = options.find((o) => o.id === (r.event_date_id as string | null))
      return {
        id: r.id as string,
        event_id: r.event_id as string,
        event_title: ev?.title ?? '(삭제된 이벤트)',
        event_date: chosen?.event_date ?? null,
        event_date_id: (r.event_date_id as string | null) ?? null,
        student_count: (r.student_count as number) ?? 0,
        leader_count: (r.leader_count as number) ?? 0,
        status: r.status as string,
        total_count: (r.total_count as number) ?? 0,
        created_at: r.created_at as string,
        event_dates: options,
      }
    })
    return { data: rows, error: null }
  } catch (e) {
    return { data: null, error: { message: getErrorMessage(e, '신청 내역을 불러오는 중 오류가 발생했습니다.') } }
  }
}

export async function cancelApplicationOnServer(id: string, userId: string): Promise<ServerResult<{ id: string }>> {
  try {
    const { data: app, error: fErr } = await withTimeout(
      supabaseAdmin.from('event_applications').select('id, user_id, status').eq('id', id).single(),
      T,
      '신청 정보를 불러오는 중 시간이 초과되었습니다.'
    )
    if (fErr || !app) return { data: null, error: { message: '신청 내역을 찾을 수 없습니다.' }, status: 404 }
    if (app.user_id !== userId) return { data: null, error: { message: '본인 신청만 취소할 수 있습니다.' }, status: 403 }
    if (!canCancelApplication(app.status)) {
      return { data: null, error: { message: '이미 선정/탈락 처리되었거나 취소된 신청입니다.' }, status: 400 }
    }
    const { error: uErr } = await withTimeout(
      supabaseAdmin
        .from('event_applications')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', id),
      T,
      '신청 취소 중 시간이 초과되었습니다.'
    )
    if (uErr) return { data: null, error: { message: getErrorMessage(uErr, '신청 취소에 실패했습니다.') }, status: 400 }
    // 신청 취소 알림. 실패해도 취소 자체는 유지된다.
    await notifyEventCancellation(id)
    return { data: { id }, error: null }
  } catch (e) {
    return { data: null, error: { message: getErrorMessage(e, '신청 취소 중 오류가 발생했습니다.') }, status: 500 }
  }
}

// 선정 발표 전(status='applied')에만 본인 신청건을 수정한다(일정/참여 인원).
export async function updateApplicationOnServer(
  id: string,
  userId: string,
  input: NormalizedApplicationInput
): Promise<ServerResult<{ id: string }>> {
  try {
    const { data: app, error: fErr } = await withTimeout(
      supabaseAdmin.from('event_applications').select('id, user_id, status, event_id').eq('id', id).single(),
      T,
      '신청 정보를 불러오는 중 시간이 초과되었습니다.'
    )
    if (fErr || !app) return { data: null, error: { message: '신청 내역을 찾을 수 없습니다.' }, status: 404 }
    if (app.user_id !== userId) return { data: null, error: { message: '본인 신청만 수정할 수 있습니다.' }, status: 403 }
    if (!canCancelApplication(app.status)) {
      return { data: null, error: { message: '선정/탈락 처리되었거나 취소된 신청은 수정할 수 없습니다.' }, status: 400 }
    }

    // 선택 날짜가 이 이벤트 소속인지 검증
    const { data: date, error: dErr } = await withTimeout(
      supabaseAdmin
        .from('event_dates')
        .select('id')
        .eq('id', input.event_date_id)
        .eq('event_id', app.event_id)
        .maybeSingle(),
      T,
      '일정 정보를 확인하는 중 시간이 초과되었습니다.'
    )
    if (dErr) return { data: null, error: { message: getErrorMessage(dErr, '일정 정보를 확인하는데 실패했습니다.') }, status: 500 }
    if (!date) return { data: null, error: { message: '선택한 일정이 올바르지 않습니다.' }, status: 400 }

    const { error: uErr } = await withTimeout(
      supabaseAdmin
        .from('event_applications')
        .update({
          event_date_id: input.event_date_id,
          student_count: input.student_count,
          leader_count: input.leader_count,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id),
      T,
      '신청 수정 중 시간이 초과되었습니다.'
    )
    if (uErr) return { data: null, error: { message: getErrorMessage(uErr, '신청 수정에 실패했습니다.') }, status: 400 }
    return { data: { id }, error: null }
  } catch (e) {
    return { data: null, error: { message: getErrorMessage(e, '신청 수정 중 오류가 발생했습니다.') }, status: 500 }
  }
}
