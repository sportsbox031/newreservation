import { createClient } from '@supabase/supabase-js'

import { Database, UserPenalty } from '@/types/database'
import {
  PENALTY_REASONS,
  derivePenaltyStatus,
  formatYearMonthLabel,
  getKstYear,
  getKstYearMonth,
  getNextYearMonth,
  type PenaltyStatus,
} from '@/lib/penalty'
import {
  sendPenaltyEjectionNotification,
  sendPenaltyWarningNotification,
} from '@/lib/aligo'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false
  }
})

const WARNING_TPL_CODE = process.env.NEXT_PUBLIC_ALIGO_PENALTY_WARNING_TPL_CODE || ''
const EJECTION_TPL_CODE = process.env.NEXT_PUBLIC_ALIGO_PENALTY_EJECTION_TPL_CODE || ''

// KST 기준 올해 1월 1일 00:00 → UTC ISO 문자열 (전년도 12/31 15:00 UTC)
function getKstYearStartIso(now: Date = new Date()): string {
  const year = getKstYear(now)
  return new Date(Date.UTC(year - 1, 11, 31, 15, 0, 0)).toISOString()
}

function canManageRegion(adminRole: string, regionCode: string | null): boolean {
  if (adminRole === 'super') {
    return true
  }
  return !!regionCode && adminRole === regionCode
}

async function fetchPenaltyTargetUser(userId: string): Promise<{
  data: { id: string; organization_name: string; phone: string; region_code: string | null } | null
  error: string | null
}> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, organization_name, phone, cities(regions(code))')
    .eq('id', userId)
    .single()

  if (error || !data) {
    return { data: null, error: error?.message || '회원 정보를 찾을 수 없습니다.' }
  }

  const city = Array.isArray(data.cities) ? data.cities[0] : data.cities
  const region = Array.isArray(city?.regions) ? city.regions[0] : city?.regions

  return {
    data: {
      id: data.id,
      organization_name: data.organization_name,
      phone: data.phone,
      region_code: region?.code ?? null
    },
    error: null
  }
}

// 특정 사용자의 올해 패널티 상태
export async function getUserPenaltyStatus(userId: string): Promise<{
  data: PenaltyStatus | null
  error: string | null
}> {
  const { data, error } = await supabaseAdmin
    .from('user_penalties')
    .select('id, type, reason, restricted_month, triggered_by_warning, issued_by, created_at')
    .eq('user_id', userId)
    .gte('created_at', getKstYearStartIso())
    .order('created_at', { ascending: true })

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: derivePenaltyStatus(data || []), error: null }
}

// 전체 사용자의 올해 패널티 상태 요약 (관리자 회원관리 페이지용)
export async function getPenaltyStatusSummaries(): Promise<{
  data: Record<string, PenaltyStatus> | null
  error: string | null
}> {
  const { data, error } = await supabaseAdmin
    .from('user_penalties')
    .select('id, user_id, type, reason, restricted_month, triggered_by_warning, issued_by, created_at')
    .gte('created_at', getKstYearStartIso())
    .order('created_at', { ascending: true })

  if (error) {
    return { data: null, error: error.message }
  }

  const byUser = new Map<string, UserPenalty[]>()
  for (const penalty of data || []) {
    const list = byUser.get(penalty.user_id) || []
    list.push(penalty)
    byUser.set(penalty.user_id, list)
  }

  const summaries: Record<string, PenaltyStatus> = {}
  for (const [userId, records] of byUser) {
    summaries[userId] = derivePenaltyStatus(records)
  }

  return { data: summaries, error: null }
}

// 특정 사용자의 올해 패널티 내역 (관리자용)
export async function listUserPenalties(userId: string): Promise<{
  data: UserPenalty[] | null
  error: string | null
}> {
  const { data, error } = await supabaseAdmin
    .from('user_penalties')
    .select('id, user_id, type, reason, restricted_month, triggered_by_warning, issued_by, created_at')
    .eq('user_id', userId)
    .gte('created_at', getKstYearStartIso())
    .order('created_at', { ascending: false })

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: data || [], error: null }
}

export interface IssuePenaltyResult {
  // 이번 조치로 퇴장 처리되었는지 (경고 누적 자동 퇴장 포함)
  ejected: boolean
  status: PenaltyStatus
  notificationError: string | null
}

