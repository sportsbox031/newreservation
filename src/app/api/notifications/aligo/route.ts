import { NextRequest, NextResponse } from 'next/server'
import { sendMemberApprovalNotification, sendReservationApprovalNotification } from '@/lib/aligo'
import { validateApiRequest, isAdmin } from '@/lib/auth'

// 회원 승인 알림톡 요청 타입
interface MemberApprovalRequest {
  type: 'member_approval'
  phone: string
  organizationName: string
  tplCode: string
}

// 예약 승인 알림톡 요청 타입
interface ReservationApprovalRequest {
  type: 'reservation_approval'
  phone: string
  organizationName: string
  reservationDate: string
  timeSlot: string
  tplCode: string
}

type NotificationRequest = MemberApprovalRequest | ReservationApprovalRequest

export async function POST(request: NextRequest) {
  try {
    // 인증 검증
    const authResult = await validateApiRequest(request)
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 401 })
    }

    // 관리자 권한 검증 (알림톡은 관리자만 발송 가능)
    if (!isAdmin(authResult.user)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    // Vercel의 실제 아웃바운드 IP 확인을 위한 로깅
    console.log('🔍 Request Headers:', {
      'x-forwarded-for': request.headers.get('x-forwarded-for'),
      'x-real-ip': request.headers.get('x-real-ip'),
      'x-vercel-forwarded-for': request.headers.get('x-vercel-forwarded-for'),
    })

    const body: NotificationRequest = await request.json()

    // 요청 타입 검증
    if (!body.type) {
      return NextResponse.json(
        { success: false, error: '알림 타입이 지정되지 않았습니다.' },
        { status: 400 }
      )
    }

    // 공통 필드 검증
    if (!body.phone || !body.organizationName || !body.tplCode) {
      return NextResponse.json(
        { success: false, error: '필수 정보가 누락되었습니다.' },
        { status: 400 }
      )
    }

    let result: { success: boolean; message?: string; error?: string }

    // 타입에 따라 적절한 알림톡 발송 함수 호출
    switch (body.type) {
      case 'member_approval':
        result = await sendMemberApprovalNotification(
          body.phone,
          body.organizationName,
          body.tplCode
        )
        break

      case 'reservation_approval':
        // 예약 승인의 경우 추가 필드 검증
        if (!body.reservationDate || !body.timeSlot) {
          return NextResponse.json(
            { success: false, error: '예약 정보가 누락되었습니다.' },
            { status: 400 }
          )
        }

        result = await sendReservationApprovalNotification(
          body.phone,
          body.organizationName,
          body.reservationDate,
          body.timeSlot,
          body.tplCode
        )
        break

      default:
        return NextResponse.json(
          { success: false, error: '지원하지 않는 알림 타입입니다.' },
          { status: 400 }
        )
    }

    // 알림톡 발송 결과 반환
    if (result.success) {
      return NextResponse.json(
        { success: true, message: result.message },
        { status: 200 }
      )
    } else {
      // 알림톡 발송 실패는 400 에러가 아닌 200으로 반환
      // (승인 프로세스는 성공했지만 알림만 실패한 경우)
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 200 }
      )
    }
  } catch (error) {
    console.error('알림톡 API 처리 중 오류:', error)
    return NextResponse.json(
      { success: false, error: '알림톡 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
