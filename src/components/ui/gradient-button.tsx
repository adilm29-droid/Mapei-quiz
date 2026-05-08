'use client'

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

/**
 * GradientButton — the "magic CTA" button per DESIGN_SYSTEM §1 / §6.
 *
 * Inner button is a solid midnight panel; the animated border + outer blur
 * halo come from CSS pseudo-elements driven by `data-grad="..."`. The CSS
 * lives in globals.css under the `.gbtn` ruleset (avoids styled-jsx so
 * Turbopack stays happy).
 *
 * Use for primary CTAs only — never as a default button. Utility buttons
 * should use the regular shadcn `<Button>` from ./button.
 */

const buttonStyles = cva(
  'gbtn relative inline-flex items-center justify-center gap-2.5 rounded-xl border-none bg-midnight-deepest text-white font-semibold tracking-wide transition-transform duration-150 ease-out cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:before:opacity-30 disabled:after:opacity-0 active:scale-[0.98]',
  {
    variants: {
      size: {
        sm: 'h-9 px-4 text-sm',
        md: 'h-11 px-6 text-[15px]',
        lg: 'h-14 px-8 text-base',
        xl: 'h-16 px-10 text-lg',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  },
)

export type GradientVariant =
  | 'aurora'
  | 'sunset'
  | 'champion'
  | 'spring'
  | 'ember'
  | 'plasma'

export interface GradientButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonStyles> {
  asChild?: boolean
  gradient?: GradientVariant
}

export const GradientButton = React.forwardRef<HTMLButtonElement, GradientButtonProps>(
  ({ className, gradient = 'aurora', size, asChild = false, children, ...props }, ref) => {
    if (asChild) {
      const Comp = Slot
      return (
        <Comp
          ref={ref}
          data-grad={gradient}
          className={cn(buttonStyles({ size, className }))}
          {...(props as any)}
        >
          {children}
        </Comp>
      )
    }
    return (
      <motion.button
        ref={ref as any}
        data-grad={gradient}
        whileTap={{ scale: 0.98 }}
        className={cn(buttonStyles({ size, className }))}
        {...(props as any)}
      >
        {children}
      </motion.button>
    )
  },
)
GradientButton.displayName = 'GradientButton'
