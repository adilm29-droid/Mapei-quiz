import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Download, RotateCw, Trophy } from 'lucide-react'
import { getSession } from '@/lib/session'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { formatUaeDateTime, formatDuration } from '@/lib/utils/timezone'

export const dynamic = 'force-dynamic'

/**
 * /profile/attempts/[attemptId] — user-side detail view.
 *
 * Per CLAUDE_CODE_PROMPT.md §10: score breakdown ONLY — correct count,
 * time, leaderboard rank captured at completion. Does NOT show
 * per-question right/wrong on the user-side detail page (review screen
 * handled separately and is reachable from the results screen).
 */
export default async function MyAttemptDetailPage({
  params,
}: {
  params: Promise<{ attemptId: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/signin')

  const { attemptId } = await params
  const supabase = getSupabaseAdmin()

  const { data: rawAttempt } = await supabase
    .from('attempts')
    .select(
      'id, user_id, quiz_id, final_score, submitted_at, started_at, time_taken_seconds, xp_awarded, is_leaderboard_attempt, deleted_at, answers, ' +
        'quizzes!inner(id, title, max_score, week_number)',
    )
    .eq('id', attemptId)
    .maybeSingle()
  const attempt = rawAttempt as any
  if (!attempt) notFound()
  if (attempt.user_id !== session.userId) redirect('/profile/attempts')
  if (attempt.deleted_at) notFound()

  const quiz: any = attempt.quizzes
  const max = quiz.max_score ?? 0
  const pct = max > 0 ? Math.round(((attempt.final_score ?? 0) / max) * 100) : 0
  const dt = attempt.submitted_at ? formatUaeDateTime(attempt.submitted_at) : '—'
  const time = formatDuration(attempt.time_taken_seconds ?? 0)

  // Correct count — derive from answers map vs questions.correct_answer
  let correctCount = 0
  let totalQuestions = 0
  {
    const { data: questions } = await supabase
      .from('questions')
      .select('id, correct_answer')
      .eq('quiz_id', attempt.quiz_id)
    totalQuestions = (questions ?? []).length
    const answers = (attempt.answers ?? {}) as Record<string, string>
    for (const q of questions ?? []) {
      if (answers[q.id] === q.correct_answer) correctCount += 1
    }
  }

  // Leaderboard rank captured at completion = strictly-better + ties-faster + 1
  let rank: number | null = null
  let totalCompletions = 0
  if (attempt.is_leaderboard_attempt) {
    const { data: rows } = await supabase
      .from('attempts')
      .select('id, final_score, time_taken_seconds')
      .eq('quiz_id', attempt.quiz_id)
      .eq('is_leaderboard_attempt', true)
      .is('deleted_at', null)
      .eq('is_complete', true)
    totalCompletions = (rows ?? []).length
    const myScore = attempt.final_score ?? 0
    const myTime = attempt.time_taken_seconds ?? Number.MAX_SAFE_INTEGER
    let better = 0
    for (const r of rows ?? []) {
      if (r.id === attempt.id) continue
      const rs = r.final_score ?? 0
      const rt = r.time_taken_seconds ?? Number.MAX_SAFE_INTEGER
      if (rs > myScore) better += 1
      else if (rs === myScore && rt < myTime) better += 1
    }
    rank = better + 1
  }

  return (
    <div className="min-h-screen pb-12">
      <header className="sticky top-0 z-30 border-b border-midnight-line bg-midnight-base/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-4">
          <Link
            href="/profile/attempts"
            className="inline-flex items-center gap-2 text-caption text-whitex-muted hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Past attempts
          </Link>
          <span className="text-micro uppercase tracking-[0.3em] text-whitex-faint">Detail</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-5 py-8">
        <section>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-micro font-semibold uppercase tracking-wider text-amber-300 ring-1 ring-amber-400/30">
              <Trophy className="h-3 w-3" /> Leaderboard try
            </span>
            {quiz.week_number ? (
              <span className="text-micro uppercase tracking-wider text-whitex-faint">
                Week {quiz.week_number}
              </span>
            ) : null}
          </div>
          <h1 className="mt-2 text-h1 font-bold text-white">{quiz.title}</h1>
          <p className="mt-1 text-caption text-whitex-muted">{dt}</p>
        </section>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Score" value={`${attempt.final_score ?? 0}/${max}`} />
          <Stat label="Percent" value={`${pct}%`} />
          <Stat label="Correct" value={`${correctCount}/${totalQuestions}`} />
          <Stat label="Time" value={time} />
          {attempt.xp_awarded ? <Stat label="XP earned" value={`+${attempt.xp_awarded}`} /> : null}
          {rank ? <Stat label="Rank" value={`#${rank} / ${totalCompletions}`} /> : null}
        </section>

        <section className="flex flex-wrap gap-2">
          <a
            href={`/api/quiz/${attempt.id}/pdf?variant=user`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-midnight-line bg-midnight-elevated px-3 py-2 text-caption text-whitex-soft hover:bg-midnight-line"
          >
            <Download className="h-3.5 w-3.5" /> Download PDF
          </a>
          <Link
            href={`/quiz/${quiz.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-aurora px-3 py-2 text-caption font-semibold text-white hover:opacity-90"
          >
            <RotateCw className="h-3.5 w-3.5" /> Practice again
          </Link>
        </section>

        <section className="rounded-2xl border border-midnight-line bg-midnight-elevated p-5 text-caption text-whitex-muted">
          Per-question right/wrong breakdown isn&apos;t shown here. The PDF
          download includes the full answer key for the quiz; the
          questions you got wrong appear in the Mistakes carousel on
          your home screen so you can revisit them when ready.
        </section>
      </main>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-midnight-line bg-midnight-elevated px-4 py-3">
      <div className="text-micro uppercase tracking-[0.18em] text-whitex-faint">{label}</div>
      <div className="mt-1 font-mono text-h3 font-bold text-white tabular-nums">{value}</div>
    </div>
  )
}
