import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeStyles = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-micro font-medium tracking-wider whitespace-nowrap',
  {
    variants: {
      tone: {
        neutral: 'border-midnight-line bg-midnight-deepest/60 text-whitex-muted',
        info:    'border-info/30 bg-info/10 text-info',
        success: 'border-success/30 bg-success/10 text-success',
        warning: 'border-warning/30 bg-warning/10 text-warning',
        danger:  'border-danger/30 bg-danger/10 text-danger',
        glow:    'border-glow/30 bg-glow/10 text-glow',
        gold:    'border-champion-from/40 bg-champion-from/10 text-champion-from',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeStyles> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeStyles({ tone, className }))} {...props} />
}
