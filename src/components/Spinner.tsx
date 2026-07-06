// 공통 로딩 스피너
// size: sm(버튼 안 표시용) | md(페이지/모달 로딩용)
// color: 배경에 따라 선택

const SIZE_CLASSES = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-4'
} as const

const COLOR_CLASSES = {
  white: 'border-white',
  blue: 'border-blue-600',
  orange: 'border-orange-600',
  red: 'border-red-600'
} as const

export default function Spinner({
  size = 'md',
  color = 'blue',
  className = ''
}: {
  size?: keyof typeof SIZE_CLASSES
  color?: keyof typeof COLOR_CLASSES
  className?: string
}) {
  return (
    <div
      className={`${SIZE_CLASSES[size]} ${COLOR_CLASSES[color]} border-t-transparent rounded-full animate-spin ${className}`.trim()}
    />
  )
}
