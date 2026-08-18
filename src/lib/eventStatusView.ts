// 이벤트 신청 상태의 표시 라벨 + 배지 색상 변형을 한곳에서 관리한다.
// (내 신청내역 모달과 관리자 신청관리 페이지가 동일한 색·라벨을 쓰도록)

export type EventStatusView = {
  label: string
  variant: 'neutral' | 'blue' | 'green' | 'red' | 'amber'
}

const MAP: Record<string, EventStatusView> = {
  applied: { label: '신청', variant: 'blue' },
  selected: { label: '선정', variant: 'green' },
  rejected: { label: '탈락', variant: 'red' },
  cancelled: { label: '취소', variant: 'neutral' },
}

export function eventStatusView(status: string): EventStatusView {
  return MAP[status] ?? { label: status, variant: 'neutral' }
}
