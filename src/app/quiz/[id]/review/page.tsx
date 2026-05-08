import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Check, X } from 'lucide-react'
import { getSession } from '@/lib/session'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import type { AnswerLetter, AnswersMap } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ attempt?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/signin')
  const { id: quizId } = await params
  const sp = await searchParams
  if (!sp.attempt) redirect(`/quiz/${quizId}`)

  const supabase = getSupabaseAdmin()
  const { data: attempt } = await supabase
    .from('attempts')
    .select('id, user_id, quiz_id, question_order, answers, final_score')
    .eq('id', sp.attempt)
    .eq('user_id', session.userId)
    .maybeSingle()
  if (!attempt) redirect('/home')

  const { data: questions } = await supabase
    .from('questions')
    .select('id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, points, difficulty')
    .eq('quiz_id', quizId)

  const byId = new Map<string, any>((questions ?? []).map((q: any) => [q.id, q]))
  const order = (attempt.question_order as string[]).map(id => byId.get(id)).filter(Boolean)
  const answers: AnswersMap = (attempt.answers ?? {}) as AnswersMap

  const lookup = (q: any, l: AnswerLetter) =>
    l === 'A' ? q.option_a : l === 'B' ? q.option_b : l === 'C' ? q.option_c : q.option_d

  const correctCount = order.filter((q: any) => answers[q.id] === q.correct_answer).length
  const wrongCount = order.length - correctCount

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
          <div className="flex items-center gap-2 text-caption">
            <span className="text-whitex-soft tabular">{order.length} questions</span>
            <span className="text-whitex-faint">·</span>
            <span className="text-success tabular">{correctCount} correct</span>
            <span className="text-whitex-faint">·</span>
            <span className="text-danger tabular">{wrongCount} wrong</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-3 px-5 py-6">
        {order.map((q: any, i: number) => {
          const yours = answers[q.id] as AnswerLetter | undefined
          const isCorrect = yours === q.correct_answer
          return (
            <article
              key={q.id}
              className={`rounded-2xl border p-5 backdrop-blur ${
                isCorrect
                  ? 'border-success/20 bg-midnight-elevated/40'
                  : 'border-danger/30 bg-danger/[0.03]'
              }`}
            >
              <div className="mb-3 flex items-start gap-3">
                <span
                  className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                    isCorrect ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'
                  }`}
                >
                  {isCorrect ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                </span>
                <p className="flex-1 text-body font-medium text-whitex-soft">
                  <span className="mr-2 text-whitex-faint">Q{i + 1}.</span>
                  {q.question_text}
                </p>
                <span className="shrink-0 rounded-full border border-midnight-line bg-midnight-deepest/60 px-2 py-0.5 text-micro uppercase tracking-wider text-whitex-faint">
                  {q.difficulty.replace('_', ' ')} · {q.points}pt
                </span>
              </div>

              <div className="ml-9 space-y-1.5 text-caption">
                {!isCorrect && yours && (
                  <p className="text-whitex-muted">
                    <span className="text-whitex-faint">Your answer: </span>
                    <span className="line-through">{lookup(q, yours)}</span>
                  </p>
                )}
                {!yours && (
                  <p className="text-whitex-faint italic">No answer submitted</p>
                )}
                <p className={isCorrect ? 'text-success' : 'text-success'}>
                  <span className="text-whitex-faint">Correct: </span>
                  <span className="text-whitex-soft">{lookup(q, q.correct_answer)}</span>
                </p>
                {q.explanation && (
                  <p className="mt-3 text-whitex-muted leading-relaxed">{q.explanation}</p>
                )}
              </div>
            </article>
          )
        })}
      </main>
    </div>
  )
}
