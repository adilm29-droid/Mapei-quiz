import * as React from 'react'
import { cn } from '@/lib/utils'

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          'flex h-11 w-full rounded-xl border border-midnight-line bg-midnight-deepest/60 px-4 py-2',
          'text-body text-whitex-soft placeholder:text-whitex-faint',
          'transition-colors backdrop-blur-md',
          'focus:border-info focus:outline-none focus:ring-2 focus:ring-info/30',
          'disabled:cursor-not-allowed disabled:opacity-60',
          'file:border-0 file:bg-transparent file:text-caption file:font-medium',
          className,
        )}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'
