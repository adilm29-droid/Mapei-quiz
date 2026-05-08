'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Mistake {
  questionId: string
  question_text: string
  yourAnswerText: string
  correctAnswerText: string
  submittedAt: string
  reviewed: boolean
}

export function MistakesRow({ mistakes }: { mistakes: Mistake[] }) {
  const router = useRouter()
  const [showAll, setShowAll] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  const visible = useMemo(
    () => (showAll ? mistakes : mistakes.filter(m => !m.reviewed)),
    [mistakes, showAll],
  )
  const reviewedCount = mistakes.filter(m => m.reviewed).length

  async function markReviewed(qid: string) {
    setBusy(qid)
    const res = await fetch(`/api/me/mistakes/${qid}/reviewed`, { method: 'POST' })
    setBusy(null)
    if (!res.ok) {
      toast.error('Could not mark as reviewed')
      return
    }
    toast.success('Got it — moved to reviewed')
    router.refresh()
  }

  if (mistakes.length === 0) {
    return (
      <section>
        <h2 className="mb-3 text-micro uppercase tracking-[0.3em] text-whitex-faint">
          What you got wrong
        </h2>
        <div className="rounded-2xl border border-midnight-line bg-midnight-elevated/30 p-8 text-center text-caption text-whitex-muted backdrop-blur">
          🎯 Nothing to review — yet. Take your first quiz.
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-micro uppercase tracking-[0.3em] text-whitex-faint">
          What you got wrong{' '}
          <span className="ml-1 text-whitex-muted">
            ({visible.length}
            {reviewedCount > 0 && !showAll ? ` · ${reviewedCount} reviewed` : ''})
          </span>
        </h2>
        {reviewedCount > 0 && (
          <button
            onClick={() => setShowAll(s => !s)}
            className="text-micro uppercase tracking-wider text-whitex-faint transition-colors hover:text-whitex-soft"
          >
            {showAll ? 'Hide reviewed' : 'Show all'}
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-success/20 bg-success/5 p-8 text-center text-caption text-whitex-soft backdrop-blur">
          ✓ All caught up — every mistake is reviewed.
        </div>
      ) : (
        <div className="-mx-5 overflow-x-auto px-5 pb-2">
          <ul className="flex gap-3">
            {visible.map(m => (
              <li
                key={m.questionId}
                className={cn(
                  'group relative w-[280px] shrink-0 rounded-2xl border bg-midnight-elevated/40 p-4 backdrop-blur',
                  m.reviewed
                    ? 'border-midnight-line opacity-60'
                    : 'border-midnight-line',
                )}
              >
                <p className="mb-3 line-clamp-3 text-body text-whitex-soft">{m.question_text}</p>
                <div className="space-y-1.5 text-caption">
                  <div className="flex items-start gap-2">
                    <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-danger" />
                    <span className="text-whitex-muted">
                      <span className="text-whitex-faint">You: </span>
                      <span className="line-through">{m.yourAnswerText}</span>
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
                    <span className="text-whitex-soft">
                      <span className="text-whitex-faint">Correct: </span>
                      {m.correctAnswerText}
                    </span>
                  </div>
                </div>

                {!m.reviewed && (
                  <button
                    onClick={() => markReviewed(m.questionId)}
                    disabled={busy === m.questionId}
                    className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-midnight-line bg-midnight-deepest/60 px-3 py-1.5 text-micro font-medium uppercase tracking-wider text-whitex-muted transition-colors hover:border-success/50 hover:text-success disabled:opacity-50"
                  >
                    <Check className="h-3 w-3" />
                    {busy === m.questionId ? 'Saving…' : 'Got it'}
                  </button>
                )}
                {m.reviewed && (
                  <p className="mt-3 text-center text-micro uppercase tracking-wider text-success">
                    ✓ Reviewed
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
