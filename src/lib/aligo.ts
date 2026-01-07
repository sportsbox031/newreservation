// 알리고 알림톡 API 유틸리티 함수
// Fly.io 프록시 서버를 통해 알리고 API 호출

// 알리고 API 호출 함수 (Fly.io 프록시 서버 사용)
export async function sendAligoKakaoTalk(params: {
  tplCode: string
  receiver: string
  subject: string
  message: string
  failover?: boolean
}): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    // Fly.io 프록시 서버로 요청 전송
    const response = await fetch('https://sportsbox-aligo-proxy.fly.dev/proxy/aligo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tplCode: params.tplCode,
        receiver: params.receiver,
        subject: params.subject,
        message: params.message,
        failover: params.failover !== false
      })
    })

    const result = await response.json()

    // 응답 처리
    if (result.success) {
      return {
        success: true,
        message: result.message || '알림톡이 성공적으로 발송되었습니다.'
      }
    } else {
      console.error('알리고 프록시 오류:', result)
      return {
        success: false,
        error: result.error || '알림톡 발송에 실패했습니다.'
      }
    }
  } catch (error) {
    console.error('알림톡 발송 예외:', error)
    return {
      success: false,
      error: '알림톡 발송 중 오류가 발생했습니다.'
    }
  }
}

// 회원가입 승인 알림톡
export async function sendMemberApprovalNotification(
  phone: string,
  organizationName: string,
  tplCode: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const subject = '[경기도체육회 스포츠박스] 회원가입 완료 안내'

  const message = `[경기도체육회 스포츠박스]
회원가입 완료 안내

안녕하세요, #{단체명} 담당자님.
스포츠박스 회원가입이 정상적으로 완료되었습니다.

유의사항
- 사이트 내 공지사항을 반드시 확인하여 주시기 바랍니다.
- 담당자가 변경될 경우 계정관리에서 반드시 변경하여 주시기 바랍니다.

문의사항은
남부지역 031-250-0474~7
북부지역 031-872-6520~4으로 연락 바랍니다.`.replace(/#{단체명}/g, organizationName)

  return sendAligoKakaoTalk({
    tplCode,
    receiver: phone,
    subject,
    message,
    failover: true
  })
}

// 예약 승인 알림톡
export async function sendReservationApprovalNotification(
  phone: string,
  organizationName: string,
  reservationDate: string,
  timeSlot: string,
  tplCode: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const subject = '[경기도체육회 스포츠박스] 예약 완료 안내'

  const message = `[경기도체육회 스포츠박스] 예약 완료 안내

안녕하세요, #{단체명} 담당자님.
스포츠박스 프로그램 예약이 승인되었습니다.

■ 예약 상세 정보
- 단체명: #{단체명}
- 예약일자: #{예약일자}
- 이용시간: #{이용시간}

■ 유의사항
- 본 사업은 무료로 진행되는 공익 사업입니다.
- 예약 취소나 변경은 이용 3일 전까지 사이트를 통해 진행해 주세요.

문의사항은
남부지역 031-250-0474~7
북부지역 031-872-6520~4으로 연락 바랍니다.`
    .replace(/#{단체명}/g, organizationName)
    .replace(/#{예약일자}/g, reservationDate)
    .replace(/#{이용시간}/g, timeSlot)

  return sendAligoKakaoTalk({
    tplCode,
    receiver: phone,
    subject,
    message,
    failover: true
  })
}
