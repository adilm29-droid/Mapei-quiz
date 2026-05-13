import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Trophy } from 'lucide-react'
import { getSession } from '@/lib/session'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { Avatar } from '@/components/avatar/avatar'
import { Badge } from '@/components/ui/badge'
import { LEADERBOARD_TOPPER_IMAGE } from '@/lib/achievements/badge-images'
import { assignMedalsByScoreTier } from '@/lib/reports/master-report'
import { LeaderboardAutoRefresh } from './_components/auto-refresh'

export const dynamic = 'force-dynamic'

type Medal = 'gold' | 'silver' | 'bronze' | null

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
  medal: Medal
}

interface QuizSection {
  quizId: string
  weekNumber: number | null
  title: string
  maxScore: number
  rows: RowItem[]
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/signin')
  const sp = await searchParams
  const scope: 'by-quiz' | 'all-time' = sp.scope === 'all-time' ? 'all-time' : 'by-quiz'

  const supabase = getSupabaseAdmin()

  let quizSections: QuizSection[] = []
  let allTimeRows: RowItem[] = []

  if (scope === 'by-quiz') {
    // Every actual quiz the staff have engaged with. Per Tarun 2026-05-13
    // the leaderboard exposes every quiz's full standings, not just the
    // latest one — and the quiz number/title is visible per section.
    const { data: quizzes } = await supabase
      .from('quizzes')
      .select('id, title, week_number, max_score, type, deleted_at, is_unlocked')
      .eq('type', 'actual')
      .is('deleted_at', null)
      .order('week_number', { ascending: false })

    const quizIds = (quizzes ?? []).map(q => q.id)
    const { data: rawAttempts } = quizIds.length
      ? await supabase
          .from('attempts')
          .select(
            'quiz_id, user_id, final_score, submitted_at, ' +
              'users!inner(id, username, first_name, last_name, title)',
          )
          .in('quiz_id', quizIds)
          .eq('is_leaderboard_attempt', true)
          .is('deleted_at', null)
      : { data: [] as any[] }

    const attempts = (rawAttempts ?? []) as any[]
    for (const q of quizzes ?? []) {
      const forQuiz = attempts
        .filter(a => a.quiz_id === q.id)
        .sort((a, b) => {
          const sa = a.final_score ?? 0
          const sb = b.final_score ?? 0
          if (sb !== sa) return sb - sa
          return (a.submitted_at ?? '').localeCompare(b.submitted_at ?? '')
        })
      const baseRows: RowItem[] = forQuiz.map((a: any, i: number) => ({
        rank: i + 1,
        userId: a.users.id,
        username: a.users.username,
        first_name: a.users.first_name,
        last_name: a.users.last_name,
        title: a.users.title,
        score: a.final_score ?? 0,
        isMe: a.users.id === session.userId,
        isChampion: false,
        medal: null,
      }))
      const withMedals = assignMedalsByScoreTier(baseRows).map(r => ({
        ...r,
        medal: r.score > 0 ? r.medal : null,
        isChampion: r.score > 0 && r.medal === 'gold',
      })) as RowItem[]
      quizSections.push({
        quizId: q.id,
        weekNumber: q.week_number ?? null,
        title: q.title,
        maxScore: q.max_score ?? 0,
        rows: withMedals,
      })
    }
  } else {
    const { data: users } = await supabase
      .from('users')
      .select('id, username, first_name, last_name, title, xp')
      .eq('status', 'approved')
      .order('xp', { ascending: false })

    const base: RowItem[] = (users ?? []).map((u: any, i: number) => ({
      rank: i + 1,
      userId: u.id,
      username: u.username,
      first_name: u.first_name,
      last_name: u.last_name,
      title: u.title,
      score: u.xp ?? 0,
      isMe: u.id === session.userId,
      isChampion: false,
      medal: null,
    }))
    allTimeRows = assignMedalsByScoreTier(base).map(r => ({
      ...r,
      medal: r.score > 0 ? r.medal : null,
      isChampion: r.score > 0 && r.medal === 'gold',
    })) as RowItem[]
  }

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
            href="/leaderboard?scope=by-quiz"
            className={
              scope === 'by-quiz'
                ? 'rounded-lg bg-midnight-elevated px-4 py-1.5 text-caption font-medium text-white shadow-sm'
                : 'rounded-lg px-4 py-1.5 text-caption text-whitex-muted hover:text-whitex-soft'
            }
          >
            By Quiz
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

