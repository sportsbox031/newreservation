// 담당자 지정된 예약 → 지역별 구글캘린더 동기화
//
// 동작: 해당 월에서 담당자가 1명 이상 배정된 예약(취소/거절 제외)을 대상으로
// - 처음 동기화되는 예약은 이벤트 생성
// - 이미 동기화된 예약은 이벤트 갱신 (캘린더에서 지워졌으면 재생성)
// - 배정이 해제되었거나 예약이 취소/삭제된 경우 이벤트 삭제
// 이벤트 ID는 reservation_calendar_events 테이블에 기록된다.

import { createHash } from 'node:crypto'

import { createClient } from '@supabase/supabase-js'

import { Database } from '@/types/database'
import { getErrorMessage } from '@/lib/requestUtils'
import { buildCalendarEvent } from '@/lib/calendarEvent'
import {
  deleteCalendarEvent,
  getCalendarIdForRegion,
  insertCalendarEvent,
  isCalendarSyncConfigured,
  updateCalendarEvent,
} from '@/lib/googleCalendar'
import { getAssignmentsForMonth } from '@/lib/staffServer'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
  },
})

// 이벤트 내용 해시: 내용이 같으면 구글 API 호출을 생략하기 위한 비교 키
function hashEventPayload(calendarId: string, event: object): string {
  return createHash('sha256').update(`${calendarId}|${JSON.stringify(event)}`).digest('hex')
}

