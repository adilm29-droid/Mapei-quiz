'use client'

import * as React from 'react'
import { animate, useMotionValue, useTransform, motion } from 'motion/react'
import { cn } from '@/lib/utils'

/**
 * NumberTicker — animates from `from` to `value` over `duration` ms.
 * Per DESIGN_SYSTEM §4 hint: useMotionValue + useTransform (~15 lines).
 *
 * Used for the score reveal (0 → final), the XP delta card, and any
 * cumulative stat that earns its own moment of attention.
 *
 * Defaults: tabular-nums + the current text gradient. Combine with
 * className like `text-display-xl text-gradient-champion` for the
 * full score-reveal vibe.
 */

interface NumberTickerProps {
  value: number
  /** Starting value, default 0 */
  from?: number
  /** Animation duration in ms, default 1500 (per design system §4) */
  duration?: number
  /**
   * Format function applied to the in-flight motion value.
   * Default: rounds to int and applies locale thousand separators.
   */
  format?: (n: number) => string
  /** Easing — design system uses ease-out for tick-ups */
  ease?: 'easeOut' | 'easeInOut' | 'circOut' | 'linear'
  className?: string
  /** Disable the climb (used for SSR-safe initial render or reduced-motion) */
  disableAnimation?: boolean
  /** Fired when the climb completes */
  onComplete?: () => void
}

export function NumberTicker({
  value,
  from = 0,
  duration = 1500,
  format = (n) => Math.round(n).toLocaleString('en-US'),
  ease = 'easeOut',
  className,
  disableAnimation = false,
  onComplete,
}: NumberTickerProps) {
  const motionValue = useMotionValue(disableAnimation ? value : from)
  const display = useTransform(motionValue, (latest) => format(latest))

  React.useEffect(() => {
    if (disableAnimation) {
      motionValue.set(value)
      onComplete?.()
      return
    }
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      motionValue.set(value)
      onComplete?.()
      return
    }
    const controls = animate(motionValue, value, {
      duration: duration / 1000,
      ease,
      onComplete,
    })
    return () => controls.stop()
    // We intentionally re-run on `value` changes so the ticker can tick again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration, ease, disableAnimation])

  return (
    <motion.span className={cn('tabular inline-block', className)}>{display}</motion.span>
  )
}
