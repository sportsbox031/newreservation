import { NextRequest, NextResponse } from 'next/server'
import {
  sendMemberApprovalNotification,
  sendReservationApprovalNotification,
  sendMemberRejectionNotification,
  sendReservationRejectionNotification,
  sendProgramDayNotification
} from '@/lib/aligo'
import { validateApiRequest, isAdmin } from '@/lib/auth'
import { getMemberContactPhoneOnServer } from '@/lib/memberAdminServer'
import { getReservationContactPhoneOnServer } from '@/lib/reservationSettingsServer'

// 회원 승인 알림톡 요청 타입
interface MemberApprovalRequest {
  type: 'member_approval'
  memberId: string
  organizationName: string
  tplCode: string
}

// 예약 승인 알림톡 요청 타입
interface ReservationApprovalRequest {
  type: 'reservation_approval'
  reservationId: string
  organizationName: string
  reservationDate: string
  timeSlot: string
  tplCode: string
}

// 회원 반려 알림톡 요청 타입
interface MemberRejectionRequest {
  type: 'member_rejection'
  memberId: string
  organizationName: string
  tplCode: string
}

// 예약 반려 알림톡 요청 타입
interface ReservationRejectionRequest {
  type: 'reservation_rejection'
  reservationId: string
  organizationName: string
  reservationDate: string
  tplCode: string
}

// 프로그램 이용 당일 안내 알림톡 요청 타입
interface ProgramDayRequest {
  type: 'program_day'
  phone: string
  organizationName: string
  timeSlot: string
  tplCode: string
}

type NotificationRequest =
  | MemberApprovalRequest
  | ReservationApprovalRequest
  | MemberRejectionRequest
  | ReservationRejectionRequest
  | ProgramDayRequest

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
    if (!body.organizationName || !body.tplCode) {
      return NextResponse.json(
        { success: false, error: '필수 정보가 누락되었습니다.' },
        { status: 400 }
      )
    }

    let result: { success: boolean; message?: string; error?: string }

    // 타입에 따라 적절한 알림톡 발송 함수 호출
    // 연락처는 클라이언트가 보낸 값이 아니라 DB에서 매번 새로 조회한다.
    // (관리자 화면이 오래 열려 있으면 사용자가 그 사이 변경한 연락처가 반영되지 않기 때문)
    switch (body.type) {
      case 'member_approval': {
        if (!body.memberId) {
          return NextResponse.json(
            { success: false, error: '회원 정보가 누락되었습니다.' },
            { status: 400 }
          )
        }

        const { phone, error: phoneError } = await getMemberContactPhoneOnServer(body.memberId)
        if (phoneError || !phone) {
          return NextResponse.json(
            { success: false, error: phoneError?.message || '회원 연락처를 찾을 수 없습니다.' },
            { status: 200 }
          )
        }

        result = await sendMemberApprovalNotification(
          phone,
          body.organizationName,
          body.tplCode
        )
        break
      }

      case 'reservation_approval': {
        // 예약 승인의 경우 추가 필드 검증
        if (!body.reservationId || !body.reservationDate || !body.timeSlot) {
          return NextResponse.json(
            { success: false, error: '예약 정보가 누락되었습니다.' },
            { status: 400 }
          )
        }

        const { phone, error: phoneError } = await getReservationContactPhoneOnServer(body.reservationId)
        if (phoneError || !phone) {
          return NextResponse.json(
            { success: false, error: phoneError?.message || '예약자 연락처를 찾을 수 없습니다.' },
            { status: 200 }
          )
        }

        result = await sendReservationApprovalNotification(
          phone,
          body.organizationName,
          body.reservationDate,
          body.timeSlot,
          body.tplCode
        )
        break
      }

      case 'member_rejection': {
        if (!body.memberId) {
          return NextResponse.json(
            { success: false, error: '회원 정보가 누락되었습니다.' },
            { status: 400 }
          )
        }

        const { phone, error: phoneError } = await getMemberContactPhoneOnServer(body.memberId)
        if (phoneError || !phone) {
          return NextResponse.json(
            { success: false, error: phoneError?.message || '회원 연락처를 찾을 수 없습니다.' },
            { status: 200 }
          )
        }

        result = await sendMemberRejectionNotification(
          phone,
          body.organizationName,
          body.tplCode
        )
        break
      }

      case 'reservation_rejection': {
        // 예약 반려의 경우 추가 필드 검증
        if (!body.reservationId || !body.reservationDate) {
          return NextResponse.json(
            { success: false, error: '예약 정보가 누락되었습니다.' },
            { status: 400 }
          )
        }

        const { phone, error: phoneError } = await getReservationContactPhoneOnServer(body.reservationId)
        if (phoneError || !phone) {
          return NextResponse.json(
            { success: false, error: phoneError?.message || '예약자 연락처를 찾을 수 없습니다.' },
            { status: 200 }
          )
        }

        result = await sendReservationRejectionNotification(
          phone,
          body.organizationName,
          body.reservationDate,
          body.tplCode
        )
        break
      }

      case 'program_day':
        // 프로그램 이용 당일 안내의 경우 추가 필드 검증
        if (!body.timeSlot) {
          return NextResponse.json(
            { success: false, error: '이용시간 정보가 누락되었습니다.' },
            { status: 400 }
          )
        }

        result = await sendProgramDayNotification(
          body.phone,
          body.organizationName,
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
