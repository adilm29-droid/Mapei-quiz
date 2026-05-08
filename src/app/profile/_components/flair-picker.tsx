'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Star, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BadgeItem {
  id: string
  code: string
  name: string
  gradient: string
  earned: boolean
}

export function FlairPicker({
  badges,
  initialActive,
}: {
  badges: BadgeItem[]
  initialActive: string | null
}) {
  const router = useRouter()
  const [active, setActive] = useState<string | null>(initialActive)
  const [busy, setBusy] = useState(false)

  const earned = badges.filter(b => b.earned)
  if (earned.length === 0) return null

  async function setFlair(badgeId: string | null) {
    setBusy(true)
    const res = await fetch('/api/me/active-badge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ badgeId }),
    })
    const body = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) {
      toast.error(body?.error || 'Could not update flair')
      return
    }
    setActive(badgeId)
    toast.success(badgeId ? 'Flair updated' : 'Flair cleared')
    router.refresh()
  }

  return (
    <section className="rounded-2xl border border-midnight-line bg-midnight-elevated/40 p-5 backdrop-blur">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-h3 font-semibold text-white">Active flair</h2>
          <p className="mt-0.5 text-caption text-whitex-muted">
            The badge shown next to your name on the leaderboard.
          </p>
        </div>
        {active && (
          <button
            onClick={() => setFlair(null)}
            disabled={busy}
            className="inline-flex items-center gap-1 text-caption text-whitex-muted hover:text-whitex-soft disabled:opacity-50"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {earned.map(b => (
          <button
            key={b.id}
            onClick={() => setFlair(b.id)}
            disabled={busy || active === b.id}
            className={cn(
              'flex items-center gap-2 rounded-xl border px-3 py-2 text-caption transition-all',
              active === b.id
                ? `border-transparent bg-gradient-${b.gradient} text-white shadow-glow-soft`
                : 'border-midnight-line bg-midnight-deepest/60 text-whitex-soft hover:border-info/40',
              'disabled:cursor-not-allowed disabled:opacity-60',
            )}
          >
            <span className={`flex h-5 w-5 items-center justify-center rounded-full bg-gradient-${b.gradient}`}>
              <Star className="h-3 w-3 fill-white text-white" />
            </span>
            {b.name}
          </button>
        ))}
      </div>
    </section>
  )
}