export async function syncMonthAssignmentsToCalendar(input: {
  regionCode: string
  year: number
  month: number
}) {
  if (!Number.isInteger(input.year) || !Number.isInteger(input.month) || input.month < 1 || input.month > 12) {
    return { data: null, error: { message: '잘못된 연도 또는 월입니다.' } }
  }

  if (!isCalendarSyncConfigured(input.regionCode)) {
    const regionLabel = input.regionCode === 'north' ? '경기북부' : '경기남부'
    return {
      data: null,
      error: { message: `${regionLabel} 구글캘린더가 아직 연동되지 않았습니다. 환경 변수(GOOGLE_CALENDAR_ID_${input.regionCode.toUpperCase()} 등)를 설정해주세요.` },
    }
  }

  const calendarId = getCalendarIdForRegion(input.regionCode)!

  try {
    const regionId = input.regionCode === 'north' ? 2 : 1
    const startDate = `${input.year}-${String(input.month).padStart(2, '0')}-01`
    const lastDay = new Date(input.year, input.month, 0).getDate()
    const endDate = `${input.year}-${String(input.month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    // 해당 월의 유효한 예약 (단체명/슬롯 포함)
    const reservationsResponse = await supabaseAdmin
      .from('reservations')
      .select(`
        id,
        date,
        status,
        users!inner(organization_name),
        reservation_slots(start_time, end_time, grade, participant_count, location)
      `)
      .eq('region_id', regionId)
      .gte('date', startDate)
      .lte('date', endDate)
      .in('status', ['pending', 'approved', 'cancel_requested'])

    if (reservationsResponse.error) {
      return { data: null, error: reservationsResponse.error }
    }

    // 해당 월의 담당자 배정 (지역 필터 포함)
    const assignmentsResult = await getAssignmentsForMonth(input.regionCode, input.year, input.month)
    if (assignmentsResult.error || !assignmentsResult.data) {
      return { data: null, error: assignmentsResult.error }
    }

    const staffNamesByReservation = new Map<string, string[]>()
    for (const assignment of assignmentsResult.data) {
      const staffMember = Array.isArray(assignment.staff_members)
        ? assignment.staff_members[0]
        : assignment.staff_members
      if (!staffMember?.name) {
        continue
      }
      const names = staffNamesByReservation.get(assignment.reservation_id) ?? []
      names.push(staffMember.name)
      staffNamesByReservation.set(assignment.reservation_id, names)
    }

    // 동기화 대상: 담당자가 배정된 예약
    const targets = (reservationsResponse.data ?? [])
      .filter((reservation) => staffNamesByReservation.has(reservation.id))
      .map((reservation) => {
        const user = Array.isArray(reservation.users) ? reservation.users[0] : reservation.users
        return {
          id: reservation.id,
          date: reservation.date,
          organizationName: user?.organization_name || '단체명 없음',
          slots: (reservation.reservation_slots ?? []).map((slot) => ({
            startTime: (slot.start_time || '').substring(0, 5),
            endTime: (slot.end_time || '').substring(0, 5),
            grade: slot.grade || '',
            participantCount: slot.participant_count || 0,
            location: slot.location || '',
          })),
          staffNames: staffNamesByReservation.get(reservation.id) ?? [],
        }
      })

    // 기존 매핑 (이 지역/월)
    const mappingsResponse = await supabaseAdmin
      .from('reservation_calendar_events')
      .select('*')
      .eq('region_code', input.regionCode)
      .gte('date', startDate)
      .lte('date', endDate)

    if (mappingsResponse.error) {
      return { data: null, error: mappingsResponse.error }
    }

    const mappingByReservation = new Map(
      (mappingsResponse.data ?? []).map((mapping) => [mapping.reservation_id, mapping])
    )

    let created = 0
    let updated = 0
    let unchanged = 0
    let deleted = 0
    const failures: string[] = []

    // 대상 예약 생성/갱신 (내용이 바뀐 것만 구글 API 호출)
    for (const target of targets) {
      const event = buildCalendarEvent({
        organizationName: target.organizationName,
        date: target.date,
        slots: target.slots,
        staffNames: target.staffNames,
      })

      if (!event) {
        continue
      }

      const mapping = mappingByReservation.get(target.id)
      const payloadHash = hashEventPayload(calendarId, event)

      try {
        if (mapping) {
          // 내용과 대상 캘린더가 그대로면 구글 호출 생략
          if (mapping.payload_hash === payloadHash && mapping.calendar_id === calendarId) {
            unchanged += 1
            continue
          }

          const updateResult = mapping.calendar_id === calendarId
            ? await updateCalendarEvent(mapping.calendar_id, mapping.google_event_id, event)
            : 'not_found' as const

          if (updateResult === 'not_found') {
            // 캘린더에서 수동 삭제되었거나 캘린더 ID가 바뀐 경우 재생성
            const newEventId = await insertCalendarEvent(calendarId, event)
            await supabaseAdmin
              .from('reservation_calendar_events')
              .update({
                google_event_id: newEventId,
                calendar_id: calendarId,
                payload_hash: payloadHash,
                synced_at: new Date().toISOString(),
              })
              .eq('id', mapping.id)
            created += 1
          } else {
            await supabaseAdmin
              .from('reservation_calendar_events')
              .update({ payload_hash: payloadHash, synced_at: new Date().toISOString() })
              .eq('id', mapping.id)
            updated += 1
          }
        } else {
          const eventId = await insertCalendarEvent(calendarId, event)
          await supabaseAdmin
            .from('reservation_calendar_events')
            .insert([{
              reservation_id: target.id,
              region_code: input.regionCode,
              date: target.date,
              calendar_id: calendarId,
              google_event_id: eventId,
              payload_hash: payloadHash,
            }])
          created += 1
        }
      } catch (error) {
        failures.push(`${target.date} ${target.organizationName}: ${getErrorMessage(error, '알 수 없는 오류')}`)
      }
    }

    // 더 이상 대상이 아닌 매핑(배정 해제/예약 취소·삭제)은 이벤트 삭제
    const targetIds = new Set(targets.map((target) => target.id))
    for (const mapping of mappingsResponse.data ?? []) {
      if (targetIds.has(mapping.reservation_id)) {
        continue
      }

      try {
        await deleteCalendarEvent(mapping.calendar_id, mapping.google_event_id)
        await supabaseAdmin
          .from('reservation_calendar_events')
          .delete()
          .eq('id', mapping.id)
        deleted += 1
      } catch (error) {
        failures.push(`이벤트 삭제(${mapping.date}): ${getErrorMessage(error, '알 수 없는 오류')}`)
      }
    }

    return {
      data: {
        created,
        updated,
        unchanged,
        deleted,
        failed: failures.length,
        failures: failures.slice(0, 5),
        totalTargets: targets.length,
      },
      error: null,
    }
  } catch (error) {
    return {
      data: null,
      error: { message: getErrorMessage(error, '구글캘린더 동기화 중 오류가 발생했습니다.') },
    }
  }
}
