import { NextRequest, NextResponse } from 'next/server'
import { reservationAPI } from '@/lib/supabase'
import { sendProgramDayNotification } from '@/lib/aligo'

// Vercel Cron Job으로 매일 오전 9시에 호출됨
export async function GET(request: NextRequest) {
  try {
    // Cron Secret 검증 (보안)
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔔 당일 알림톡 자동 발송 시작:', new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }))

    // 오늘 날짜 (한국 시간 기준)
    const today = new Date()
    const koreaToday = new Date(today.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
    const todayString = koreaToday.toISOString().split('T')[0]

    console.log('📅 오늘 날짜:', todayString)

    // 오늘 예약된 승인 완료 상태의 예약 조회
    const { data: reservations, error } = await reservationAPI.getReservationsByDate(todayString)

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
        message: '오늘 예약이 없습니다.',
        count: 0
      })
    }

    // 승인된 예약만 필터링
    const approvedReservations = reservations.filter(r => r.status === 'approved')

    console.log(`📋 총 ${approvedReservations.length}개의 승인된 예약 발견`)

    let successCount = 0
    let failCount = 0

    // 각 예약에 대해 알림톡 발송
    for (const reservation of approvedReservations) {
      try {
        // 시간대 포맷팅
        const timeSlot = reservation.slots && reservation.slots.length > 0
          ? `${reservation.slots[0].startTime} - ${reservation.slots[reservation.slots.length - 1].endTime}`
          : '시간 정보 없음'

        console.log(`📤 알림톡 발송 중: ${reservation.organization_name} (${timeSlot})`)

        // 알림톡 발송
        const result = await sendProgramDayNotification(
          reservation.phone,
          reservation.organization_name,
          timeSlot,
          process.env.NEXT_PUBLIC_ALIGO_PROGRAM_DAY_TPL_CODE || ''
        )

        if (result.success) {
          successCount++
          console.log(`✅ 발송 성공: ${reservation.organization_name}`)
        } else {
          failCount++
          console.error(`❌ 발송 실패: ${reservation.organization_name}`, result.error)
        }

        // API Rate Limiting 방지를 위해 약간의 딜레이
        await new Promise(resolve => setTimeout(resolve, 500))

      } catch (error) {
        failCount++
        console.error(`❌ 알림톡 발송 예외: ${reservation.organization_name}`, error)
      }
    }

    console.log(`✨ 당일 알림톡 발송 완료: 성공 ${successCount}건, 실패 ${failCount}건`)

    return NextResponse.json({
      success: true,
      message: '당일 알림톡 발송 완료',
      total: approvedReservations.length,
      successCount,
      failCount,
      date: todayString
    })

  } catch (error) {
    console.error('당일 알림톡 자동 발송 오류:', error)
    return NextResponse.json({
      success: false,
      error: '당일 알림톡 발송 중 오류 발생',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
