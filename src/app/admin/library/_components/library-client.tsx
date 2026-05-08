'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronDown, Search, AlertTriangle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface QuestionWithQuiz {
  id: string
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: 'A' | 'B' | 'C' | 'D'
  explanation: string | null
  category: string | null
  difficulty: 'very_easy' | 'easy' | 'practical' | 'medium'
  points: number
  order_index: number
  quiz_id: string
  quiz_title: string
  quiz_week: number
}

const DIFFICULTY_ORDER = ['very_easy', 'easy', 'practical', 'medium'] as const
const DIFFICULTY_LABEL = {
  very_easy: 'Very Easy',
  easy: 'Easy',
  practical: 'Practical',
  medium: 'Medium',
} as const
const DIFFICULTY_TONE = {
  very_easy: 'success',
  easy: 'info',
  practical: 'warning',
  medium: 'glow',
} as const
const DIFFICULTY_GRADIENT = {
  very_easy: 'spring',
  easy: 'aurora',
  practical: 'sunset',
  medium: 'plasma',
} as const

export function LibraryClient({ questions }: { questions: QuestionWithQuiz[] }) {
  const [openDifficulty, setOpenDifficulty] = useState<Record<string, boolean>>({
    very_easy: true,
    easy: true,
    practical: true,
    medium: true,
  })
  const [openQuizSection, setOpenQuizSection] = useState<Record<string, boolean>>({})
  const [search, setSearch] = useState('')

  // Detect repeated questions: same question_text appearing in 2+ different quizzes.
  const repeatedTexts = useMemo(() => {
    const counts = new Map<string, Set<string>>()
    for (const q of questions) {
      const k = q.question_text.trim().toLowerCase()
      if (!counts.has(k)) counts.set(k, new Set())
      counts.get(k)!.add(q.quiz_id)
    }
    const set = new Set<string>()
    counts.forEach((quizSet, key) => {
      if (quizSet.size > 1) set.add(key)
    })
    return set
  }, [questions])

  // Group: difficulty → quiz_id → question[]
  const grouped = useMemo(() => {
    const out: Record<string, Record<string, { quizTitle: string; quizWeek: number; questions: QuestionWithQuiz[] }>> = {}
    for (const q of questions) {
      if (search) {
        const needle = search.toLowerCase()
        if (!q.question_text.toLowerCase().includes(needle)) continue
      }
      out[q.difficulty] ??= {}
      out[q.difficulty][q.quiz_id] ??= {
        quizTitle: q.quiz_title,
        quizWeek: q.quiz_week,
        questions: [],
      }
      out[q.difficulty][q.quiz_id].questions.push(q)
    }
    return out
  }, [questions, search])

  const totalCount = questions.length
  const filteredCount = useMemo(() => {
    let n = 0
    for (const d of DIFFICULTY_ORDER) {
      for (const quizId of Object.keys(grouped[d] ?? {})) {
        n += grouped[d][quizId].questions.length
      }
    }
    return n
  }, [grouped])

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-h1 font-semibold tracking-tight text-white">Library</h1>
          <p className="mt-1 text-caption text-whitex-muted">
            Every question across every quiz, grouped by difficulty.{' '}
            {search
              ? `Showing ${filteredCount} of ${totalCount} matching "${search}".`
              : `${totalCount} total · ${repeatedTexts.size} repeated`}
          </p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-whitex-faint" />
          <Input
            placeholder="Search question text…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="space-y-4">
        {DIFFICULTY_ORDER.map((d) => {
          const byQuiz = grouped[d] ?? {}
          const quizIds = Object.keys(byQuiz).sort(
            (a, b) => (byQuiz[b].quizWeek ?? 0) - (byQuiz[a].quizWeek ?? 0),
          )
          const totalForDifficulty = quizIds.reduce(
            (s, qid) => s + byQuiz[qid].questions.length,
            0,
          )

          if (totalForDifficulty === 0 && search) return null

          const isOpen = openDifficulty[d] ?? true
          return (
            <section
              key={d}
              className="overflow-hidden rounded-2xl border border-midnight-line bg-midnight-elevated/40 backdrop-blur"
            >
              <button
                onClick={() => setOpenDifficulty((s) => ({ ...s, [d]: !isOpen }))}
                className={cn(
                  'flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-midnight-line/30',
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`h-2.5 w-2.5 rounded-full bg-gradient-${DIFFICULTY_GRADIENT[d]}`}
                  />
                  <h2 className="text-h3 font-semibold text-white">{DIFFICULTY_LABEL[d]}</h2>
                  <Badge tone={DIFFICULTY_TONE[d]}>{totalForDifficulty}</Badge>
                </div>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-whitex-muted transition-transform',
                    isOpen && 'rotate-180',
                  )}
                />
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-3 border-t border-midnight-line/60 px-5 py-4">
                      {totalForDifficulty === 0 && (
                        <p className="text-caption text-whitex-muted">
                          No questions in this tier yet.
                        </p>
                      )}
                      {quizIds.map((quizId) => {
                        const { quizTitle, quizWeek, questions: qs } = byQuiz[quizId]
                        const sectionKey = `${d}/${quizId}`
                        const sectionOpen = openQuizSection[sectionKey] ?? true
                        return (
                          <div
                            key={quizId}
                            className="rounded-xl border border-midnight-line bg-midnight-deepest/40"
                          >
                            <button
                              onClick={() =>
                                setOpenQuizSection((s) => ({ ...s, [sectionKey]: !sectionOpen }))
                              }
                              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-midnight-line/30"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-micro tabular text-whitex-faint">
                                  W{quizWeek}
                                </span>
                                <span className="text-caption font-medium text-whitex-soft">
                                  {quizTitle}
                                </span>
                                <Badge tone="neutral">{qs.length}</Badge>
                              </div>
                              <ChevronDown
                                className={cn(
                                  'h-3.5 w-3.5 text-whitex-faint transition-transform',
                                  sectionOpen && 'rotate-180',
                                )}
                              />
                            </button>

                            <AnimatePresence initial={false}>
                              {sectionOpen && (
                                <motion.ul
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.18 }}
                                  className="space-y-2 overflow-hidden border-t border-midnight-line/60 px-4 py-3"
                                >
                                  {qs
                                    .slice()
                                    .sort((a, b) => a.order_index - b.order_index)
                                    .map((q) => {
                                      const repeated = repeatedTexts.has(
                                        q.question_text.trim().toLowerCase(),
                                      )
                                      const correctText =
                                        q.correct_answer === 'A'
                                          ? q.option_a
                                          : q.correct_answer === 'B'
                                          ? q.option_b
                                          : q.correct_answer === 'C'
                                          ? q.option_c
                                          : q.option_d
                                      return (
                                        <li
                                          key={q.id}
                                          className="rounded-lg border border-midnight-line/60 bg-midnight-deepest/40 p-3"
                                        >
                                          <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                              <p className="text-caption text-whitex-soft">
                                                <span className="mr-2 font-mono text-whitex-faint">
                                                  Q{q.order_index + 1}.
                                                </span>
                                                {q.question_text}
                                              </p>
                                              <p className="mt-1.5 text-micro text-whitex-faint">
                                                <span className="text-success">✓</span>{' '}
                                                <span className="text-whitex-muted">
                                                  {correctText}
                                                </span>
                                                {q.category && (
                                                  <span className="ml-3 text-whitex-faint">
                                                    · {q.category}
                                                  </span>
                                                )}
                                              </p>
                                            </div>
                                            <div className="flex shrink-0 items-center gap-1.5">
                                              {repeated && (
                                                <Badge tone="warning">
                                                  <AlertTriangle className="h-3 w-3" />
                                                  repeat
                                                </Badge>
                                              )}
                                              <span className="font-mono text-micro tabular text-whitex-faint">
                                                {q.points}pt
                                              </span>
                                            </div>
                                          </div>
                                        </li>
                                      )
                                    })}
                                </motion.ul>
                              )}
                            </AnimatePresence>
                          </div>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          )
        })}
      </div>
    </>
  )
}
