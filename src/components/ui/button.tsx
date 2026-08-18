import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// shadcn 패턴 Button. 기존 앱의 파랑(primary)/그레이 룩에 맞춘 변형들.
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-blue-600 text-white hover:bg-blue-700',
        outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
        ghost: 'text-gray-700 hover:bg-gray-100',
        subtle: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
        danger: 'bg-red-600 text-white hover:bg-red-700',
        // 토글형(선택 상태 강조) — 관리자 선정/탈락 등
        successToggle: 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 data-[active=true]:bg-emerald-600 data-[active=true]:text-white data-[active=true]:border-emerald-600',
        dangerToggle: 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 data-[active=true]:bg-red-600 data-[active=true]:text-white data-[active=true]:border-red-600',
      },
      size: {
        sm: 'h-8 px-3',
        md: 'h-10 px-4',
        xs: 'h-7 px-2.5 text-xs',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
)
Button.displayName = 'Button'

export { buttonVariants }
