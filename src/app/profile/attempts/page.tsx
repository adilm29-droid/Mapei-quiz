import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Download, RotateCw, Trophy } from 'lucide-react'
import { getSession } from '@/lib/session'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { formatUaeDateTime, formatDuration } from '@/lib/utils/timezone'

export const dynamic = 'force-dynamic'

/**
 * /profile/attempts — past attempts list for the signed-in user.
 *
 * Per CLAUDE_CODE_PROMPT.md §10: lists Attempt 1s only. Each row shows
 * quiz title, date, score, XP earned, achievements unlocked for that
 * quiz, "View report" (PDF) and "Practice again" actions.
 */
export default async function MyAttemptsPage() {
  const session = await getSession()
  if (!session) redirect('/signin')

  const supabase = getSupabaseAdmin()

  const { data: attempts } = await supabase
    .from('attempts')
    .select(
      'id, quiz_id, final_score, submitted_at, time_taken_seconds, xp_awarded, is_leaderboard_attempt, deleted_at, ' +
        'quizzes!inner(id, title, max_score, week_number)',
    )
    .eq('user_id', session.userId)
    .eq('is_leaderboard_attempt', true)
    .is('deleted_at', null)
    .eq('is_complete', true)
    .order('submitted_at', { ascending: false })

  // Achievements unlocked for these quizzes (per-quiz scope only)
  const achievementsByQuiz = new Map<string, { code: string; name: string; tier_color: string }[]>()
  if ((attempts ?? []).length > 0) {
    const { data: ua } = await supabase
      .from('user_achievements')
      .select('achievement_id, unlocked_at, achievements!inner(id, code, scope, name, tier_color, quiz_id)')
      .eq('user_id', session.userId)
    for (const row of (ua ?? []) as any[]) {
      const a = row.achievements
      if (a.scope !== 'per_quiz' || !a.quiz_id) continue
      const list = achievementsByQuiz.get(a.quiz_id) ?? []
      list.push({ code: a.code, name: a.name, tier_color: a.tier_color })
      achievementsByQuiz.set(a.quiz_id, list)
    }
  }

  return (
    <div className="min-h-screen pb-12">
      <header className="sticky top-0 z-30 border-b border-midnight-line bg-midnight-base/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-4">
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 text-caption text-whitex-muted hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Profile
          </Link>
          <span className="text-micro uppercase tracking-[0.3em] text-whitex-faint">
            Past attempts
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-5 py-8">
        {(attempts ?? []).length === 0 ? (
          <div className="rounded-2xl border border-midnight-line bg-midnight-elevated p-8 text-center text-caption text-whitex-muted">
            You haven&apos;t completed any quizzes yet. Take this week&apos;s quiz from{' '}
            <Link className="text-white underline" href="/home">
              Home
            </Link>
            .
          </div>
        ) : null}

        {(attempts ?? []).map((a: any) => {
          const quiz = a.quizzes
          const max = quiz.max_score ?? 0
          const pct = max > 0 ? Math.round(((a.final_score ?? 0) / max) * 100) : 0
          const dt = a.submitted_at ? formatUaeDateTime(a.submitted_at) : '—'
          const time = formatDuration(a.time_taken_seconds ?? 0)
          const ach = achievementsByQuiz.get(quiz.id) ?? []
          return (
            <article
              key={a.id}
              className="rounded-2xl border border-midnight-line bg-midnight-elevated p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
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
                  <h3 className="mt-1.5 text-h3 font-semibold text-white">{quiz.title}</h3>
                  <p className="mt-0.5 text-caption text-whitex-muted">{dt}</p>
                </div>
                <div className="text-right">
                  <div className="font-mono text-h2 font-bold text-white tabular-nums">
                    {a.final_score ?? 0}
                    <span className="text-h3 text-whitex-muted">/{max}</span>
                  </div>
                  <div className="text-caption text-whitex-muted">{pct}% · {time}</div>
                  {a.xp_awarded ? (
                    <div className="text-caption text-emerald-300">+{a.xp_awarded} XP</div>
                  ) : null}
                </div>
              </div>

              {ach.length > 0 ? (
                <ul className="mt-4 flex flex-wrap gap-1.5">
                  {ach.map(t => (
                    <li
                      key={t.code}
                      className="rounded-md bg-midnight-base px-2 py-1 text-micro uppercase tracking-wider text-whitex-soft ring-1 ring-midnight-line"
                    >
                      {t.name}
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/profile/attempts/${a.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-midnight-line bg-midnight-base px-3 py-1.5 text-caption text-whitex-soft hover:bg-midnight-line"
                >
                  Details
                </Link>
                <a
                  href={`/api/quiz/${a.id}/pdf?variant=user`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-midnight-line bg-midnight-base px-3 py-1.5 text-caption text-whitex-soft hover:bg-midnight-line"
                >
                  <Download className="h-3.5 w-3.5" /> View report
                </a>
                <Link
                  href={`/quiz/${quiz.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-aurora px-3 py-1.5 text-caption font-semibold text-white hover:opacity-90"
                >
                  <RotateCw className="h-3.5 w-3.5" /> Practice again
                </Link>
              </div>
            </article>
          )
        })}
      </main>
    </div>
  )
}
