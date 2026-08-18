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
  // 프록시가 느리거나 멈춰도 호출부(신청/취소/선정 등) 응답이 무한정 지연되지 않도록 타임아웃을 건다.
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 8000)
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
      }),
      signal: controller.signal
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
  } finally {
    clearTimeout(timeoutId)
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

// 신규 회원가입 신청 시 지역 관리자에게 보내는 알림톡
export async function sendNewMemberAdminNotification(
  phone: string,
  organizationName: string,
  tplCode: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const subject = '[경기도체육회 스포츠박스] 신규 회원가입 신청 안내'

  const message = `[경기도체육회 스포츠박스]
신규 회원가입 신청 안내

#{단체명}이 회원가입 신청을 했습니다. 확인 후 승인바랍니다.`.replace(/#{단체명}/g, organizationName)

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

// 회원가입 반려 알림톡
export async function sendMemberRejectionNotification(
  phone: string,
  organizationName: string,
  tplCode: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const subject = '[경기도체육회 스포츠박스] 회원가입 반려 안내'

  const message = `[경기도체육회 스포츠박스]
회원가입 반려 안내
안녕하세요, #{단체명} 담당자님.


스포츠박스 회원가입 신청이 반려되었음을 안내드립니다.

사이트 내 공지사항의 [회원가입 안내] 게시글을 반드시 확인해 주시기 바랍니다.

공지사항에 명시된 기준을 보완하여 다시 회원가입을 진행해 주시기 바랍니다.

[유의사항]
담당자가 변경될 경우 계정관리에서 반드시 정보를 수정해 주시기 바랍니다.

[문의사항]
남부지역: 031-250-0474~7
북부지역: 031-872-6520~4`
    .replace(/#{단체명}/g, organizationName)

  return sendAligoKakaoTalk({
    tplCode,
    receiver: phone,
    subject,
    message,
    failover: true
  })
}

// 예약 반려 알림톡
export async function sendReservationRejectionNotification(
  phone: string,
  organizationName: string,
  reservationDate: string,
  tplCode: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const subject = '[경기도체육회 스포츠박스] 예약 반려 안내'

  const message = `[경기도체육회 스포츠박스]
예약 반려 안내
안녕하세요, #{단체명} 담당자님.
신청하신 스포츠박스 프로그램 예약이 반려되었습니다.

예약 정보
단체명: #{단체명}
신청일자: #{예약일자}

사이트 내 공지사항의 [예약 관련 안내] 게시글을 반드시 확인하여 주시기 바랍니다.

공지사항에 명시된 기준에 따라 내용을 보완하여 다시 신청해 주시기 바랍니다.

본 사업은 무료로 진행되는 공익 사업으로, 원활한 운영을 위해 협조 부탁드립니다.

문의사항은 남부지역 031-250-0474~7 북부지역 031-872-6520~4으로 연락 바랍니다.`
    .replace(/#{단체명}/g, organizationName)
    .replace(/#{예약일자}/g, reservationDate)

  return sendAligoKakaoTalk({
    tplCode,
    receiver: phone,
    subject,
    message,
    failover: true
  })
}

// 경고 부여 알림톡
export async function sendPenaltyWarningNotification(
  phone: string,
  organizationName: string,
  reason: string,
  tplCode: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const subject = '[경기도체육회 스포츠박스] 경고 안내'

  const message = `[경기도체육회 스포츠박스]
경고 안내

안녕하세요, #{단체명} 담당자님.
#{사유}(으)로 인하여 경고 1회가 부여되었음을 안내드립니다.

경고는 해당 연도 말까지 유지되며, 경고 2회 누적 시 퇴장 조치되어 프로그램 신청이 제한됩니다.

문의사항은
남부지역 031-250-0474~7
북부지역 031-872-6520~4으로 연락 바랍니다.`
    .replace(/#{단체명}/g, organizationName)
    .replace(/#{사유}/g, reason)

  return sendAligoKakaoTalk({
    tplCode,
    receiver: phone,
    subject,
    message,
    failover: true
  })
}

// 퇴장(신청 제한) 안내 알림톡
export async function sendPenaltyEjectionNotification(
  phone: string,
  organizationName: string,
  reason: string,
  restrictedMonthLabel: string,
  resumeMonthLabel: string,
  tplCode: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const subject = '[경기도체육회 스포츠박스] 퇴장(이용 제한) 안내'

  const message = `[경기도체육회 스포츠박스]
퇴장(이용 제한) 안내

안녕하세요, #{단체명} 담당자님.
#{사유}(으)로 인하여 퇴장 조치되었음을 안내드립니다.

#{제한월} 프로그램 신청이 제한되며, #{재개월}부터 신청이 가능합니다.

문의사항은
남부지역 031-250-0474~7
북부지역 031-872-6520~4으로 연락 바랍니다.`
    .replace(/#{단체명}/g, organizationName)
    .replace(/#{사유}/g, reason)
    .replace(/#{제한월}/g, restrictedMonthLabel)
    .replace(/#{재개월}/g, resumeMonthLabel)

  return sendAligoKakaoTalk({
    tplCode,
    receiver: phone,
    subject,
    message,
    failover: true
  })
}

// 프로그램 이용 당일 안내 알림톡
export async function sendProgramDayNotification(
  phone: string,
  organizationName: string,
  timeSlot: string,
  tplCode: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const subject = '[경기도체육회 스포츠박스] 프로그램 이용 당일 안내'

  const message = `[경기도체육회 스포츠박스]
프로그램 이용 당일 안내
안녕하세요, #{단체명} 담당자님.
오늘은 스포츠박스 프로그램 이용 예정일입니다. 즐겁고 안전한 활동이 되시길 바랍니다.

■ 예약 확인 정보
단체명: #{단체명}
이용시간: #{이용시간}

■ 협조 및 유의사항
신청하신 장소가 변경되었을 경우 반드시 연락주시기 바랍니다.

현장 상황 및 기상 변화에 따라 프로그램 내용이 일부 조정될 수 있습니다.

문의사항은 남부지역 031-250-0474~7 북부지역 031-872-6520~4으로 연락 바랍니다.`
    .replace(/#{단체명}/g, organizationName)
    .replace(/#{이용시간}/g, timeSlot)

  return sendAligoKakaoTalk({
    tplCode,
    receiver: phone,
    subject,
    message,
    failover: true
  })
}

// ─────────────────────────────────────────────────────────────
// 스포츠이벤트 알림톡 (신청/취소/선정/선정결과)
// 카카오 승인 템플릿(tplCode)이 필요하며, 미승인/실패 시 failover로 SMS 대체 발송된다.
// ─────────────────────────────────────────────────────────────

// 이벤트 신청 완료 — 서류 제출 안내 포함
export async function sendEventApplicationNotification(
  phone: string,
  organizationName: string,
  eventTitle: string,
  eventDate: string,
  tplCode: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const subject = '[경기도체육회 스포츠박스] 이벤트 신청 완료 안내'

  const message = `[경기도체육회 스포츠박스] 이벤트 신청 완료 안내

안녕하세요, #{단체명} 담당자님.
'#{이벤트명}' 이벤트 신청이 정상적으로 접수되었습니다.
- 신청 일정: #{일정}

제출할 서류가 있다면 홈페이지 로그인 후 '내 신청내역'에서 서류를 제출해 주세요.
선정 결과는 확정되는 대로 다시 안내드리겠습니다.

문의사항은
남부지역 031-250-0474~7
북부지역 031-872-6520~4으로 연락 바랍니다.`
    .replace(/#{단체명}/g, organizationName)
    .replace(/#{이벤트명}/g, eventTitle)
    .replace(/#{일정}/g, eventDate)

  return sendAligoKakaoTalk({ tplCode, receiver: phone, subject, message, failover: true })
}

// 이벤트 신청 취소
export async function sendEventCancellationNotification(
  phone: string,
  organizationName: string,
  eventTitle: string,
  tplCode: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const subject = '[경기도체육회 스포츠박스] 이벤트 신청 취소 안내'

  const message = `[경기도체육회 스포츠박스] 이벤트 신청 취소 안내

안녕하세요, #{단체명} 담당자님.
'#{이벤트명}' 이벤트 신청이 취소되었습니다.
다시 신청을 원하시면 홈페이지에서 진행해 주세요.

문의사항은
남부지역 031-250-0474~7
북부지역 031-872-6520~4으로 연락 바랍니다.`
    .replace(/#{단체명}/g, organizationName)
    .replace(/#{이벤트명}/g, eventTitle)

  return sendAligoKakaoTalk({ tplCode, receiver: phone, subject, message, failover: true })
}

// 이벤트 선정
export async function sendEventSelectionNotification(
  phone: string,
  organizationName: string,
  eventTitle: string,
  tplCode: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const subject = '[경기도체육회 스포츠박스] 이벤트 선정 안내'

  const message = `[경기도체육회 스포츠박스] 이벤트 선정 안내

축하합니다, #{단체명} 담당자님!
'#{이벤트명}' 이벤트에 선정되셨습니다.

아직 제출하지 않은 서류가 있다면 홈페이지 '내 신청내역'에서 제출해 주세요.
자세한 진행 사항은 별도로 안내드리겠습니다.

문의사항은
남부지역 031-250-0474~7
북부지역 031-872-6520~4으로 연락 바랍니다.`
    .replace(/#{단체명}/g, organizationName)
    .replace(/#{이벤트명}/g, eventTitle)

  return sendAligoKakaoTalk({ tplCode, receiver: phone, subject, message, failover: true })
}

// 이벤트 선정 결과(미선정) — '탈락' 대신 온화한 표현 사용
export async function sendEventRejectionNotification(
  phone: string,
  organizationName: string,
  eventTitle: string,
  tplCode: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const subject = '[경기도체육회 스포츠박스] 이벤트 선정 결과 안내'

  const message = `[경기도체육회 스포츠박스] 이벤트 선정 결과 안내

안녕하세요, #{단체명} 담당자님.
'#{이벤트명}' 이벤트에 관심을 가지고 신청해 주셔서 진심으로 감사합니다.

아쉽게도 이번에는 함께하지 못하게 되었지만, 보내주신 관심에 깊이 감사드립니다.
앞으로도 더 좋은 프로그램으로 자주 찾아뵙겠습니다. 다음 기회에 꼭 함께할 수 있기를 바랍니다.

문의사항은
남부지역 031-250-0474~7
북부지역 031-872-6520~4으로 연락 바랍니다.`
    .replace(/#{단체명}/g, organizationName)
    .replace(/#{이벤트명}/g, eventTitle)

  return sendAligoKakaoTalk({ tplCode, receiver: phone, subject, message, failover: true })
}
