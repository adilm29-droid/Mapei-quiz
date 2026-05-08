import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth-guard'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { computeScore } from '@/lib/scoring'
import { applyStreak } from '@/lib/streaks'
import { computeXpAward } from '@/lib/xp'
import { evaluateBadges } from '@/lib/badges'
import { originalLetterToSlot } from '@/lib/quiz-engine'
import type {
  AnswerLetter,
  AnswersMap,
  AttemptResultForClient,
  OptionOrdersMap,
  QuestionRow,
} from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/attempts/[id]/submit
 *
 * The orchestrator. Single source of truth for everything that happens at
 * quiz completion: scoring, XP award, streak update, badge eval, DB writes.
 * Returns a complete AttemptResultForClient payload that the results screen
 * uses to drive the orchestrated reveal animation.
 *
 * Idempotent — if the attempt is already submitted, returns the previously
 * computed payload without re-applying XP / streak / badges.
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireSession()
  if (guard instanceof NextResponse) return guard
  const session = guard
  const { id } = await context.params

  const supabase = getSupabaseAdmin()

  // 1. Fetch the attempt
  const { data: attempt, error: aErr } = await supabase
    .from('attempts')
    .select('*')
    .eq('id', id)
    .eq('user_id', session.userId)
    .maybeSingle()
  if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 })
  if (!attempt) return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })

  // 2. Already submitted? Return the cached result by recomputing the per-question breakdown.
  if (attempt.submitted_at && attempt.is_complete) {
    const cached = await buildCachedResult(supabase, attempt)
    return NextResponse.json(cached)
  }

  if (attempt.is_incomplete) {
    return NextResponse.json({ error: 'This attempt expired and cannot be submitted' }, { status: 410 })
  }

  // 3. Fetch all questions for the quiz (single round-trip)
  const { data: questions, error: qErr } = await supabase
    .from('questions')
    .select(
      'id, quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, category, difficulty, points, order_index, created_at',
    )
    .eq('quiz_id', attempt.quiz_id)
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 })
  if (!questions || questions.length === 0)
    return NextResponse.json({ error: 'No questions for this quiz' }, { status: 500 })

  const questionsById = new Map<string, QuestionRow>(
    (questions as QuestionRow[]).map(q => [q.id, q]),
  )
  const questionsInOrder: QuestionRow[] = (attempt.question_order as string[])
    .map(id => questionsById.get(id))
    .filter((q): q is QuestionRow => !!q)

  // 4. Authoritative server-side scoring
  const answers: AnswersMap = (attempt.answers ?? {}) as AnswersMap
  const breakdown = computeScore(questionsInOrder, answers)

  // 5. Persist final_score + flags
  const submittedAt = new Date().toISOString()
  const { error: updateAttemptErr } = await supabase
    .from('attempts')
    .update({
      final_score: breakdown.finalScore,
      is_complete: true,
      submitted_at: submittedAt,
    })
    .eq('id', attempt.id)
  if (updateAttemptErr) {
    console.error('[attempts/submit] update error:', updateAttemptErr)
    return NextResponse.json({ error: updateAttemptErr.message }, { status: 500 })
  }

  // 6. Fetch user for XP + streak math
  const { data: user, error: uErr } = await supabase
    .from('users')
    .select('id, xp, level, title, current_streak, longest_streak, streak_freezes, last_quiz_date')
    .eq('id', session.userId)
    .maybeSingle()
  if (uErr || !user) return NextResponse.json({ error: 'User row missing' }, { status: 500 })

  // 7. Apply streak (UAE-time aware)
  const streakOutcome = applyStreak({
    current_streak: user.current_streak ?? 0,
    longest_streak: user.longest_streak ?? 0,
    streak_freezes: user.streak_freezes ?? 0,
    last_quiz_date: user.last_quiz_date ?? null,
  })

  // 8. First-mover bonus — was this the first completion of this quiz?
  const { count: priorCompletes } = await supabase
    .from('attempts')
    .select('id', { count: 'exact', head: true })
    .eq('quiz_id', attempt.quiz_id)
    .eq('is_complete', true)
    .neq('id', attempt.id)
  const isFirstMover = (priorCompletes ?? 0) === 0

  // 9. Compute XP award
  const xp = computeXpAward({
    oldXp: user.xp ?? 0,
    correctCount: breakdown.correctCount,
    totalQuestions: breakdown.totalQuestions,
    isFirstMover,
    hitStreakMilestone: streakOutcome.hitMilestone,
  })

  // 10. Persist user gamification fields
  const { error: userUpdateErr } = await supabase
    .from('users')
    .update({
      xp: xp.newXp,
      level: xp.newLevel,
      title: xp.newTitle,
      current_streak: streakOutcome.current_streak,
      longest_streak: streakOutcome.longest_streak,
      streak_freezes: streakOutcome.streak_freezes,
      last_quiz_date: streakOutcome.last_quiz_date,
      updated_at: new Date().toISOString(),
    })
    .eq('id', session.userId)
  if (userUpdateErr) console.error('[attempts/submit] user update:', userUpdateErr)

  // 11. Badge evaluation
  const { data: priorAttempts } = await supabase
    .from('attempts')
    .select('id, final_score, attempt_number, quiz_id')
    .eq('user_id', session.userId)
    .eq('is_complete', true)
    .neq('id', attempt.id)

  const completedAttemptsBefore = (priorAttempts ?? []).length
  const previousAttemptForQuiz =
    (priorAttempts ?? []).find((a: any) => a.quiz_id === attempt.quiz_id) || null

  const { data: existingBadges } = await supabase
    .from('user_badges')
    .select('badges(code)')
    .eq('user_id', session.userId)
  const alreadyEarnedCodes = new Set<string>(
    (existingBadges ?? [])
      .map((row: any) => row.badges?.code)
      .filter(Boolean) as string[],
  )

  const newBadges = await evaluateBadges({
    supabase,
    userId: session.userId,
    attempt: {
      id: attempt.id,
      quiz_id: attempt.quiz_id,
      attempt_number: attempt.attempt_number,
      started_at: attempt.started_at,
      submitted_at: submittedAt,
      final_score: breakdown.finalScore,
      max_score: breakdown.maxScore,
      correctCount: breakdown.correctCount,
      totalQuestions: breakdown.totalQuestions,
    },
    streak: { current_streak: streakOutcome.current_streak },
    alreadyEarnedCodes,
    completedAttemptsBefore,
    previousAttemptForQuiz: previousAttemptForQuiz
      ? { final_score: previousAttemptForQuiz.final_score ?? 0 }
      : null,
  })

  // 12. Build per-question breakdown for the review screen (translate stored
  //     original letters back to display slots if the UI wants them).
  const optionOrders = attempt.option_orders as OptionOrdersMap
  const perQuestion: AttemptResultForClient['perQuestion'] = questionsInOrder.map(q => {
    const yourLetter: AnswerLetter | null = (answers[q.id] as AnswerLetter) ?? null
    const lookup = (l: AnswerLetter) => {
      if (l === 'A') return q.option_a
      if (l === 'B') return q.option_b
      if (l === 'C') return q.option_c
      return q.option_d
    }
    void optionOrders
    return {
      questionId: q.id,
      question_text: q.question_text,
      yourAnswer: yourLetter,
      yourAnswerText: yourLetter ? lookup(yourLetter) : null,
      correctAnswer: q.correct_answer,
      correctAnswerText: lookup(q.correct_answer),
      isCorrect: yourLetter === q.correct_answer,
      explanation: q.explanation,
    }
  })

  const payload: AttemptResultForClient = {
    attemptId: attempt.id,
    totalQuestions: breakdown.totalQuestions,
    finalScore: breakdown.finalScore,
    percent: breakdown.percent,
    perQuestion,
    xp: {
      delta: xp.delta,
      newXp: xp.newXp,
      leveledUp: xp.leveledUp,
      oldLevel: xp.oldLevel,
      newLevel: xp.newLevel,
      newTitle: xp.newTitle,
    },
    streak: {
      current: streakOutcome.current_streak,
      longest: streakOutcome.longest_streak,
      hitMilestone: streakOutcome.hitMilestone,
      freezeUsed: streakOutcome.freezeConsumed,
    },
    newBadges: newBadges.map(b => ({
      code: b.code,
      name: b.name,
      description: b.description,
      gradient: b.gradient,
    })),
  }

  return NextResponse.json(payload)
}

