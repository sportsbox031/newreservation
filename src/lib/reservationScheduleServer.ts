// 예약 자동 시작/종료 스케줄 서버 로직
//
// 실행 모델: 별도 상시 크론 없이, 예약 오픈 상태를 읽는 주요 API가 요청 처리 전에
// processDueReservationSchedules()를 호출한다(인스턴스별 스로틀). 기한이 지난 스케줄을
// 원자적으로 클레임(UPDATE ... WHERE executed_at IS NULL)한 뒤 기존 수동 제어와 동일한
// updateTierReservationStatusOnServer()를 호출하므로, 수동 버튼과 완전히 같은 효과를 낸다.

import { createClient } from '@supabase/supabase-js'

import { Database, ReservationSchedule } from '@/types/database'
import { getErrorMessage } from '@/lib/requestUtils'
import { normalizeYearMonth } from '@/lib/reservationActiveMonth'
import {
  isReservationScheduleAction,
  kstLocalStringToUtcIso,
  type ReservationScheduleAction,
} from '@/lib/reservationSchedule'
import {
  getActiveTiersOnServer,
  updateTierReservationStatusOnServer,
} from '@/lib/reservationSettingsServer'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
  },
})

const SWEEP_THROTTLE_MS = 5000
const MAX_DUE_SCHEDULES_PER_SWEEP = 20
const MAX_PENDING_SCHEDULES_PER_REGION = 20
const EXECUTED_HISTORY_LIMIT = 10

let lastSweepStartedAt = 0
let sweepInFlight: Promise<void> | null = null

export async function listReservationSchedules(regionCode: string) {
  try {
    const [pendingResponse, executedResponse] = await Promise.all([
      supabaseAdmin
        .from('reservation_schedules')
        .select('*')
        .eq('region_code', regionCode)
        .is('executed_at', null)
        .order('scheduled_at', { ascending: true }),
      supabaseAdmin
        .from('reservation_schedules')
        .select('*')
        .eq('region_code', regionCode)
        .not('executed_at', 'is', null)
        .order('executed_at', { ascending: false })
        .limit(EXECUTED_HISTORY_LIMIT),
    ])

    if (pendingResponse.error) {
      return { data: null, error: pendingResponse.error }
    }

    if (executedResponse.error) {
      return { data: null, error: executedResponse.error }
    }

    return {
      data: {
        pending: pendingResponse.data ?? [],
        executed: executedResponse.data ?? [],
      },
      error: null,
    }
  } catch (error) {
    return {
      data: null,
      error: { message: getErrorMessage(error, '예약 스케줄을 불러오는 중 오류가 발생했습니다.') },
    }
  }
}

export async function createReservationSchedule(input: {
  regionCode: string
  yearMonth: string
  tierId: number | null
  action: string
  scheduledAtKst: string
  adminId: string
}) {
  const normalizedYearMonth = normalizeYearMonth(input.yearMonth)
  if (!normalizedYearMonth) {
    return { data: null, error: { message: '잘못된 예약 월입니다.' } }
  }

  if (!isReservationScheduleAction(input.action)) {
    return { data: null, error: { message: '잘못된 동작입니다. (open/close)' } }
  }

  const scheduledAtIso = kstLocalStringToUtcIso(input.scheduledAtKst)
  if (!scheduledAtIso) {
    return { data: null, error: { message: '올바른 실행 시각(한국 시간)을 입력해주세요.' } }
  }

  if (new Date(scheduledAtIso).getTime() <= Date.now()) {
    return { data: null, error: { message: '실행 시각은 현재 한국 시간 이후여야 합니다.' } }
  }

  if (input.tierId !== null && (!Number.isInteger(input.tierId) || input.tierId <= 0)) {
    return { data: null, error: { message: '잘못된 티어 정보입니다.' } }
  }

  try {
    const pendingCountResponse = await supabaseAdmin
      .from('reservation_schedules')
      .select('id', { count: 'exact', head: true })
      .eq('region_code', input.regionCode)
      .is('executed_at', null)

    if (pendingCountResponse.error) {
      return { data: null, error: pendingCountResponse.error }
    }

    if ((pendingCountResponse.count ?? 0) >= MAX_PENDING_SCHEDULES_PER_REGION) {
      return {
        data: null,
        error: { message: `대기 중인 스케줄은 지역당 최대 ${MAX_PENDING_SCHEDULES_PER_REGION}개까지 등록할 수 있습니다.` },
      }
    }

    const { data, error } = await supabaseAdmin
      .from('reservation_schedules')
      .insert([{
        region_code: input.regionCode,
        year_month: normalizedYearMonth,
        tier_id: input.tierId,
        action: input.action,
        scheduled_at: scheduledAtIso,
        created_by: input.adminId,
      }])
      .select()

    return { data, error }
  } catch (error) {
    return {
      data: null,
      error: { message: getErrorMessage(error, '예약 스케줄 등록 중 오류가 발생했습니다.') },
    }
  }
}

