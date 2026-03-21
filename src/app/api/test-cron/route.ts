import { NextRequest, NextResponse } from 'next/server'
import { sendProgramDayNotification } from '@/lib/aligo'
import { getReservationsByDateOnServer } from '@/lib/reservationSettingsServer'

// 수동 테스트용 엔드포인트
export async function GET(request: NextRequest) {
  try {
    const secret = request.nextUrl.searchParams.get('secret')

    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
    }

    console.log('🧪 수동 테스트 시작:', new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }))

    // 오늘 날짜 (한국 시간 기준)
    const today = new Date()
    const koreaToday = new Date(today.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
    const todayString = koreaToday.toISOString().split('T')[0]

    console.log('📅 테스트 날짜:', todayString)

    // 오늘 예약된 승인 완료 상태의 예약 조회 (모든 지역)
    const { data: reservations, error } = await getReservationsByDateOnServer('', todayString)

    if (error) {
      console.error('예약 조회 오류:', error)
      return NextResponse.json({
        success: false,
        error: '예약 조회 실패',
        details: error
      }, { status: 500 })
    }

    if (!reservations || reservations.length === 0) {
      console.log('📭 오늘 예약이 없습니다.')
      return NextResponse.json({
        success: true,
        message: '오늘 예약이 없습니다. (정상 작동)',
        count: 0,
        date: todayString,
        testMode: true
      })
    }

    // 승인된 예약만 필터링
    const approvedReservations = reservations.filter(r => r.status === 'approved')

    console.log(`📋 총 ${approvedReservations.length}개의 승인된 예약 발견`)
    console.log('📋 예약 데이터 구조:', JSON.stringify(approvedReservations[0], null, 2))

    let successCount = 0
    let failCount = 0
    const results = []

    // 각 예약에 대해 알림톡 발송
    for (const reservation of approvedReservations) {
      try {
        // 데이터 추출
        const organizationName = reservation.users?.organization_name || '단체명 없음'
        const phone = reservation.users?.phone || ''
        const slots = reservation.reservation_slots || []

        // 시간대 포맷팅
        const timeSlot = slots.length > 0
          ? `${slots[0].start_time} - ${slots[slots.length - 1].end_time}`
          : '시간 정보 없음'

        console.log(`📤 알림톡 발송 중: ${organizationName} (${timeSlot})`)

        // 알림톡 발송
        const result = await sendProgramDayNotification(
          phone,
          organizationName,
          timeSlot,
          process.env.NEXT_PUBLIC_ALIGO_PROGRAM_DAY_TPL_CODE || ''
        )

        if (result.success) {
          successCount++
          console.log(`✅ 발송 성공: ${organizationName}`)
          results.push({
            organization: organizationName,
            phone: phone,
            status: 'success'
          })
        } else {
          failCount++
          console.error(`❌ 발송 실패: ${organizationName}`, result.error)
          results.push({
            organization: organizationName,
            phone: phone,
            status: 'failed',
            error: result.error
          })
        }

        // API Rate Limiting 방지를 위해 약간의 딜레이
        await new Promise(resolve => setTimeout(resolve, 500))

      } catch (error) {
        failCount++
        const organizationName = reservation.users?.organization_name || '단체명 없음'
        const phone = reservation.users?.phone || ''
        console.error(`❌ 알림톡 발송 예외: ${organizationName}`, error)
        results.push({
          organization: organizationName,
          phone: phone,
          status: 'error',
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }

    console.log(`✨ 수동 테스트 완료: 성공 ${successCount}건, 실패 ${failCount}건`)

    return NextResponse.json({
      success: true,
      message: '수동 테스트 완료',
      total: approvedReservations.length,
      successCount,
      failCount,
      date: todayString,
      testMode: true,
      results
    })

  } catch (error) {
    console.error('수동 테스트 오류:', error)
    return NextResponse.json({
      success: false,
      error: '테스트 중 오류 발생',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
