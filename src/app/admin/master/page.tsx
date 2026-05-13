import { redirect } from 'next/navigation'
import { Download, Crown } from 'lucide-react'
import { getSession } from '@/lib/session'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { assembleMasterReport } from '@/lib/reports/master-report'
import { formatUaeDateTime } from '@/lib/utils/timezone'

export const dynamic = 'force-dynamic'

/**
 * /admin/master — combined report across every quiz + every user.
 *
 * Top: overall ranking — total score across all attempted quizzes
 * with gold/silver/bronze on the top 3. Each row has a horizontal bar
 * showing total / sum-of-maxes.
 *
 * Below: one section per quiz with the same bar+medal treatment
 * scoped to that quiz. Wrong count is derived from max_score - score
 * (post-migration-009: 1 mark per question).
 *
 * Download button hits /api/admin/reports/master/pdf for a printable
 * version of the same data.
 *
 * Auth: /admin/layout already enforces requireAdmin.
 */
export default async function MasterReportPage() {
  const session = await getSession()
  if (!session) redirect('/signin')
  if (session.role !== 'admin') redirect('/')

  const supabase = getSupabaseAdmin()
  const report = await assembleMasterReport(supabase)

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-h2 font-semibold text-white">
            <Crown className="h-5 w-5 text-amber-300" />
            Master report
          </h1>
          <p className="text-caption text-whitex-muted">
            Every staff member, every quiz, ranked. Generated{' '}
            {formatUaeDateTime(report.generatedAt)}.
          </p>
        </div>
        <a
          href="/api/admin/reports/master/pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-midnight-line bg-midnight-elevated px-3 py-2 text-caption text-whitex-soft hover:bg-midnight-line"
        >
          <Download className="h-3.5 w-3.5" />
          Download PDF
        </a>
      </header>

      {/* Overall combined ranking ------------------------------------ */}
      <section className="space-y-2">
        <h2 className="text-h3 font-semibold text-white">
          Overall · combined across all quizzes ({report.totals.length})
        </h2>
        {report.totals.length === 0 ? (
          <EmptyState message="No leaderboard attempts on file yet." />
        ) : (
          <div className="space-y-2">
            {report.totals.map(t => (
              <ScoreBar
                key={t.userId}
                rank={t.rank}
                medal={t.medal}
                name={t.userName}
                username={t.username}
                score={t.totalScore}
                max={t.totalMax}
                metaRight={`${t.quizzesAttempted} quiz${t.quizzesAttempted === 1 ? '' : 'zes'}`}
              />
            ))}
          </div>
        )}
      </section>

      {/* Per-quiz sections ------------------------------------------- */}
      {report.quizzes.map(q => (
        <section key={q.quizId} className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-h3 font-semibold text-white">
              {q.weekNumber ? `Week ${q.weekNumber} · ` : ''}
              {q.title}
            </h2>
            <span className="font-mono text-micro tabular text-whitex-faint">
              {q.rows.length} attempt{q.rows.length === 1 ? '' : 's'} · max {q.maxScore}
            </span>
          </div>
          {q.rows.length === 0 ? (
            <EmptyState message="No staff have completed this quiz yet." />
          ) : (
            <div className="space-y-2">
              {q.rows.map(r => (
                <ScoreBar
                  key={`${q.quizId}:${r.userId}`}
                  rank={r.rank}
                  medal={r.medal}
                  name={r.userName}
                  username={r.username}
                  score={r.score}
                  max={r.maxScore}
                  metaRight={`${r.wrong} wrong`}
                />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-midnight-line bg-midnight-elevated/40 p-6 text-center text-caption text-whitex-muted">
      {message}
    </div>
  )
}

function MedalBadge({ medal }: { medal: 'gold' | 'silver' | 'bronze' }) {
  const meta = {
    gold: { label: 'GOLD', cls: 'bg-gradient-to-r from-amber-300 to-yellow-500 text-amber-950' },
    silver: { label: 'SILVER', cls: 'bg-gradient-to-r from-slate-300 to-slate-500 text-slate-950' },
    bronze: { label: 'BRONZE', cls: 'bg-gradient-to-r from-amber-700 to-amber-900 text-white' },
  }[medal]
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-micro font-bold uppercase tracking-wider shadow-sm ${meta.cls}`}
    >
      {meta.label}
    </span>
  )
}

function ScoreBar({
  rank,
  medal,
  name,
  username,
  score,
  max,
  metaRight,
}: {
  rank: number
  medal: 'gold' | 'silver' | 'bronze' | null
  name: string
  username: string
  score: number
  max: number
  metaRight: string
}) {
  const widthPct = max > 0 ? Math.min(100, (score / max) * 100) : 0
  const barClass =
    medal === 'gold'
      ? 'bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500'
      : medal === 'silver'
      ? 'bg-gradient-to-r from-slate-300 to-slate-500'
      : medal === 'bronze'
      ? 'bg-gradient-to-r from-amber-700 to-amber-900'
      : 'bg-gradient-to-r from-aurora-from to-aurora-to'

  return (
    <div className="relative overflow-hidden rounded-2xl border border-midnight-line bg-midnight-elevated/40">
      <div
        aria-hidden
        className={`absolute inset-y-0 left-0 opacity-20 ${barClass}`}
        style={{ width: `${widthPct}%` }}
      />
      <div className="relative flex items-center gap-4 px-4 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-midnight-line bg-midnight-base text-caption font-bold text-whitex-muted tabular">
          {rank}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-body font-semibold text-whitex-soft">{name}</p>
            {medal && <MedalBadge medal={medal} />}
          </div>
          <p className="truncate text-micro text-whitex-muted">@{username}</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-h3 tabular text-white">{score}</p>
          <p className="font-mono text-micro tabular text-whitex-faint">
            / {max} · {metaRight}
          </p>
        </div>
      </div>
    </div>
  )
}
