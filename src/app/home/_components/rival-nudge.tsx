import { ChevronUp } from 'lucide-react'
import Link from 'next/link'
import { Avatar } from '@/components/avatar/avatar'

interface RivalNudgeProps {
  rival: {
    username: string
    first_name: string | null
    last_name: string | null
    title: string
    xp: number
  }
  yourXp: number
}

export function RivalNudge({ rival, yourXp }: RivalNudgeProps) {
  const gap = Math.max(0, rival.xp - yourXp)
  if (gap === 0) return null

  const name = [rival.first_name, rival.last_name].filter(Boolean).join(' ') || `@${rival.username}`

  return (
    <Link
      href="/leaderboard?scope=all-time"
      className="block rounded-2xl border border-info/30 bg-info/5 p-4 transition-colors hover:bg-info/10 backdrop-blur"
    >
      <div className="flex items-center gap-4">
        <ChevronUp className="h-5 w-5 shrink-0 text-info" />
        <Avatar
          size="md"
          username={rival.username}
          first_name={rival.first_name}
          last_name={rival.last_name}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-semibold text-whitex-soft">
            Catch <span className="text-info">{name}</span>
          </p>
          <p className="truncate text-caption text-whitex-muted">
            <span className="font-mono tabular text-whitex-soft">{gap.toLocaleString()}</span> XP
            ahead — one quiz away
          </p>
        </div>
      </div>
    </Link>
  )
}
