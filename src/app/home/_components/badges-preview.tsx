import { cn } from '@/lib/utils'

interface BadgeItem {
  id: string
  code: string
  name: string
  description: string
  gradient: string
  earned: boolean
}

export function BadgesPreview({ badges }: { badges: BadgeItem[] }) {
  const earned = badges.filter(b => b.earned).length
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-micro uppercase tracking-[0.3em] text-whitex-faint">
          Badges <span className="ml-1 text-whitex-muted">({earned} of {badges.length})</span>
        </h2>
      </div>

      <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
        {badges.slice(0, 12).map(b => (
          <div
            key={b.id}
            title={`${b.name} — ${b.description}`}
            className={cn(
              'aspect-square rounded-2xl border border-midnight-line p-3 transition-all',
              b.earned
                ? `bg-gradient-${b.gradient} shadow-glow-soft`
                : 'bg-midnight-elevated/40 grayscale opacity-30',
            )}
          >
            <div className="flex h-full w-full items-center justify-center text-h3 text-white drop-shadow">
              {/* Simple visual — real icon mapping comes in profile/badges screen */}
              ★
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