/** Recompute the result payload for an already-submitted attempt (idempotent fetch). */
async function buildCachedResult(supabase: any, attempt: any): Promise<AttemptResultForClient> {
  const { data: questions } = await supabase
    .from('questions')
    .select(
      'id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, difficulty, points',
    )
    .eq('quiz_id', attempt.quiz_id)

  const order: string[] = attempt.question_order
  const byId = new Map<string, any>((questions ?? []).map((q: any) => [q.id, q]))
  const inOrder = order.map(id => byId.get(id)).filter(Boolean)

  const answers = (attempt.answers ?? {}) as AnswersMap
  const lookup = (q: any, l: AnswerLetter) =>
    l === 'A' ? q.option_a : l === 'B' ? q.option_b : l === 'C' ? q.option_c : q.option_d

  const perQuestion = inOrder.map((q: any) => {
    const yours = (answers[q.id] as AnswerLetter) ?? null
    return {
      questionId: q.id,
      question_text: q.question_text,
      yourAnswer: yours,
      yourAnswerText: yours ? lookup(q, yours) : null,
      correctAnswer: q.correct_answer,
      correctAnswerText: lookup(q, q.correct_answer),
      isCorrect: yours === q.correct_answer,
      explanation: q.explanation,
    }
  })

  const totalQuestions = inOrder.length
  const finalScore = attempt.final_score ?? 0
  const maxScore = inOrder.reduce((s: number, q: any) => s + (q.points ?? 0), 0)
  const percent = maxScore === 0 ? 0 : Math.round((finalScore / maxScore) * 1000) / 10

  return {
    attemptId: attempt.id,
    totalQuestions,
    finalScore,
    percent,
    perQuestion,
    xp: { delta: 0, newXp: 0, leveledUp: false, oldLevel: 1, newLevel: 1, newTitle: '' },
    streak: { current: 0, longest: 0, hitMilestone: null, freezeUsed: false },
    newBadges: [],
  }
}

// Use originalLetterToSlot indirectly to avoid an unused import warning if the
// review UI wants to render slot labels rather than original letters later.
void originalLetterToSlot
