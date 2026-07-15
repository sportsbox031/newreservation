'use client'

import { ReactNode, useEffect } from 'react'

// 모달 배경 오버레이 공통 클래스 (단일 소스)
// padding만 페이지별로 다르게 지정할 수 있다.
export const modalOverlayClass = (padding: string = 'p-4') =>
  `fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center ${padding} z-50`

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
  // ESC 키로 닫기
  useEffect(() => {
    if (!onClose) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
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
