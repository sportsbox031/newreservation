import { ReactNode } from 'react'

// 모달 배경 오버레이 공통 클래스 (단일 소스)
// padding만 페이지별로 다르게 지정할 수 있다.
export const modalOverlayClass = (padding: string = 'p-4') =>
  `fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center ${padding} z-50`

// 새 모달을 만들 때 사용할 수 있는 래퍼 컴포넌트
export default function ModalOverlay({
  children,
  padding = 'p-4'
}: {
  children: ReactNode
  padding?: string
}) {
  return <div className={modalOverlayClass(padding)}>{children}</div>
}
