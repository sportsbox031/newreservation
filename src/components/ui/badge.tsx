import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// shadcn 패턴 Badge. 전역 CSS 변수 테마를 쓰지 않고 기존 앱의 파랑/그레이 팔레트에 맞춘다.
const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition-colors',
  {
    variants: {
      variant: {
        neutral: 'border-gray-200 bg-gray-100 text-gray-700',
        blue: 'border-blue-200 bg-blue-50 text-blue-700',
        green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        red: 'border-red-200 bg-red-50 text-red-700',
        amber: 'border-amber-200 bg-amber-50 text-amber-700',
      },
    },
    defaultVariants: { variant: 'neutral' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { badgeVariants }
