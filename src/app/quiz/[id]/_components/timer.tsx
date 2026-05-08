'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export function Timer({ expiresAt, onExpired }: { expiresAt: string; onExpired: () => void }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const remaining = Math.max(0, new Date(expiresAt).getTime() - now)
  useEffect(() => {
    if (remaining <= 0) onExpired()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining <= 0])

  const totalSec = Math.floor(remaining / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  const mm = m.toString().padStart(2, '0')
  const ss = s.toString().padStart(2, '0')

  const under1 = totalSec < 60
  const under5 = totalSec < 5 * 60

  if (under1) {
    return (
      <span className="font-mono text-h3 tabular text-gradient-ember bg-clip-text text-transparent animate-pulse">
        {mm}:{ss}
      </span>
    )
  }
  if (under5) {
    return (
      <span className="font-mono text-h3 tabular text-gradient-sunset bg-clip-text text-transparent">
        {mm}:{ss}
      </span>
    )
  }
  return (
    <span className={cn('font-mono text-h3 tabular text-whitex-soft')}>
      {mm}:{ss}
    </span>
  )
}
