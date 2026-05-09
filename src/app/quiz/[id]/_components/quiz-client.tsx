'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { GradientButton } from '@/components/ui/gradient-button'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/avatar/avatar'
import { cn } from '@/lib/utils'
import { Timer } from './timer'
import { TopBar } from './top-bar'
import { ProgressDots } from './progress-dots'
import { TimeUpModal } from './time-up-modal'
import type { AttemptStateForClient } from '@/lib/types'

type Slot = 'A' | 'B' | 'C' | 'D'

interface MeSummary {
  username: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
}

export function QuizClient({ quizId }: { quizId: string }) {
  const router = useRouter()
  const [state, setState] = useState<AttemptStateForClient | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Slot | null>(null)
  const [savingAnswer, setSavingAnswer] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [timeUp, setTimeUp] = useState(false)
  const [perQuestionElapsed, setPerQuestionElapsed] = useState(0)
  const startedQRef = useRef<string | null>(null)
  const [me, setMe] = useState<MeSummary | null>(null)

  // Fetch current user (for the corner avatar — visible during the quiz)
  useEffect(() => {
    let cancelled = false
    fetch('/api/me')
      .then(r => (r.ok ? r.json() : null))
      .then(body => {
        if (cancelled || !body?.user) return
        setMe({
          username: body.user.username,
          first_name: body.user.first_name,
          last_name: body.user.last_name,
          avatar_url: body.user.avatar_url,
        })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  // Start (or resume) the attempt
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await fetch(`/api/quizzes/${quizId}/start`, { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (cancelled) return
      if (!res.ok) {
        setError(body?.error || 'Could not start quiz')
        return
      }
      setState(body as AttemptStateForClient)
      setSelected((body as AttemptStateForClient).previouslySelected ?? null)
    })()
    return () => {
      cancelled = true
    }
  }, [quizId])

  // Per-question elapsed for the decorative top bar
  useEffect(() => {
    if (!state) return
    const currentId = state.current?.id ?? null
    if (startedQRef.current !== currentId) {
      startedQRef.current = currentId
      setPerQuestionElapsed(0)
    }
    const id = setInterval(() => setPerQuestionElapsed(e => e + 1), 1000)
    return () => clearInterval(id)
  }, [state?.current?.id])

  const goToIndex = useCallback(
    async (target: number, opts: { saveAnswer?: boolean } = {}) => {
      if (!state) return
      const idx = Math.max(0, Math.min(state.totalQuestions - 1, target))

      if (opts.saveAnswer && selected) {
        setSavingAnswer(true)
        await fetch(`/api/attempts/${state.attemptId}/answer`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questionId: state.current.id,
            selectedDisplaySlot: selected,
            advanceTo: idx,
          }),
        }).catch(() => {})
        setSavingAnswer(false)
      }

      const res = await fetch(`/api/attempts/${state.attemptId}?q=${idx}`)
      if (!res.ok) {
        if (res.status === 410) setTimeUp(true)
        return
      }
      const body = (await res.json()) as AttemptStateForClient
      setState(body)
      setSelected(body.previouslySelected ?? null)
    },
    [state, selected],
  )

  const submitAttempt = useCallback(
    async (saveCurrent: boolean) => {
      if (!state || submitting) return
      setSubmitting(true)
      if (saveCurrent && selected) {
        await fetch(`/api/attempts/${state.attemptId}/answer`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questionId: state.current.id,
            selectedDisplaySlot: selected,
          }),
        }).catch(() => {})
      }
      // Pass `claim` so the server can return 409 if a parallel tab beat
      // us to the leaderboard slot (per CLAUDE_CODE_PROMPT.md §11 race).
      const submitRes = await fetch(`/api/attempts/${state.attemptId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim: state.attempt_kind }),
      }).catch(() => null)
      if (submitRes && submitRes.status === 409) {
        // Parallel-tab race lost — surface and let the user re-route to
        // the practice path. The server has not mutated state.
        router.push(`/quiz/${quizId}?practice=1`)
        return
      }
      router.push(`/quiz/${quizId}/results?attempt=${state.attemptId}`)
    },
    [state, selected, submitting, router, quizId],
  )

  const onConfirmAndNext = () => {
    if (!state || !selected) return
    if (state.currentQuestionIndex < state.totalQuestions - 1) {
      goToIndex(state.currentQuestionIndex + 1, { saveAnswer: true })
    } else {
      submitAttempt(true)
    }
  }
  const onPrev = () => {
    if (!state || state.currentQuestionIndex === 0) return
    goToIndex(state.currentQuestionIndex - 1, { saveAnswer: !!selected })
  }
  const onTimeExpired = () => {
    if (timeUp || submitting) return
    setTimeUp(true)
    setTimeout(() => submitAttempt(true), 2000)
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-md rounded-2xl border border-danger/30 bg-danger/10 p-8 text-center">
          <p className="text-h3 font-semibold text-danger">Can't start quiz</p>
          <p className="mt-2 text-caption text-whitex-soft">{error}</p>
          <button
            onClick={() => router.push('/home')}
            className="mt-5 text-caption text-whitex-muted hover:text-white"
          >
            ← Back to home
          </button>
        </div>
      </div>
    )
  }
  if (!state) {
    return (
      <div className="flex min-h-screen items-center justify-center text-caption text-whitex-muted">
        Loading…
      </div>
    )
  }

  const q = state.current
  const isFinalQ = state.currentQuestionIndex === state.totalQuestions - 1

  return (
    <div className="relative min-h-screen pb-32">
      <TopBar elapsedSec={perQuestionElapsed} />

      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 pb-4 pt-7">
        <div className="flex items-center gap-3">
          {me && (
            <Avatar
              size="sm"
              username={me.username}
              first_name={me.first_name}
              last_name={me.last_name}
              src={me.avatar_url}
            />
          )}
          <p className="font-mono text-caption tabular text-whitex-muted">
            Q {state.currentQuestionIndex + 1} of {state.totalQuestions}
          </p>
          {state.attempt_kind === 'practice' ? (
            <span className="rounded-full bg-aurora-from/15 px-2 py-0.5 text-micro font-semibold uppercase tracking-wider text-aurora-from ring-1 ring-aurora-from/40">
              🎯 Practice
            </span>
          ) : (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-micro font-semibold uppercase tracking-wider text-amber-300 ring-1 ring-amber-400/40">
              🏆 Leaderboard try
            </span>
          )}
        </div>
        <Timer expiresAt={state.expiresAt} onExpired={onTimeExpired} />
      </div>

      <div className="mx-auto max-w-3xl px-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={q.id}
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
          >
            <div className="rounded-3xl border border-midnight-line bg-midnight-elevated/50 p-6 backdrop-blur sm:p-8">
              <p className="text-h2 font-semibold leading-snug text-whitex-soft">
                {q.question_text}
              </p>

              <div className="mt-6 flex flex-col gap-3">
                {q.options.map(({ slot, text }, i) => {
                  const isSelected = selected === slot
                  const letter = (['A', 'B', 'C', 'D'] as const)[i]
                  return (
                    <motion.button
                      key={slot}
                      type="button"
                      onClick={() => setSelected(slot as Slot)}
                      whileTap={{ scale: 0.99 }}
                      className={cn(
                        'group flex items-start gap-3.5 rounded-2xl border bg-midnight-deepest/60 p-4 text-left transition-all',
                        isSelected
                          ? 'border-info shadow-glow-aurora'
                          : 'border-midnight-line hover:-translate-y-0.5 hover:border-info/40',
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-caption font-bold tabular',
                          isSelected
                            ? 'border-transparent bg-gradient-aurora text-white'
                            : 'border-midnight-line text-whitex-muted',
                        )}
                      >
                        {letter}
                      </span>
                      <span className="text-body text-whitex-soft">{text}</span>
                    </motion.button>
                  )
                })}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        <ProgressDots
          total={state.totalQuestions}
          current={state.currentQuestionIndex}
          answered={new Set(state.answeredQuestionIds)}
        />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-midnight-line bg-midnight-base/80 px-5 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={onPrev}
            disabled={state.currentQuestionIndex === 0 || savingAnswer}
            className="text-whitex-muted hover:bg-midnight-line hover:text-white disabled:opacity-30"
          >
            <ArrowLeft className="mr-1 h-4 w-4" /> Previous
          </Button>

          <GradientButton
            gradient={isFinalQ ? 'champion' : 'aurora'}
            size="md"
            onClick={onConfirmAndNext}
            disabled={!selected || savingAnswer || submitting}
          >
            {submitting ? (
              'Submitting…'
            ) : isFinalQ ? (
              <>
                Submit quiz <Check className="h-4 w-4" />
              </>
            ) : (
              <>
                Confirm & next <ArrowRight className="h-4 w-4" />
              </>
            )}
          </GradientButton>
        </div>
      </div>

      <AnimatePresence>{timeUp && <TimeUpModal />}</AnimatePresence>
    </div>
  )
}
