import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Download } from 'lucide-react'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { Avatar } from '@/components/avatar/avatar'
import { AvatarUploader } from './_components/avatar-uploader'

export const dynamic = 'force-dynamic'

/**
 * /admin/users/[userId] — minimal per-user report.
 *
 * Per Tarun's ask 2026-05-12: show ONLY user_id, name, score per attempt,
 * how many wrong, and which questions were wrong. No streak / XP / level /
 * practice / achievements / admin-actions noise.
 *
 * Auth handled at /admin/layout.
 */
export default async function AdminUserOverview({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const { userId } = await params
  const supabase = getSupabaseAdmin()

  const { data: rawUser } = await supabase
    .from('users')
    .select('id, username, first_name, last_name, avatar_url')
    .eq('id', userId)
    .maybeSingle()
  const user = rawUser as any
  if (!user) notFound()

  const { data: rawAttempts } = await supabase
    .from('attempts')
    .select(
      'id, quiz_id, final_score, submitted_at, answers, question_order, ' +
        'quizzes!inner(id, title, max_score, week_number)',
    )
    .eq('user_id', userId)
    .eq('is_leaderboard_attempt', true)
    .is('deleted_at', null)
    .eq('is_complete', true)
    .order('submitted_at', { ascending: false })
  const attempts = (rawAttempts ?? []) as any[]

  // Pull all questions for the quizzes we'll need
  const quizIds = Array.from(new Set(attempts.map(a => a.quiz_id)))
  const qById = new Map<string, any>()
  if (quizIds.length > 0) {
    const { data: questions } = await supabase
      .from('questions')
      .select('id, quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer')
      .in('quiz_id', quizIds)
    for (const q of questions ?? []) qById.set(q.id, q)
  }

  const fullName =
    [user.first_name, user.last_name].filter(Boolean).join(' ') || `@${user.username}`

  return (
    <div className="space-y-6">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-2 text-caption text-whitex-muted hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> All users
      </Link>

      <header className="flex flex-wrap items-center gap-4">
        <Avatar
          size="lg"
          username={user.username}
          first_name={user.first_name}
          last_name={user.last_name}
          src={user.avatar_url}
        />
        <div>
          <h1 className="text-h1 font-bold text-white">{fullName}</h1>
          <p className="mt-1 font-mono text-micro tabular text-whitex-faint">
            user_id: {user.id}
          </p>
        </div>
      </header>

      <section>
        <h2 className="mb-2 text-h3 font-semibold text-white">Profile picture</h2>
        <AvatarUploader userId={user.id} currentUrl={user.avatar_url} />
      </section>

      <section className="space-y-4">
        <h2 className="text-h3 font-semibold text-white">
          Attempts ({attempts.length})
        </h2>
        {attempts.length === 0 ? (
          <p className="rounded-2xl border border-midnight-line bg-midnight-elevated p-6 text-caption text-whitex-muted">
            No leaderboard attempts.
          </p>
        ) : (
          attempts.map(a => {
            const max = a.quizzes.max_score ?? 0
            const orderArr: string[] = (a.question_order ?? []) as string[]
            const ordered = orderArr.length
              ? orderArr
                  .map(id => qById.get(id))
                  .filter(q => q && q.quiz_id === a.quiz_id)
              : Array.from(qById.values()).filter(q => q.quiz_id === a.quiz_id)
            const answers = (a.answers ?? {}) as Record<string, 'A' | 'B' | 'C' | 'D'>
            const wrong = ordered.filter(
              (q: any) => answers[q.id] !== q.correct_answer,
            )
            const pct = max > 0 ? Math.round(((a.final_score ?? 0) / max) * 100) : 0

            return (
              <article
                key={a.id}
                className="space-y-3 rounded-2xl border border-midnight-line bg-midnight-elevated p-5"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h3 className="text-h3 font-semibold text-white">
                    <Link
                      href={`/admin/users/${userId}/attempts/${a.id}`}
                      className="hover:underline"
                    >
                      {a.quizzes.title}
                    </Link>
                  </h3>
                  <a
                    href={`/api/quiz/${a.id}/pdf?variant=admin`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded border border-midnight-line bg-midnight-base px-2 py-1 text-micro text-whitex-soft hover:bg-midnight-line"
                  >
                    <Download className="h-3 w-3" /> PDF
                  </a>
                </div>

                <div className="flex flex-wrap items-center gap-6 font-mono text-caption tabular">
                  <span>
                    <span className="text-whitex-faint">Score:</span>{' '}
                    <span className="text-white">
                      {a.final_score ?? 0} / {max}
                    </span>{' '}
                    <span className="text-whitex-muted">({pct}%)</span>
                  </span>
                  <span>
                    <span className="text-whitex-faint">Wrong:</span>{' '}
                    <span className={wrong.length === 0 ? 'text-emerald-300' : 'text-rose-300'}>
                      {wrong.length}
                    </span>
                  </span>
                </div>

                {wrong.length > 0 && (
                  <ul className="space-y-2 border-t border-midnight-line pt-3">
                    {wrong.map((q: any, i: number) => {
                      const pick = answers[q.id]
                      const correctText =
                        (q as any)['option_' + q.correct_answer.toLowerCase()]
                      const pickText = pick
                        ? (q as any)['option_' + pick.toLowerCase()]
                        : null
                      return (
                        <li
                          key={q.id}
                          className="rounded-lg border border-rose-400/20 bg-rose-500/5 p-3"
                        >
                          <p className="text-caption font-semibold text-whitex-soft">
                            {i + 1}. {q.question_text}
                          </p>
                          <p className="mt-1 text-micro text-rose-300">
                            User picked {pick ?? '—'}
                            {pickText ? `: ${pickText}` : ''}
                          </p>
                          <p className="text-micro text-emerald-300">
                            Correct {q.correct_answer}: {correctText}
                          </p>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </article>
            )
          })
        )}
      </section>
    </div>
  )
}
