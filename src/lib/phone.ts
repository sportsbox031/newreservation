// 전화번호 표시/저장 형식 통일 유틸
// - 화면 표시와 저장을 모두 하이픈 형식(000-0000-0000)으로 일관되게 맞춘다.
// - 순수 함수만 두고(부수효과 없음), UI/서버/마이그레이션에서 공용으로 사용한다.

// 숫자만 추출 (tel: 링크 href 등에 사용)
export function phoneDigits(raw: string | null | undefined): string {
  return (raw ?? '').replace(/\D/g, '')
}

// 하이픈 형식으로 변환
// - 11자리: 3-4-4 (예: 010-1234-5678)
// - 10자리: 3-3-4 (예: 010-123-4567)
// - 그 외 길이: 임의로 변형하지 않고 원본(trim)을 그대로 반환
export function formatPhoneNumber(raw: string | null | undefined): string {
  const digits = phoneDigits(raw)
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  return (raw ?? '').trim()
}
