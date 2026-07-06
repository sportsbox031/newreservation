// 공통 날짜 포맷 유틸 (ko-KR)

// 날짜만 표시 (YYYY. MM. DD.) — null이면 '-'
export function formatDateKR(dateString: string | null): string {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

// 날짜+시간 표시 (한국시간 기준) — null이면 '-'
export function formatDateTimeKST(dateString: string | null): string {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Seoul'
  })
}

// 월/일 + 시간 표시 (연도 생략, 대시보드 최근 활동용)
export function formatShortDateTimeKR(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
