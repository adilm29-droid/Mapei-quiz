import Link from 'next/link'
import { Trophy, Target } from 'lucide-react'
import { gradientFromString } from '@/lib/gradient-from-string'

/**
 * Netflix-style quiz cards per CLAUDE_CODE_PROMPT.md §16.
 *
 * Two sections:
 *   🏆 Ranked Quizzes — actual quizzes (locked/unlocked)
 *   🎯 Practice — practice quizzes
 *
 * Each card uses cover_image_url as background with a dark gradient
 * overlay; falls back to a deterministic gradient hashed from the
 * quiz id when no cover is set.
 *
 * Pure server component — accepts already-loaded quiz rows and the
 * set of quiz_ids the user has completed Attempt 1 on. The latter
 * decides whether the link goes to the regular quiz path or the
 * practice path (server gate decides authoritatively at submit; this
 * is just UI hint).
 */

export interface QuizCardItem {
  id: string
  title: string
  type: 'actual' | 'practice'
  week_number: number | null
  cover_image_url: string | null
  is_unlocked: boolean
  max_score: number | null
  question_count: number
}

export function QuizCards({
  actualQuizzes,
  practiceQuizzes,
  completedActualIds,
}: {
  actualQuizzes: QuizCardItem[]
  practiceQuizzes: QuizCardItem[]
  completedActualIds: Set<string>
}) {
  return (
    <div className="space-y-6">
      <Section
        title="Ranked Quizzes"
        icon={<Trophy className="h-4 w-4 text-amber-300" />}
        items={actualQuizzes}
        rankedHint
        completedActualIds={completedActualIds}
      />
      {practiceQuizzes.length > 0 ? (
        <Section
          title="Practice"
          icon={<Target className="h-4 w-4 text-aurora-from" />}
          items={practiceQuizzes}
          rankedHint={false}
          completedActualIds={completedActualIds}
        />
      ) : null}
    </div>
  )
}

function Section({
  title,
  icon,
  items,
  rankedHint,
  completedActualIds,
}: {
  title: string
  icon: React.ReactNode
  items: QuizCardItem[]
  rankedHint: boolean
  completedActualIds: Set<string>
}) {
  if (items.length === 0) return null
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-micro uppercase tracking-[0.3em] text-whitex-faint">
        {icon}
        {title}
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map(q => (
          <Card
            key={q.id}
            quiz={q}
            isRanked={rankedHint}
            isPracticeForUser={
              rankedHint ? completedActualIds.has(q.id) : false
            }
          />
        ))}
      </div>
    </section>
  )
}

// Minimal mapping for the inline gradient fallback. Tailwind tokens are
// the source of truth; this just lets the cover-fallback render without
// requiring a className-based variant.
const GRADIENT_STOPS: Record<string, [string, string]> = {
  aurora:   ['#3b82f6', '#8b5cf6'],
  sunset:   ['#ec4899', '#f97316'],
  champion: ['#f59e0b', '#fbbf24'],
  spring:   ['#10b981', '#22d3ee'],
  ember:    ['#ef4444', '#f97316'],
  plasma:   ['#a855f7', '#ec4899'],
}

function Card({
  quiz,
  isRanked,
  isPracticeForUser,
}: {
  quiz: QuizCardItem
  isRanked: boolean
  isPracticeForUser: boolean
}) {
  const fallbackName = gradientFromString(quiz.id)
  const stops = GRADIENT_STOPS[fallbackName] ?? GRADIENT_STOPS.aurora
  const bg = quiz.cover_image_url
    ? `url(${quiz.cover_image_url})`
    : `linear-gradient(135deg, ${stops[0]}, ${stops[1]})`

  const pillCopy = isRanked
    ? isPracticeForUser
      ? '🎯 Practice'
      : '🏆 Ranked'
    : '🎯 Practice'
  const pillCls = isRanked && !isPracticeForUser
    ? 'bg-amber-500/20 text-amber-200 ring-amber-400/40'
    : 'bg-aurora-from/20 text-aurora-from ring-aurora-from/40'

  return (
    <Link
      href={`/quiz/${quiz.id}`}
      className={
        'group relative flex h-44 flex-col justify-end overflow-hidden rounded-2xl border border-midnight-line bg-cover bg-center text-white transition-transform hover:-translate-y-0.5 sm:h-40 ' +
        (quiz.is_unlocked ? '' : 'opacity-60')
      }
      style={{ backgroundImage: bg }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
      <div className="relative z-10 flex flex-col gap-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <span
            className={
              'rounded-full px-2 py-0.5 text-micro font-semibold uppercase tracking-wider ring-1 ' +
              pillCls
            }
          >
            {pillCopy}
          </span>
          {quiz.week_number ? (
            <span className="text-micro uppercase tracking-wider text-white/70">
              Week {quiz.week_number}
            </span>
          ) : null}
        </div>
        <h3 className="text-h3 font-bold leading-tight drop-shadow">
          {quiz.title}
        </h3>
        <p className="text-caption text-white/75">
          {quiz.question_count} questions{quiz.max_score ? ` · max ${quiz.max_score}` : ''}
          {!quiz.is_unlocked ? ' · 🔒 locked' : ''}
        </p>
      </div>
    </Link>
  )
}
