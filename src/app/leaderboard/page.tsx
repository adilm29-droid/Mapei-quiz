import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Trophy } from 'lucide-react'
import { getSession } from '@/lib/session'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { Avatar } from '@/components/avatar/avatar'
import { Badge } from '@/components/ui/badge'

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

  // ── Latest leaderboard-visible quiz (or any unlocked one if none visible yet) ─
  const { data: latestQuiz } = await supabase
    .from('quizzes')
    .select('id, title, week_number, max_score, leaderboard_visible')
    .eq('is_unlocked', true)
    .is('deleted_at', null)
    .order('week_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  // ── Compose the rows ────────────────────────────────────────────────
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

  // Top 3 podium-ette + rows 4-10 + me + neighbors
  const top10 = rows.slice(0, 10)
  const myIdx = rows.findIndex(r => r.isMe)
  const neighborStart = Math.max(0, myIdx - 1)
  const neighborSlice = myIdx >= 10 ? rows.slice(neighborStart, myIdx + 2) : []

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
        <div className="mb-2 text-caption text-whitex-muted">{title}</div>

        {scope === 'quiz' && latestQuiz && !latestQuiz.leaderboard_visible && (
          <div className="rounded-2xl border border-midnight-line bg-midnight-elevated/40 p-6 text-center text-caption text-whitex-muted backdrop-blur">
            🔒 Leaderboard reveals once 5 staff complete this week's quiz.
          </div>
        )}

        {(scope !== 'quiz' || (latestQuiz?.leaderboard_visible ?? false) || rows.length > 0) && (
          <>
            {top10.map(r => (
              <Row key={r.userId} row={r} maxScore={scope === 'quiz' ? maxScore : 0} />
            ))}
            {neighborSlice.length > 0 && (
              <>
                <div className="my-3 border-t border-dashed border-midnight-line" />
                <div className="text-micro uppercase tracking-[0.3em] text-whitex-faint">Your neighborhood</div>
                {neighborSlice.map(r => (
                  <Row key={r.userId} row={r} maxScore={scope === 'quiz' ? maxScore : 0} />
                ))}
              </>
            )}
            {rows.length === 0 && (
              <div className="rounded-2xl border border-midnight-line bg-midnight-elevated/40 p-8 text-center text-caption text-whitex-muted">
                No data yet for this scope.
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

function Row({ row, maxScore }: { row: RowItem; maxScore: number }) {
  return (
    <div
      className={`flex items-center gap-4 rounded-2xl border px-4 py-3 backdrop-blur ${
        row.isMe
          ? 'border-info/40 bg-info/5'
          : 'border-midnight-line bg-midnight-elevated/40'
      }`}
    >
      <span
        className={
          row.rank <= 3
            ? `flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-${
                row.rank === 1 ? 'champion' : row.rank === 2 ? 'silver' : 'bronze'
              } text-h3 font-bold text-white shadow-sm`
            : 'flex h-9 w-9 items-center justify-center rounded-xl border border-midnight-line text-h3 font-bold text-whitex-muted tabular'
        }
      >
        {row.rank}
      </span>
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
        {maxScore > 0 && <p className="font-mono text-micro tabular text-whitex-faint">/ {maxScore}</p>}
      </div>
    </div>
  )
}