export async function deleteReservationSchedule(scheduleId: number, regionCode: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('reservation_schedules')
      .delete()
      .eq('id', scheduleId)
      .eq('region_code', regionCode)
      .is('executed_at', null)
      .select('id')

    if (error) {
      return { data: null, error }
    }

    if (!data || data.length === 0) {
      return { data: null, error: { message: '이미 실행되었거나 존재하지 않는 스케줄입니다.' } }
    }

    return { data, error: null }
  } catch (error) {
    return {
      data: null,
      error: { message: getErrorMessage(error, '예약 스케줄 삭제 중 오류가 발생했습니다.') },
    }
  }
}

// 기한이 지난 스케줄을 실행한다. 어떤 경우에도 예외를 던지지 않아 호출한 API의 기존 동작을 깨지 않는다.
export async function processDueReservationSchedules(options?: { force?: boolean }): Promise<void> {
  try {
    const now = Date.now()
    if (!options?.force && now - lastSweepStartedAt < SWEEP_THROTTLE_MS) {
      return
    }

    if (sweepInFlight) {
      await sweepInFlight
      return
    }

    lastSweepStartedAt = now
    sweepInFlight = sweepDueSchedules().finally(() => {
      sweepInFlight = null
    })
    await sweepInFlight
  } catch (error) {
    console.error('예약 스케줄 처리 오류:', error)
  }
}

async function sweepDueSchedules(): Promise<void> {
  const { data: dueSchedules, error } = await supabaseAdmin
    .from('reservation_schedules')
    .select('*')
    .is('executed_at', null)
    .lte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(MAX_DUE_SCHEDULES_PER_SWEEP)

  if (error) {
    console.error('예약 스케줄 조회 오류:', error)
    return
  }

  if (!dueSchedules || dueSchedules.length === 0) {
    return
  }

  for (const schedule of dueSchedules) {
    await executeScheduleWithClaim(schedule)
  }
}

async function executeScheduleWithClaim(schedule: ReservationSchedule): Promise<void> {
  // 원자적 클레임: 동시에 여러 인스턴스가 같은 스케줄을 집어가지 못하게 한다
  const claimResponse = await supabaseAdmin
    .from('reservation_schedules')
    .update({ executed_at: new Date().toISOString(), execution_result: 'processing' })
    .eq('id', schedule.id)
    .is('executed_at', null)
    .select('id')

  if (claimResponse.error || !claimResponse.data || claimResponse.data.length === 0) {
    return
  }

  try {
    const failures = await applySchedule(schedule)
    const result = failures.length === 0
      ? 'success'
      : `error: ${failures.join(' / ')}`

    await supabaseAdmin
      .from('reservation_schedules')
      .update({ execution_result: result })
      .eq('id', schedule.id)

    console.info('[reservation-schedule]', JSON.stringify({
      id: schedule.id,
      region: schedule.region_code,
      yearMonth: schedule.year_month,
      tierId: schedule.tier_id,
      action: schedule.action,
      result,
    }))
  } catch (error) {
    // 전체 실패 시 클레임을 해제해 다음 스윕에서 재시도한다
    const message = getErrorMessage(error, '알 수 없는 오류')
    console.error('예약 스케줄 실행 오류:', schedule.id, message)
    await supabaseAdmin
      .from('reservation_schedules')
      .update({ executed_at: null, execution_result: `retry: ${message}` })
      .eq('id', schedule.id)
  }
}

// 티어별/전체 스케줄을 기존 수동 제어와 동일한 함수로 적용. 실패한 티어 목록을 반환한다.
async function applySchedule(schedule: ReservationSchedule): Promise<string[]> {
  const isOpen: boolean = (schedule.action as ReservationScheduleAction) === 'open'

  let tierIds: number[]
  if (schedule.tier_id) {
    tierIds = [schedule.tier_id]
  } else {
    const tiersResult = await getActiveTiersOnServer()
    if (tiersResult.error || !tiersResult.data || tiersResult.data.length === 0) {
      throw new Error(tiersResult.error?.message || '티어 목록을 불러오지 못했습니다.')
    }
    tierIds = tiersResult.data.map((tier) => tier.id)
  }

  const failures: string[] = []
  for (const tierId of tierIds) {
    const result = await updateTierReservationStatusOnServer(
      schedule.region_code,
      schedule.year_month,
      tierId,
      isOpen,
      schedule.created_by || 'schedule'
    )

    if (result.error) {
      failures.push(`tier ${tierId}: ${result.error.message}`)
    }
  }

  if (failures.length === tierIds.length) {
    throw new Error(failures.join(' / '))
  }

  return failures
}
