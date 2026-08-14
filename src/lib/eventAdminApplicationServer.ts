// src/lib/eventAdminApplicationServer.ts
import { createClient } from '@supabase/supabase-js'
import { Database, type EventApplicationStatus } from '@/types/database'
import { getErrorMessage, withTimeout } from '@/lib/requestUtils'
import { isValidSelectionStatus } from '@/lib/eventSubmissionHelpers'
import type { ServerResult } from '@/lib/eventApplicationServer'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
const T = 8000

export type AdminApplicationRow = {
  id: string
  org_name: string
  manager_name: string | null
  phone: string | null
  event_date: string | null
  total_count: number
  status: string
  submission_count: number
  created_at: string
}

export async function listApplicationsForEventOnServer(eventId: string): Promise<ServerResult<AdminApplicationRow[]>> {
  try {
    const { data, error } = await withTimeout(
      supabaseAdmin.from('event_applications')
        .select('id, applicant_org_name, applicant_manager_name, applicant_phone, total_count, status, created_at, event_dates(event_date), event_submissions(id)')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true }),
      T, '신청자 목록을 불러오는 중 시간이 초과되었습니다.'
    )
    if (error) return { data: null, error: { message: getErrorMessage(error, '신청자 목록을 불러오는데 실패했습니다.') }, status: 400 }
    const rows: AdminApplicationRow[] = (data ?? []).map((a: Record<string, unknown>) => {
      const ed = a.event_dates as { event_date?: string } | null
      const subs = (a.event_submissions as unknown[]) ?? []
      return {
        id: a.id as string,
        org_name: (a.applicant_org_name as string) ?? '(단체명 없음)',
        manager_name: (a.applicant_manager_name as string) ?? null,
        phone: (a.applicant_phone as string) ?? null,
        event_date: ed?.event_date ?? null,
        total_count: (a.total_count as number) ?? 0,
        status: a.status as string,
        submission_count: subs.length,
        created_at: a.created_at as string,
      }
    })
    return { data: rows, error: null }
  } catch (e) {
    return { data: null, error: { message: getErrorMessage(e, '신청자 목록 조회 중 오류가 발생했습니다.') }, status: 500 }
  }
}

export async function setApplicationStatusOnServer(id: string, status: string): Promise<ServerResult<{ id: string; status: string }>> {
  try {
    if (!isValidSelectionStatus(status)) {
      return { data: null, error: { message: '허용되지 않는 상태입니다.' }, status: 400 }
    }
    const { data: existing } = await withTimeout(
      supabaseAdmin.from('event_applications').select('id, status').eq('id', id).maybeSingle(),
      T, '신청 정보를 불러오는 중 시간이 초과되었습니다.'
    )
    if (!existing) return { data: null, error: { message: '신청 내역을 찾을 수 없습니다.' }, status: 404 }
    if (existing.status === 'cancelled') {
      return { data: null, error: { message: '취소된 신청은 상태를 변경할 수 없습니다.' }, status: 400 }
    }
    const { error } = await withTimeout(
      supabaseAdmin.from('event_applications').update({ status: status as EventApplicationStatus, updated_at: new Date().toISOString() }).eq('id', id),
      T, '상태 변경 중 시간이 초과되었습니다.'
    )
    if (error) return { data: null, error: { message: getErrorMessage(error, '상태 변경에 실패했습니다.') }, status: 400 }
    return { data: { id, status }, error: null }
  } catch (e) {
    return { data: null, error: { message: getErrorMessage(e, '상태 변경 중 오류가 발생했습니다.') }, status: 500 }
  }
}
