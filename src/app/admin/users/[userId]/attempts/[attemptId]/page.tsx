import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Download } from 'lucide-react'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { ResetAttemptButton } from './_components/reset-attempt-button'

export const dynamic = 'force-dynamic'

/**
 * /admin/users/[userId]/attempts/[attemptId] — minimal admin per-attempt
 * view.
 *
 * Per Tarun's ask 2026-05-12: show ONLY user_id, name, score, wrong count,
 * and the wrong questions themselves (with the user's pick and the
 * correct answer). Admin PDF + Reset attempt remain as actionable
 * controls; everything else (IP, UA, timestamps, XP, time taken) is
 * removed from this view — fetch from the PDF if needed.
 *
 * Auth handled at /admin/layout (requireAdmin redirects).
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
      'id, user_id, quiz_id, final_score, deleted_at, is_leaderboard_attempt, answers, question_order, ' +
        'quizzes!inner(id, title, max_score), users!inner(id, username, first_name, last_name)',
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
    .select('id, question_text, option_a, option_b, option_c, option_d, correct_answer')
    .eq('quiz_id', attempt.quiz_id)

  const orderArr: string[] = (attempt.question_order ?? []) as string[]
  const qById = new Map<string, any>((questions ?? []).map(q => [q.id, q]))
  const ordered = orderArr.length
    ? orderArr.map(id => qById.get(id)).filter(Boolean)
    : (questions ?? [])
  const answers = (attempt.answers ?? {}) as Record<string, 'A' | 'B' | 'C' | 'D'>

  const fullName =
    [user.first_name, user.last_name].filter(Boolean).join(' ') || `@${user.username}`

  const wrong = ordered.filter((q: any) => answers[q.id] !== q.correct_answer)

  return (
    <div className="min-h-screen pb-12">
      <header className="sticky top-0 z-30 border-b border-midnight-line bg-midnight-base/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-5 py-4">
          <Link
            href={`/admin/users/${userId}`}
            className="inline-flex items-center gap-2 text-caption text-whitex-muted hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <span className="text-micro uppercase tracking-[0.3em] text-whitex-faint">
            Admin · Attempt
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-5 py-8">
        <section className="space-y-1">
          <h1 className="text-h1 font-bold text-white">{quiz.title}</h1>
          <p className="text-caption text-whitex-soft">{fullName}</p>
          <p className="font-mono text-micro tabular text-whitex-faint">
            user_id: {user.id}
          </p>
        </section>

        <section className="flex flex-wrap items-center gap-6 rounded-2xl border border-midnight-line bg-midnight-elevated px-5 py-3 font-mono text-caption tabular">
          <span>
            <span className="text-whitex-faint">Score:</span>{' '}
            <span className="text-white">
              {attempt.final_score ?? 0} / {max}
            </span>{' '}
            <span className="text-whitex-muted">({pct}%)</span>
          </span>
          <span>
            <span className="text-whitex-faint">Wrong:</span>{' '}
            <span className={wrong.length === 0 ? 'text-emerald-300' : 'text-rose-300'}>
              {wrong.length}
            </span>
          </span>
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
          <ResetAttemptButton
            userId={userId}
            quizId={attempt.quiz_id}
            isLeaderboard={!!attempt.is_leaderboard_attempt}
            alreadyDeleted={!!attempt.deleted_at}
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-h3 font-semibold text-white">
            Wrong questions ({wrong.length})
          </h2>
          {wrong.length === 0 ? (
            <p className="rounded-2xl border border-emerald-400/30 bg-emerald-500/5 p-6 text-center text-caption text-emerald-300">
              Perfect score — no wrong answers.
            </p>
          ) : (
            wrong.map((q: any, i: number) => {
              const pick = answers[q.id]
              const opts: { letter: 'A' | 'B' | 'C' | 'D'; text: string }[] = [
                { letter: 'A', text: q.option_a },
                { letter: 'B', text: q.option_b },
                { letter: 'C', text: q.option_c },
                { letter: 'D', text: q.option_d },
              ]
              return (
                <article
                  key={q.id}
                  className="rounded-2xl border border-rose-400/30 bg-rose-500/5 p-4"
                >
                  <div className="text-micro uppercase tracking-wider text-rose-300">
                    Wrong · Q{i + 1}
                  </div>
                  <p className="mt-2 text-body font-semibold text-white">
                    {q.question_text}
                  </p>
                  <ul className="mt-3 space-y-1.5">
                    {opts.map(o => {
                      const isCorrect = o.letter === q.correct_answer
                      const isPick = o.letter === pick
                      let cls =
                        'flex gap-3 rounded-lg border border-midnight-line bg-midnight-base px-3 py-2 text-caption text-whitex-soft'
                      if (isCorrect) {
                        cls =
                          'flex gap-3 rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-caption text-emerald-100'
                      } else if (isPick) {
                        cls =
                          'flex gap-3 rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-caption text-rose-100'
                      }
                      return (
                        <li key={o.letter} className={cls}>
                          <span className="font-mono font-bold">{o.letter}.</span>
                          <span className="flex-1">{o.text}</span>
                          {isCorrect && (
                            <span className="text-micro uppercase tracking-wider text-emerald-300">
                              correct
                            </span>
                          )}
                          {isPick && !isCorrect && (
                            <span className="text-micro uppercase tracking-wider text-rose-300">
                              picked
                            </span>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </article>
              )
            })
          )}
        </section>
      </main>
    </div>
  )
}
