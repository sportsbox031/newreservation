'use client'

import { ReactNode, useEffect } from 'react'

// 모달 배경 오버레이 공통 클래스 (단일 소스)
// padding만 페이지별로 다르게 지정할 수 있다.
export const modalOverlayClass = (padding: string = 'p-4') =>
  `fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center ${padding} z-50`

// 열려 있는 ESC-닫기 오버레이 스택 (마지막 = 최상위).
// 모달이 중첩됐을 때 ESC 한 번에 전부 닫히지 않고 최상위 하나만 닫히도록 한다.
const escStack: object[] = []

/**
 * 모달 공통 래퍼.
 * - onClose를 넘기면 ESC 키로 닫힌다.
 * - closeOnBackdrop(기본 true)이면 배경 클릭으로도 닫힌다.
 *   (입력 폼 모달은 실수로 내용을 잃지 않도록 false 권장)
 * - 모달이 떠 있는 동안 배경 스크롤을 잠근다.
 */
export default function ModalOverlay({
  children,
  padding = 'p-4',
  onClose,
  closeOnBackdrop = true
}: {
  children: ReactNode
  padding?: string
  onClose?: () => void
  closeOnBackdrop?: boolean
}) {
  // ESC 키로 닫기 — 중첩 모달에서는 최상위(스택 마지막) 오버레이만 닫는다.
  useEffect(() => {
    if (!onClose) return
    const token = {} // 이 마운트 고유 식별자
    escStack.push(token)
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && escStack[escStack.length - 1] === token) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      const i = escStack.lastIndexOf(token)
      if (i >= 0) escStack.splice(i, 1)
    }
  }, [onClose])

  // 모달이 떠 있는 동안 배경 스크롤 잠금
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  return (
    <div
      className={modalOverlayClass(padding)}
      onMouseDown={
        closeOnBackdrop && onClose
          ? (event) => {
              // 배경(오버레이 자체)을 눌렀을 때만 닫기 — 모달 내용 클릭/드래그는 무시
              if (event.target === event.currentTarget) {
                onClose()
              }
            }
          : undefined
      }
    >
      {children}
    </div>
  )
}
