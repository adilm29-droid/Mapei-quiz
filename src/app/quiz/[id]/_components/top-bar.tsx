'use client'

/**
 * Per-question decorative bar — drains right→left over 60s, color shifts
 * green → cyan → amber → red as time runs out (the leftmost remaining
 * color is what's filled). Purely visual urgency cue per design §6.3.
 */
export function TopBar({ elapsedSec }: { elapsedSec: number }) {
  const cap = 60
  const e = Math.min(cap, elapsedSec)
  const pctRemaining = 1 - e / cap

  let bg = 'linear-gradient(90deg, #34D399, #06B6D4)'
  if (e < 15) bg = 'linear-gradient(90deg, #34D399, #06B6D4)'
  else if (e < 35) bg = 'linear-gradient(90deg, #06B6D4, #F59E0B)'
  else if (e < 50) bg = 'linear-gradient(90deg, #F59E0B, #EF4444)'
  else bg = 'linear-gradient(90deg, #EF4444, #EC4899)'

  return (
    <div className="fixed inset-x-0 top-0 z-30 h-1.5 bg-midnight-deepest/40">
      <div
        className="h-full transition-[width] duration-1000 ease-linear"
        style={{ width: `${pctRemaining * 100}%`, background: bg }}
      />
    </div>
  )
}
