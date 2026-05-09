import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Download } from 'lucide-react'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { formatUaeDateTime, formatDuration } from '@/lib/utils/timezone'
import { ResetAttemptButton } from './_components/reset-attempt-button'

export const dynamic = 'force-dynamic'

/**
 * /admin/users/[userId]/attempts/[attemptId] — admin per-attempt view.
 *
 * Per CLAUDE_CODE_PROMPT.md §10: full per-question detail. Every
 * question, all options, user's choice (red/green), correct answer,
 * IP, UA, timestamps. Same data as the admin PDF (§9) — this page is
 * the on-screen counterpart.
 *
 * Auth handled at /admin/layout.tsx (requireAdmin redirects).
 */
export default async function AdminAttemptDetail({
  params,
}: {
  params: Promise<{ userId: string; attemptId: string }>
}) {
  const { userId, attemptId } = await params
  const supabase = getSupabaseAdmin()

  const { data: rawAttempt } = await supabase
    .from('attempts')
    .select(
      'id, user_id, quiz_id, final_score, started_at, submitted_at, time_taken_seconds, xp_awarded, ' +
        'is_leaderboard_attempt, deleted_at, ip_address, user_agent, answers, question_order, ' +
        'quizzes!inner(id, title, max_score, week_number), users!inner(id, username, first_name, last_name, email)',
    )
    .eq('id', attemptId)
    .maybeSingle()
  const attempt = rawAttempt as any
  if (!attempt || attempt.user_id !== userId) notFound()

  const quiz: any = attempt.quizzes
  const user: any = attempt.users
  const max = quiz.max_score ?? 0
  const pct = max > 0 ? Math.round(((attempt.final_score ?? 0) / max) * 1000) / 10 : 0

  const { data: questions } = await supabase
    .from('questions')
    .select('id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation')
    .eq('quiz_id', attempt.quiz_id)

  const orderArr: string[] = (attempt.question_order ?? []) as string[]
  const qById = new Map<string, any>((questions ?? []).map(q => [q.id, q]))
  const ordered = orderArr.length
    ? orderArr.map(id => qById.get(id)).filter(Boolean)
    : (questions ?? [])
  const answers = (attempt.answers ?? {}) as Record<string, 'A' | 'B' | 'C' | 'D'>

  const fullName =
    [user.first_name, user.last_name].filter(Boolean).join(' ') || `@${user.username}`

  const wrongCount = ordered.filter((q: any) => answers[q.id] !== q.correct_answer).length

  return (
    <div className="min-h-screen pb-12">
      <header className="sticky top-0 z-30 border-b border-midnight-line bg-midnight-base/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-5 py-4">
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-2 text-caption text-whitex-muted hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Users
          </Link>
          <span className="text-micro uppercase tracking-[0.3em] text-whitex-faint">
            Admin · Attempt detail
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-5 py-8">
        <section className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={
                'inline-flex items-center rounded-full px-2 py-0.5 text-micro font-semibold uppercase tracking-wider ring-1 ' +
                (attempt.is_leaderboard_attempt
                  ? 'bg-amber-500/10 text-amber-300 ring-amber-400/30'
                  : 'bg-slate-500/10 text-slate-300 ring-slate-400/30')
              }
            >
              {attempt.is_leaderboard_attempt ? '🏆 Leaderboard try' : 'Practice'}
            </span>
            {attempt.deleted_at ? (
              <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-micro font-semibold uppercase tracking-wider text-rose-300 ring-1 ring-rose-400/30">
                Soft-deleted
              </span>
            ) : null}
            {quiz.week_number ? (
              <span className="text-micro uppercase tracking-wider text-whitex-faint">
                Week {quiz.week_number}
              </span>
            ) : null}
          </div>
          <h1 className="text-h1 font-bold text-white">{quiz.title}</h1>
          <p className="text-caption text-whitex-muted">
            {fullName} · @{user.username} · {user.email}
          </p>
        </section>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Score" value={`${attempt.final_score ?? 0}/${max}`} />
          <Stat label="Percent" value={`${pct}%`} />
          <Stat label="Wrong" value={wrongCount} />
          <Stat
            label="Time taken"
            value={formatDuration(attempt.time_taken_seconds ?? 0)}
          />
          <Stat label="XP awarded" value={`+${attempt.xp_awarded ?? 0}`} />
          <Stat
            label="Started"
            value={attempt.started_at ? formatUaeDateTime(attempt.started_at) : '—'}
          />
          <Stat
            label="Submitted"
            value={attempt.submitted_at ? formatUaeDateTime(attempt.submitted_at) : '—'}
          />
          <Stat label="IP" value={attempt.ip_address ?? '—'} />
        </section>

        <section className="rounded-2xl border border-midnight-line bg-midnight-elevated p-4 text-caption text-whitex-muted">
          <span className="text-micro uppercase tracking-[0.18em] text-whitex-faint">
            User-Agent
          </span>
          <p className="mt-1 break-all">{attempt.user_agent ?? '—'}</p>
        </section>

        <section className="flex flex-wrap gap-2">
          <a
            href={`/api/quiz/${attempt.id}/pdf?variant=admin`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-midnight-line bg-midnight-elevated px-3 py-2 text-caption text-whitex-soft hover:bg-midnight-line"
          >
            <Download className="h-3.5 w-3.5" /> Admin PDF
          </a>
          <a
            href={`/api/quiz/${attempt.id}/pdf?variant=user`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-midnight-line bg-midnight-base px-3 py-2 text-caption text-whitex-soft hover:bg-midnight-line"
          >
            User-facing PDF
          </a>
          <ResetAttemptButton
            userId={userId}
            quizId={attempt.quiz_id}
            isLeaderboard={!!attempt.is_leaderboard_attempt}
            alreadyDeleted={!!attempt.deleted_at}
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-h3 font-semibold text-white">Per-question</h2>
          {ordered.map((q: any, i: number) => {
            const yours = answers[q.id] ?? null
            const wrong = yours !== q.correct_answer
            const opts: { letter: 'A' | 'B' | 'C' | 'D'; text: string }[] = [
              { letter: 'A', text: q.option_a },
              { letter: 'B', text: q.option_b },
              { letter: 'C', text: q.option_c },
              { letter: 'D', text: q.option_d },
            ]
            return (
              <article
                key={q.id}
                className="rounded-2xl border border-midnight-line bg-midnight-elevated p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-micro uppercase tracking-wider text-whitex-faint">
                    Q{i + 1}
                  </span>
                  {wrong ? (
                    <span className="rounded-md bg-rose-500/15 px-2 py-0.5 text-micro font-semibold uppercase tracking-wider text-rose-300 ring-1 ring-rose-400/30">
                      WRONG ANSWER
                    </span>
                  ) : (
                    <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-micro font-semibold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-400/30">
                      CORRECT
                    </span>
                  )}
                </div>
                <p className="mt-2 text-body font-semibold text-white">{q.question_text}</p>
                <ul className="mt-3 space-y-1.5">
                  {opts.map(o => {
                    const isCorrect = o.letter === q.correct_answer
                    const isUserPick = o.letter === yours
                    let cls =
                      'flex gap-3 rounded-lg border border-midnight-line bg-midnight-base px-3 py-2 text-caption text-whitex-soft'
                    if (isCorrect) {
                      cls =
                        'flex gap-3 rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-caption text-emerald-100'
                    } else if (isUserPick) {
                      cls =
                        'flex gap-3 rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-caption text-rose-100'
                    }
                    return (
                      <li key={o.letter} className={cls}>
                        <span className="font-mono font-bold">{o.letter}.</span>
                        <span className="flex-1">{o.text}</span>
                      </li>
                    )
                  })}
                </ul>
                {q.explanation ? (
                  <p className="mt-3 border-l-2 border-midnight-line pl-3 text-caption italic text-whitex-muted">
                    {q.explanation}
                  </p>
                ) : null}
              </article>
            )
          })}
        </section>
      </main>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-midnight-line bg-midnight-elevated px-4 py-3">
      <div className="text-micro uppercase tracking-[0.18em] text-whitex-faint">{label}</div>
      <div className="mt-1 font-mono text-caption font-bold text-white tabular-nums">{value}</div>
    </div>
  )
}
