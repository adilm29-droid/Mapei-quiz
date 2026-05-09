import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Flame, Snowflake, Star } from 'lucide-react'
import { getSession } from '@/lib/session'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { Avatar } from '@/components/avatar/avatar'
import { Badge } from '@/components/ui/badge'
import { xpToNextLevel } from '@/lib/xp'
import { FlairPicker } from './_components/flair-picker'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const session = await getSession()
  if (!session) redirect('/signin')

  const supabase = getSupabaseAdmin()
  const { data: me } = await supabase
    .from('users')
    .select('id, username, email, first_name, last_name, title, xp, level, current_streak, longest_streak, streak_freezes, role, status, avatar_url, active_badge_id')
    .eq('id', session.userId)
    .maybeSingle()
  if (!me) redirect('/signin')

  const { data: catalog } = await supabase
    .from('badges')
    .select('id, code, name, description, gradient, category')
  const { data: earnedRows } = await supabase
    .from('user_badges')
    .select('badge_id, earned_at')
    .eq('user_id', session.userId)

  const earnedSet = new Set<string>((earnedRows ?? []).map((r: any) => r.badge_id))
  const badges = (catalog ?? []).map((b: any) => ({ ...b, earned: earnedSet.has(b.id) }))
  const earnedCount = badges.filter(b => b.earned).length

  const xpProg = xpToNextLevel(me.xp ?? 0)
  const xpPct = Math.round((xpProg.current / xpProg.needed) * 100)

  return (
    <div className="min-h-screen pb-12">
      <header className="sticky top-0 z-30 border-b border-midnight-line bg-midnight-base/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-4">
          <Link
            href="/home"
            className="inline-flex items-center gap-2 text-caption text-whitex-muted hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
          <span className="text-micro uppercase tracking-[0.3em] text-whitex-faint">Profile</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-5 py-8">
        {/* Hero */}
        <section className="flex flex-col items-center gap-4 text-center">
          <Avatar
            size="xl"
            username={me.username}
            first_name={me.first_name}
            last_name={me.last_name}
            src={me.avatar_url}
            isSelf
          />
          <div>
            <h1 className="text-h1 font-bold text-white">
              {[me.first_name, me.last_name].filter(Boolean).join(' ') || `@${me.username}`}
            </h1>
            <p className="mt-1 text-caption text-whitex-muted">{me.title}</p>
            <div className="mt-2 flex items-center justify-center gap-2">
              <Badge tone={me.role === 'admin' ? 'glow' : 'neutral'}>{me.role}</Badge>
              <Badge tone="info">Level {me.level}</Badge>
            </div>
          </div>
        </section>

        {/* XP bar */}
        <section className="rounded-2xl border border-midnight-line bg-midnight-elevated/40 p-5 backdrop-blur">
          <div className="mb-2 flex items-center justify-between text-caption">
            <span className="text-whitex-muted">XP toward Level {xpProg.nextLevel}</span>
            <span className="font-mono tabular text-whitex-soft">
              {xpProg.current.toLocaleString()} / {xpProg.needed.toLocaleString()}
            </span>
          </div>
          <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-midnight-deepest/60">
            <div
              className="h-full bg-gradient-aurora transition-all"
              style={{ width: `${xpPct}%` }}
            />
          </div>
          <p className="mt-2 text-micro tabular text-whitex-faint">{me.xp.toLocaleString()} total XP</p>
        </section>

        {/* Streak */}
        <section className="rounded-2xl border border-sunset-from/30 p-5 backdrop-blur"
          style={{ background: 'linear-gradient(135deg, rgba(236,72,153,0.06), rgba(249,115,22,0.06))' }}
        >
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <Flame className="mx-auto h-5 w-5 fill-current text-sunset-from" />
              <p className="mt-1.5 text-h2 font-bold text-white tabular">{me.current_streak}</p>
              <p className="text-micro uppercase tracking-wider text-whitex-faint">Current</p>
            </div>
            <div className="border-x border-midnight-line">
              <Star className="mx-auto h-5 w-5 fill-current text-champion-from" />
              <p className="mt-1.5 text-h2 font-bold text-white tabular">{me.longest_streak}</p>
              <p className="text-micro uppercase tracking-wider text-whitex-faint">Longest</p>
            </div>
            <div>
              <Snowflake className="mx-auto h-5 w-5 text-info" />
              <p className="mt-1.5 text-h2 font-bold text-white tabular">{me.streak_freezes}</p>
              <p className="text-micro uppercase tracking-wider text-whitex-faint">Freezes</p>
            </div>
          </div>
        </section>

        {/* Past attempts + achievements shortcuts */}
        <section className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/profile/attempts"
            className="flex items-center justify-between rounded-2xl border border-midnight-line bg-midnight-elevated px-5 py-4 text-caption text-whitex-soft hover:bg-midnight-line"
          >
            <span className="font-semibold text-white">Past attempts</span>
            <span className="text-whitex-muted">View Attempt 1s + reports →</span>
          </Link>
          <Link
            href="/profile/achievements"
            className="flex items-center justify-between rounded-2xl border border-midnight-line bg-midnight-elevated px-5 py-4 text-caption text-whitex-soft hover:bg-midnight-line"
          >
            <span className="font-semibold text-white">Achievements</span>
            <span className="text-whitex-muted">Full catalog →</span>
          </Link>
        </section>

        {/* Active flair picker (only renders if user has earned at least one badge) */}
        <FlairPicker badges={badges} initialActive={me.active_badge_id ?? null} />

        {/* Badges grid */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-micro uppercase tracking-[0.3em] text-whitex-faint">
              Badges ({earnedCount} of {badges.length})
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {badges.map(b => (
              <div
                key={b.id}
                title={`${b.name} — ${b.description}`}
                className={
                  b.earned
                    ? `flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl bg-gradient-${b.gradient} p-3 text-center shadow-glow-soft`
                    : 'flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border border-midnight-line bg-midnight-elevated/30 p-3 text-center opacity-30 grayscale'
                }
              >
                <Star className="h-7 w-7 fill-white text-white drop-shadow" />
                <p className="line-clamp-2 text-micro font-medium text-white">{b.name}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
