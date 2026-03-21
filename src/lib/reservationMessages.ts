export const RESERVATION_PROGRESS_MESSAGE = '예약신청을 처리하고 있습니다.'
export const RESERVATION_DELAYED_PROGRESS_MESSAGE = '신청이 몰려 처리중입니다. 잠시만 기다려주세요.'
export const RESERVATION_SUCCESS_MESSAGE = '예약신청이 완료되었습니다. 관리자의 승인을 기다려주세요.'
export const RESERVATION_COMPETITION_FAILURE_MESSAGE =
  '다른 사용자가 먼저 예약하여 해당 날짜는 마감되었습니다. 다른 날짜를 선택해주세요.'

const COMPETITION_FAILURE_PATTERNS = [
  '신청이 몰려 예약을 처리 중입니다',
  '예약이 마감되었습니다',
]

export function mapReservationErrorMessage(message: string | null | undefined): string {
  if (!message) {
    return '예약 신청 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
  }

  if (COMPETITION_FAILURE_PATTERNS.some(pattern => message.includes(pattern))) {
    return RESERVATION_COMPETITION_FAILURE_MESSAGE
  }

  return message
}
