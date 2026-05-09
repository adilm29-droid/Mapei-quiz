import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BarChart3 } from 'lucide-react'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { formatDuration } from '@/lib/utils/timezone'

export const dynamic = 'force-dynamic'

/**
 * /admin/quizzes/[quizId]/insights — quiz-level analytics.
 *
 * Per CLAUDE_CODE_PROMPT.md §14:
 *   - Question-level miss-rate heatmap (Attempt 1s only)
 *   - Score distribution histogram
 *   - Avg time taken
 *   - Practice engagement (avg practice attempts per user who
 *     completed Attempt 1)
 *
 * All queries scope to is_leaderboard_attempt + deleted_at IS NULL.
 */
export default async function QuizInsightsPage({
  params,
}: {
  params: Promise<{ quizId: string }>
}) {
  const { quizId } = await params
  const supabase = getSupabaseAdmin()

  const { data: rawQuiz } = await supabase
    .from('quizzes')
    .select('id, title, type, week_number, max_score, leaderboard_visible, is_unlocked')
    .eq('id', quizId)
    .maybeSingle()
  const quiz = rawQuiz as any
  if (!quiz) notFound()

  const { data: rawAttempts } = await supabase
    .from('attempts')
    .select('id, user_id, final_score, time_taken_seconds, answers')
    .eq('quiz_id', quizId)
    .eq('is_leaderboard_attempt', true)
    .is('deleted_at', null)
    .eq('is_complete', true)
  const attempts = (rawAttempts ?? []) as any[]

  const { data: rawQuestions } = await supabase
    .from('questions')
    .select('id, question_text, correct_answer, order_index')
    .eq('quiz_id', quizId)
    .order('order_index', { ascending: true })
  const questions = (rawQuestions ?? []) as any[]

  // Miss-rate per question
  const missRates = questions.map(q => {
    let attemptedCount = 0
    let wrongCount = 0
    for (const a of attempts) {
      const ans = (a.answers ?? {}) as Record<string, string>
      if (q.id in ans) {
        attemptedCount += 1
        if (ans[q.id] !== q.correct_answer) wrongCount += 1
      } else {
        // Unanswered counts as wrong (server treats missing as wrong on submit)
        attemptedCount += 1
        wrongCount += 1
      }
    }
    const rate = attemptedCount > 0 ? (wrongCount / attemptedCount) * 100 : 0
    return { ...q, attemptedCount, wrongCount, rate }
  })

  // Score histogram — bucket by 10%
  const max = quiz.max_score ?? 0
  const buckets = Array.from({ length: 10 }, () => 0)
  for (const a of attempts) {
    if (max <= 0) continue
    const pct = Math.min(99, Math.max(0, Math.floor(((a.final_score ?? 0) / max) * 100)))
    const bucket = Math.min(9, Math.floor(pct / 10))
    buckets[bucket] += 1
  }
  const maxBucket = buckets.reduce((m, v) => Math.max(m, v), 1)

  // Avg time
  const totalTime = attempts.reduce((s, a) => s + (a.time_taken_seconds ?? 0), 0)
  const avgTime = attempts.length > 0 ? Math.round(totalTime / attempts.length) : 0

  // Practice engagement
  const completerIds = new Set(attempts.map(a => a.user_id))
  let practiceTotal = 0
  let practiceUserCount = 0
  if (completerIds.size > 0) {
    const { data: rawPc } = await supabase
      .from('practice_counters')
      .select('user_id, attempt_count')
      .eq('quiz_id', quizId)
      .in('user_id', Array.from(completerIds))
    for (const r of (rawPc ?? []) as any[]) {
      practiceTotal += r.attempt_count ?? 0
      if ((r.attempt_count ?? 0) > 0) practiceUserCount += 1
    }
  }
  const avgPracticePerCompleter =
    completerIds.size > 0 ? Math.round((practiceTotal / completerIds.size) * 10) / 10 : 0

  return (
    <div className="space-y-6">
      <header>
        <Link
          href="/admin/quizzes"
          className="inline-flex items-center gap-2 text-caption text-whitex-muted hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Quizzes
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-h1 font-bold text-white">
          <BarChart3 className="h-5 w-5 text-aurora-from" />
          {quiz.title}
        </h1>
        <p className="text-caption text-whitex-muted">
          Insights · {attempts.length} Attempt 1{attempts.length === 1 ? '' : 's'}
          {quiz.week_number ? ` · Week ${quiz.week_number}` : ''}
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Attempt 1s" value={attempts.length} />
        <Stat
          label="Avg score"
          value={
            attempts.length === 0 || max <= 0
              ? '—'
              : `${Math.round(
                  (attempts.reduce((s, a) => s + (a.final_score ?? 0), 0) / attempts.length / max) *
                    1000,
                ) / 10
                }%`
          }
        />
        <Stat label="Avg time" value={attempts.length === 0 ? '—' : formatDuration(avgTime)} />
        <Stat label="Avg practice / completer" value={avgPracticePerCompleter} />
      </section>

      <section>
        <h2 className="mb-3 text-h3 font-semibold text-white">Miss-rate heatmap</h2>
        {missRates.length === 0 ? (
          <p className="rounded-2xl border border-midnight-line bg-midnight-elevated p-6 text-caption text-whitex-muted">
            No questions or no attempts yet.
          </p>
        ) : (
          <div className="rounded-2xl border border-midnight-line bg-midnight-elevated p-3">
            <table className="w-full text-left text-caption">
              <thead>
                <tr className="border-b border-midnight-line text-micro uppercase tracking-wider text-whitex-faint">
                  <th className="px-3 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">Question</th>
                  <th className="w-20 px-3 py-2 text-right font-medium">Wrong %</th>
                  <th className="w-40 px-3 py-2 font-medium">Heat</th>
                </tr>
              </thead>
              <tbody>
                {missRates.map(q => {
                  const heat = `${Math.round(q.rate)}%`
                  // Color: green at low miss, amber 30-60, red 60+
                  const tone =
                    q.rate < 30
                      ? 'bg-emerald-500/30'
                      : q.rate < 60
                        ? 'bg-amber-500/40'
                        : 'bg-rose-500/50'
                  return (
                    <tr key={q.id} className="border-b border-midnight-line/60 last:border-0">
                      <td className="px-3 py-2 font-mono text-whitex-muted">
                        Q{q.order_index ?? ''}
                      </td>
                      <td className="px-3 py-2 text-whitex-soft">
                        <span className="line-clamp-2">{q.question_text}</span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-whitex-soft tabular-nums">
                        {Math.round(q.rate)}%
                      </td>
                      <td className="px-3 py-2">
                        <div className="h-2 overflow-hidden rounded-full bg-midnight-line">
                          <div
                            className={`h-full ${tone}`}
                            style={{ width: heat }}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-h3 font-semibold text-white">Score distribution</h2>
        {attempts.length === 0 || max <= 0 ? (
          <p className="rounded-2xl border border-midnight-line bg-midnight-elevated p-6 text-caption text-whitex-muted">
            No data yet.
          </p>
        ) : (
          <div className="rounded-2xl border border-midnight-line bg-midnight-elevated p-4">
            <div className="flex items-end justify-between gap-2">
              {buckets.map((count, i) => {
                const heightPct = (count / maxBucket) * 100
                return (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded bg-gradient-aurora"
                      style={{ height: `${Math.max(2, heightPct)}px` }}
                      title={`${count} attempt(s) in ${i * 10}–${(i + 1) * 10 - 1}%`}
                    />
                    <div className="font-mono text-micro text-whitex-faint">
                      {i * 10}–{i === 9 ? 100 : (i + 1) * 10 - 1}%
                    </div>
                    <div className="font-mono text-micro text-whitex-soft tabular-nums">
                      {count}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-h3 font-semibold text-white">Practice engagement</h2>
        <div className="rounded-2xl border border-midnight-line bg-midnight-elevated p-4 text-caption text-whitex-soft">
          {completerIds.size === 0 ? (
            <p className="text-whitex-muted">
              No completers yet — practice engagement will appear once Attempt 1s are submitted.
            </p>
          ) : (
            <p>
              <span className="font-mono font-bold tabular-nums">
                {practiceUserCount}
              </span>{' '}
              of {completerIds.size} completers have practiced this quiz at least once. Average
              practice attempts per completer:{' '}
              <span className="font-mono font-bold text-white tabular-nums">
                {avgPracticePerCompleter}
              </span>
              .
            </p>
          )}
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-midnight-line bg-midnight-elevated px-4 py-3">
      <div className="text-micro uppercase tracking-[0.18em] text-whitex-faint">{label}</div>
      <div className="mt-1 font-mono text-h2 font-bold text-white tabular-nums">{value}</div>
    </div>
  )
}
