'use client'

import { cn } from '@/lib/utils'

export function ProgressDots({
  total,
  current,
  answered,
}: {
  total: number
  current: number
  /** Set of answered question IDs (cardinality is what we display) */
  answered: Set<string>
}) {
  return (
    <div className="mx-auto mt-8 flex w-full max-w-3xl flex-wrap items-center justify-center gap-1.5">
      {Array.from({ length: total }, (_, i) => {
        const isCurrent = i === current
        const isAnswered = i < current && answered.size >= i + 1
        return (
          <span
            key={i}
            className={cn(
              'block rounded-full transition-all',
              isCurrent
                ? 'h-2.5 w-2.5 bg-gradient-aurora shadow-glow-soft'
                : isAnswered
                ? 'h-1.5 w-1.5 bg-gradient-aurora opacity-80'
                : 'h-1.5 w-1.5 border border-midnight-line bg-transparent',
            )}
          />
        )
      })}
      <span className="ml-3 text-micro tabular text-whitex-faint">
        {answered.size}/{total} answered
      </span>
    </div>
  )
}