      <main className="mx-auto max-w-3xl space-y-8 px-5 py-6">
        <LeaderboardAutoRefresh />

        {scope === 'by-quiz' ? (
          quizSections.length === 0 ? (
            <EmptyState message="No quizzes published yet." />
          ) : (
            quizSections.map(q => (
              <section key={q.quizId} className="space-y-2">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="text-h3 font-semibold text-white">
                    {q.weekNumber !== null ? `Week ${q.weekNumber} · ` : ''}
                    {q.title}
                  </h2>
                  <span className="font-mono text-micro tabular text-whitex-faint">
                    out of {q.maxScore}
                  </span>
                </div>
                {q.rows.length === 0 ? (
                  <EmptyState message="No one has completed this quiz yet." />
                ) : (
                  q.rows.map(r => (
                    <Row
                      key={`${q.quizId}:${r.userId}`}
                      row={r}
                      scaleDenom={q.maxScore || 1}
                      showOutOf={q.maxScore}
                    />
                  ))
                )}
              </section>
            ))
          )
        ) : (
          <section className="space-y-2">
            <h2 className="text-caption text-whitex-muted">All-Time XP</h2>
            {allTimeRows.length === 0 ? (
              <EmptyState message="No data yet." />
            ) : (
              allTimeRows.map(r => {
                const peak = allTimeRows[0]?.score ?? 1
                return (
                  <Row
                    key={r.userId}
                    row={r}
                    scaleDenom={Math.max(peak, 1)}
                    showOutOf={0}
                  />
                )
              })
            )}
          </section>
        )}
      </main>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-midnight-line bg-midnight-elevated/40 p-6 text-center text-caption text-whitex-muted backdrop-blur">
      {message}
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
    row.medal === 'gold'
      ? 'bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500'
      : row.medal === 'silver'
      ? 'bg-gradient-to-r from-slate-300 to-slate-500'
      : row.medal === 'bronze'
      ? 'bg-gradient-to-r from-amber-700 to-amber-900'
      : 'bg-gradient-to-r from-aurora-from to-aurora-to'
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border backdrop-blur ${
        row.medal === 'gold'
          ? 'border-amber-400/40 bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent shadow-glow-soft'
          : row.isMe
          ? 'border-info/40 bg-info/5'
          : 'border-midnight-line bg-midnight-elevated/40'
      }`}
    >
      <div
        aria-hidden
        className={`absolute inset-y-0 left-0 opacity-15 ${barClass}`}
        style={{ width: `${widthPct}%` }}
      />

      <div className="relative flex items-center gap-4 px-4 py-3">
        {row.medal === 'gold' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={LEADERBOARD_TOPPER_IMAGE}
            alt="Leaderboard Topper"
            title="Gold tier · top score"
            className="h-12 w-12 shrink-0 object-contain drop-shadow"
          />
        ) : (
          <span
            className={
              row.medal
                ? `flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-${
                    row.medal === 'silver' ? 'silver' : 'bronze'
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
            {row.medal && (
              <span
                className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-micro font-bold uppercase tracking-wider ${
                  row.medal === 'gold'
                    ? 'bg-amber-400/20 text-amber-200 ring-1 ring-amber-400/40'
                    : row.medal === 'silver'
                    ? 'bg-slate-400/20 text-slate-200 ring-1 ring-slate-400/40'
                    : 'bg-amber-700/30 text-amber-200 ring-1 ring-amber-700/50'
                }`}
              >
                {row.medal}
              </span>
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