// 경고/퇴장 부여. 경고 누적 시 자동 퇴장 처리 후 퇴장 알림톡만 발송한다.
export async function issuePenaltyOnServer(input: {
  adminRole: string
  adminUsername: string
  userId: string
  type: 'warning' | 'ejection'
  reason: string
}): Promise<{ data: IssuePenaltyResult | null; error: string | null }> {
  if (!(PENALTY_REASONS as readonly string[]).includes(input.reason)) {
    return { data: null, error: '올바르지 않은 패널티 사유입니다.' }
  }

  const userResult = await fetchPenaltyTargetUser(input.userId)
  if (userResult.error || !userResult.data) {
    return { data: null, error: userResult.error }
  }

  if (!canManageRegion(input.adminRole, userResult.data.region_code)) {
    return { data: null, error: '해당 지역 회원에 대한 권한이 없습니다.' }
  }

  const statusResult = await getUserPenaltyStatus(input.userId)
  if (statusResult.error || !statusResult.data) {
    return { data: null, error: statusResult.error }
  }

  const status = statusResult.data
  if (status.restricted) {
    return { data: null, error: '이미 신청 제한 중인 회원입니다.' }
  }

  // 경고 누적 없이 바로 퇴장하는 것은 허용하지 않는다
  if (input.type === 'ejection' && status.warningCount === 0) {
    return { data: null, error: '누적된 경고가 없어 퇴장할 수 없습니다. 경고를 먼저 부여해주세요.' }
  }

  const currentYearMonth = getKstYearMonth()
  const resumeYearMonth = getNextYearMonth(currentYearMonth)
  const restrictedMonthLabel = formatYearMonthLabel(currentYearMonth)
  const resumeMonthLabel = formatYearMonthLabel(resumeYearMonth)

  let ejected = false
  let ejectionReason = input.reason
  let notificationError: string | null = null

  if (input.type === 'warning') {
    const { error: warningError } = await supabaseAdmin
      .from('user_penalties')
      .insert([{
        user_id: input.userId,
        type: 'warning',
        reason: input.reason,
        issued_by: input.adminUsername
      }])

    if (warningError) {
      return { data: null, error: warningError.message }
    }

    ejected = status.warningCount + 1 >= status.warningThreshold
    if (ejected) {
      ejectionReason = status.probation ? '보호관찰 중 경고 누적' : '경고 2회 누적'
    }
  }

  if (input.type === 'ejection' || ejected) {
    const { error: ejectionError } = await supabaseAdmin
      .from('user_penalties')
      .insert([{
        user_id: input.userId,
        type: 'ejection',
        reason: input.type === 'ejection' ? input.reason : ejectionReason,
        restricted_month: currentYearMonth,
        triggered_by_warning: input.type === 'warning',
        issued_by: input.adminUsername
      }])

    if (ejectionError) {
      return { data: null, error: ejectionError.message }
    }

    ejected = true
  }

  // 알림톡 발송 (실패해도 패널티 부여 자체는 유지)
  try {
    if (ejected) {
      if (EJECTION_TPL_CODE) {
        const result = await sendPenaltyEjectionNotification(
          userResult.data.phone,
          userResult.data.organization_name,
          input.type === 'ejection' ? input.reason : ejectionReason,
          restrictedMonthLabel,
          resumeMonthLabel,
          EJECTION_TPL_CODE
        )
        if (!result.success) {
          notificationError = result.error || '퇴장 알림톡 발송에 실패했습니다.'
        }
      } else {
        notificationError = '퇴장 알림톡 템플릿 코드가 설정되지 않아 발송을 건너뛰었습니다.'
      }
    } else {
      if (WARNING_TPL_CODE) {
        const result = await sendPenaltyWarningNotification(
          userResult.data.phone,
          userResult.data.organization_name,
          input.reason,
          WARNING_TPL_CODE
        )
        if (!result.success) {
          notificationError = result.error || '경고 알림톡 발송에 실패했습니다.'
        }
      } else {
        notificationError = '경고 알림톡 템플릿 코드가 설정되지 않아 발송을 건너뛰었습니다.'
      }
    }
  } catch (error) {
    console.error('패널티 알림톡 발송 예외:', error)
    notificationError = '알림톡 발송 중 오류가 발생했습니다.'
  }

  const updatedStatusResult = await getUserPenaltyStatus(input.userId)

  return {
    data: {
      ejected,
      status: updatedStatusResult.data || status,
      notificationError
    },
    error: null
  }
}

// 패널티 취소(삭제). 취소 시 알림톡은 발송하지 않는다.
export async function deletePenaltyOnServer(
  penaltyId: string,
  adminRole: string
): Promise<{ data: boolean | null; error: string | null }> {
  const { data: penalty, error: penaltyError } = await supabaseAdmin
    .from('user_penalties')
    .select('id, user_id')
    .eq('id', penaltyId)
    .single()

  if (penaltyError || !penalty) {
    return { data: null, error: penaltyError?.message || '패널티 내역을 찾을 수 없습니다.' }
  }

  const userResult = await fetchPenaltyTargetUser(penalty.user_id)
  if (userResult.error || !userResult.data) {
    return { data: null, error: userResult.error }
  }

  if (!canManageRegion(adminRole, userResult.data.region_code)) {
    return { data: null, error: '해당 지역 회원에 대한 권한이 없습니다.' }
  }

  const { error: deleteError } = await supabaseAdmin
    .from('user_penalties')
    .delete()
    .eq('id', penaltyId)

  if (deleteError) {
    return { data: null, error: deleteError.message }
  }

  return { data: true, error: null }
}
