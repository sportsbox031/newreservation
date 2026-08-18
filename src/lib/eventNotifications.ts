// 스포츠이벤트 알림톡 디스패처.
// 신청 ID로 발송에 필요한 정보(연락처/단체명/이벤트명/일정)를 로드해 해당 알림을 보낸다.
// - 알림 발송은 절대 throw하지 않는다(메인 액션 성공/실패에 영향 없음).
// - 템플릿 코드(env)가 없으면 조용히 건너뛴다(penaltyServer 패턴과 동일).
// - 카카오 승인 템플릿이 필요하지만 aligo의 failover:true로 미승인/실패 시 SMS 대체 발송된다.

import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { withTimeout } from '@/lib/requestUtils'
import {
  sendEventApplicationNotification,
  sendEventCancellationNotification,
  sendEventSelectionNotification,
  sendEventRejectionNotification,
} from '@/lib/aligo'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
const T = 8000

const APPLICATION_TPL = process.env.NEXT_PUBLIC_ALIGO_EVENT_APPLICATION_TPL_CODE || ''
const CANCEL_TPL = process.env.NEXT_PUBLIC_ALIGO_EVENT_CANCEL_TPL_CODE || ''
const SELECTED_TPL = process.env.NEXT_PUBLIC_ALIGO_EVENT_SELECTED_TPL_CODE || ''
const REJECTED_TPL = process.env.NEXT_PUBLIC_ALIGO_EVENT_REJECTED_TPL_CODE || ''

type NotifyContext = { phone: string; org: string; eventTitle: string; eventDate: string }

async function loadContext(applicationId: string): Promise<NotifyContext | null> {
  try {
    const { data } = await withTimeout(
      supabaseAdmin
        .from('event_applications')
        .select('applicant_phone, applicant_org_name, events(title), event_dates(event_date)')
        .eq('id', applicationId)
        .maybeSingle(),
      T,
      '알림 정보를 확인하는 중 시간이 초과되었습니다.'
    )
    if (!data) return null
    const r = data as Record<string, unknown>
    const phone = (r.applicant_phone as string) || ''
    if (!phone) return null
    const ev = r.events as { title?: string } | null
    const ed = r.event_dates as { event_date?: string } | null
    return {
      phone,
      org: (r.applicant_org_name as string) || '담당자',
      eventTitle: ev?.title ?? '이벤트',
      eventDate: ed?.event_date ?? '',
    }
  } catch {
    return null
  }
}

export async function notifyEventApplication(applicationId: string): Promise<void> {
  try {
    if (!APPLICATION_TPL) return
    const c = await loadContext(applicationId)
    if (!c) return
    await sendEventApplicationNotification(c.phone, c.org, c.eventTitle, c.eventDate, APPLICATION_TPL)
  } catch (e) {
    console.error('이벤트 신청 알림 발송 오류:', e)
  }
}

export async function notifyEventCancellation(applicationId: string): Promise<void> {
  try {
    if (!CANCEL_TPL) return
    const c = await loadContext(applicationId)
    if (!c) return
    await sendEventCancellationNotification(c.phone, c.org, c.eventTitle, CANCEL_TPL)
  } catch (e) {
    console.error('이벤트 취소 알림 발송 오류:', e)
  }
}

export async function notifyEventSelection(applicationId: string): Promise<void> {
  try {
    if (!SELECTED_TPL) return
    const c = await loadContext(applicationId)
    if (!c) return
    await sendEventSelectionNotification(c.phone, c.org, c.eventTitle, SELECTED_TPL)
  } catch (e) {
    console.error('이벤트 선정 알림 발송 오류:', e)
  }
}

export async function notifyEventRejection(applicationId: string): Promise<void> {
  try {
    if (!REJECTED_TPL) return
    const c = await loadContext(applicationId)
    if (!c) return
    await sendEventRejectionNotification(c.phone, c.org, c.eventTitle, REJECTED_TPL)
  } catch (e) {
    console.error('이벤트 선정결과 알림 발송 오류:', e)
  }
}
