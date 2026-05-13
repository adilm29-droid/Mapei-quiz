import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Trophy } from 'lucide-react'
import { getSession } from '@/lib/session'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { Avatar } from '@/components/avatar/avatar'
import { Badge } from '@/components/ui/badge'
import { LEADERBOARD_TOPPER_IMAGE } from '@/lib/achievements/badge-images'
import { LeaderboardAutoRefresh } from './_components/auto-refresh'

export const dynamic = 'force-dynamic'

interface RowItem {
  rank: number
  userId: string
  username: string
  first_name: string | null
  last_name: string | null
  title: string
  score: number
  isMe: boolean
  isChampion: boolean
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/signin')
  const sp = await searchParams
  const scope: 'quiz' | 'all-time' = sp.scope === 'all-time' ? 'all-time' : 'quiz'

  const supabase = getSupabaseAdmin()

  // ── Latest unlocked quiz (display ungated — per 2026-05-12 change the
  // podium / leaderboard show whenever ≥1 staff has completed) ────────
  const { data: latestQuiz } = await supabase
    .from('quizzes')
    .select('id, title, week_number, max_score, leaderboard_visible')
    .eq('is_unlocked', true)
    .is('deleted_at', null)
    .order('week_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  let rows: RowItem[] = []
  let title = ''
  let maxScore = 0

  if (scope === 'quiz' && latestQuiz) {
    title = latestQuiz.title
    maxScore = latestQuiz.max_score ?? 0

    const { data: attempts } = await supabase
      .from('attempts')
      .select('user_id, final_score, submitted_at, users!inner(id, username, first_name, last_name, title)')
      .eq('quiz_id', latestQuiz.id)
      .eq('is_leaderboard_attempt', true)
      .is('deleted_at', null)
      .order('final_score', { ascending: false })
      .order('submitted_at', { ascending: true })

    rows = (attempts ?? []).map((a: any, i: number) => ({
      rank: i + 1,
      userId: a.users.id,
      username: a.users.username,
      first_name: a.users.first_name,
      last_name: a.users.last_name,
      title: a.users.title,
      score: a.final_score ?? 0,
      isMe: a.users.id === session.userId,
      isChampion: i === 0,
    }))
  } else {
    title = 'All-Time XP'
    const { data: users } = await supabase
      .from('users')
      .select('id, username, first_name, last_name, title, xp')
      .eq('status', 'approved')
      .order('xp', { ascending: false })

    rows = (users ?? []).map((u: any, i: number) => ({
      rank: i + 1,
      userId: u.id,
      username: u.username,
      first_name: u.first_name,
      last_name: u.last_name,
      title: u.title,
      score: u.xp ?? 0,
      isMe: u.id === session.userId,
      isChampion: i === 0,
    }))
  }

  // For the inline score bar we normalize to the highest score on the
  // board (so #1's bar is always full). For per-quiz scope this is
  // effectively the quiz's max_score because #1's score caps at that.
  const peak = rows.length > 0 ? rows[0].score : 1
  const scaleDenom = scope === 'quiz' && maxScore > 0 ? maxScore : Math.max(peak, 1)

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
          <div className="flex items-center gap-2 text-micro uppercase tracking-[0.3em] text-whitex-faint">
            <Trophy className="h-3.5 w-3.5" />
            Leaderboard
          </div>
        </div>
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-5 pb-4">
          <Link
            href="/leaderboard?scope=quiz"
            className={
              scope === 'quiz'
                ? 'rounded-lg bg-midnight-elevated px-4 py-1.5 text-caption font-medium text-white shadow-sm'
                : 'rounded-lg px-4 py-1.5 text-caption text-whitex-muted hover:text-whitex-soft'
            }
          >
            This Quiz
          </Link>
          <Link
            href="/leaderboard?scope=all-time"
            className={
              scope === 'all-time'
                ? 'rounded-lg bg-midnight-elevated px-4 py-1.5 text-caption font-medium text-white shadow-sm'
                : 'rounded-lg px-4 py-1.5 text-caption text-whitex-muted hover:text-whitex-soft'
            }
          >
            All-Time
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-2 px-5 py-6">
        <LeaderboardAutoRefresh />
        <div className="mb-3 flex items-baseline justify-between">
          <h1 className="text-caption text-whitex-muted">{title}</h1>
          {scope === 'quiz' && maxScore > 0 && (
            <span className="font-mono text-micro tabular text-whitex-faint">
              out of {maxScore}
            </span>
          )}
        </div>

        {rows.length === 0 ? (
          <div className="rounded-2xl border border-midnight-line bg-midnight-elevated/40 p-8 text-center text-caption text-whitex-muted backdrop-blur">
            {scope === 'quiz'
              ? 'Be the first to complete this week’s quiz — the board fills up as staff finish.'
              : 'No data yet for this scope.'}
          </div>
        ) : (
          rows.map(r => (
            <Row
              key={r.userId}
              row={r}
              scaleDenom={scaleDenom}
              showOutOf={scope === 'quiz' ? maxScore : 0}
            />
          ))
        )}
      </main>
    </div>
  )
}

function Row({
  row,
  scaleDenom,
  showOutOf,
}: {
  row: RowItem
  scaleDenom: number
  showOutOf: number
}) {
  const widthPct = scaleDenom > 0 ? Math.min(100, (row.score / scaleDenom) * 100) : 0
  const barClass =
    row.rank === 1
      ? 'bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500'
      : row.rank === 2
      ? 'bg-gradient-to-r from-slate-300 to-slate-500'
      : row.rank === 3
      ? 'bg-gradient-to-r from-amber-700 to-amber-900'
      : 'bg-gradient-to-r from-aurora-from to-aurora-to'
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border backdrop-blur ${
        row.rank === 1
          ? 'border-amber-400/40 bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent shadow-glow-soft'
          : row.isMe
          ? 'border-info/40 bg-info/5'
          : 'border-midnight-line bg-midnight-elevated/40'
      }`}
    >
      {/* Score bar — sits behind the row content, width proportional to score */}
      <div
        aria-hidden
        className={`absolute inset-y-0 left-0 opacity-15 ${barClass}`}
        style={{ width: `${widthPct}%` }}
      />

      <div className="relative flex items-center gap-4 px-4 py-3">
        {row.rank === 1 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={LEADERBOARD_TOPPER_IMAGE}
            alt="Leaderboard Topper"
            title="Leaderboard Topper · 1st Place"
            className="h-12 w-12 shrink-0 object-contain drop-shadow"
          />
        ) : (
          <span
            className={
              row.rank <= 3
                ? `flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-${
                    row.rank === 2 ? 'silver' : 'bronze'
                  } text-h3 font-bold text-white shadow-sm`
                : 'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-midnight-line text-caption font-bold text-whitex-muted tabular'
            }
          >
            {row.rank}
          </span>
        )}
        <Avatar
          size="md"
          username={row.username}
          first_name={row.first_name}
          last_name={row.last_name}
          champion={row.isChampion}
          isSelf={row.isMe}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-semibold text-whitex-soft">
            {[row.first_name, row.last_name].filter(Boolean).join(' ') || `@${row.username}`}
            {row.isMe && (
              <Badge tone="info" className="ml-2">
                You
              </Badge>
            )}
          </p>
          <p className="truncate text-caption text-whitex-muted">{row.title}</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-h3 tabular text-white">{row.score.toLocaleString()}</p>
          {showOutOf > 0 && (
            <p className="font-mono text-micro tabular text-whitex-faint">/ {showOutOf}</p>
          )}
        </div>
      </div>
    </div>
  )
}
