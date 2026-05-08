import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth-guard'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import {
  shuffle,
  shuffleOptionLetters,
  questionToDisplay,
  QUIZ_TIME_LIMIT_MS,
  FREE_ATTEMPT_CAP,
} from '@/lib/quiz-engine'
import type { OptionOrdersMap, QuestionRow, AttemptStateForClient } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/quizzes/[id]/start
 *
 * Behavior:
 *   - If the user has an active (unsubmitted, not-expired) attempt for this
 *     quiz, return that attempt's state (resume).
 *   - Else, check the user's attempt cap (2 + any granted access requests).
 *   - Create a new attempts row with shuffled question order + per-question
 *     option orders, expires_at = now + 30 min.
 *   - Return the first question + total + time remaining.
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireSession()
  if (guard instanceof NextResponse) return guard
  const session = guard
  const { id: quizId } = await context.params

  const supabase = getSupabaseAdmin()

  // 1. Confirm the quiz exists, is unlocked, not soft-deleted
  const { data: quiz, error: quizErr } = await supabase
    .from('quizzes')
    .select('id, title, is_unlocked, deleted_at, max_score')
    .eq('id', quizId)
    .maybeSingle()
  if (quizErr) return NextResponse.json({ error: quizErr.message }, { status: 500 })
  if (!quiz || quiz.deleted_at) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
  if (!quiz.is_unlocked) return NextResponse.json({ error: 'Quiz is not yet available' }, { status: 403 })

  // 2. Look for an active attempt
  const nowIso = new Date().toISOString()
  const { data: active } = await supabase
    .from('attempts')
    .select('*')
    .eq('user_id', session.userId)
    .eq('quiz_id', quizId)
    .is('submitted_at', null)
    .is('is_incomplete', false)
    .gt('expires_at', nowIso)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (active) {
    return NextResponse.json(await buildState(supabase, active))
  }

  // 3. Sweep this user's expired attempts
  await supabase
    .from('attempts')
    .update({ is_incomplete: true })
    .eq('user_id', session.userId)
    .is('submitted_at', null)
    .lt('expires_at', nowIso)

  // 4. Compute cap. Default 2; +1 per granted access_request for this quiz.
  const { count: completedCount } = await supabase
    .from('attempts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', session.userId)
    .eq('quiz_id', quizId)
    .or('is_complete.eq.true,is_incomplete.eq.true')

  const { count: grantedCount } = await supabase
    .from('access_requests')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', session.userId)
    .eq('quiz_id', quizId)
    .eq('status', 'granted')

  const cap = FREE_ATTEMPT_CAP + (grantedCount ?? 0)
  if ((completedCount ?? 0) >= cap) {
    return NextResponse.json(
      { error: 'You have used all attempts for this quiz. Request another from the admin.' },
      { status: 403 },
    )
  }

  // 5. Fetch all questions for the quiz
  const { data: rawQuestions, error: qErr } = await supabase
    .from('questions')
    .select('id, question_text, option_a, option_b, option_c, option_d, difficulty, points')
    .eq('quiz_id', quizId)
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 })
  if (!rawQuestions || rawQuestions.length === 0) {
    return NextResponse.json({ error: 'This quiz has no questions yet' }, { status: 400 })
  }

  // 6. Shuffle order + per-question option order
  const questionOrder = shuffle(rawQuestions.map(q => q.id))
  const optionOrders: OptionOrdersMap = {}
  for (const qId of questionOrder) optionOrders[qId] = shuffleOptionLetters()

  // 7. Insert the attempt
  const startedAt = new Date()
  const expiresAt = new Date(startedAt.getTime() + QUIZ_TIME_LIMIT_MS)
  const attemptNumber = (completedCount ?? 0) + 1

  const { data: created, error: insErr } = await supabase
    .from('attempts')
    .insert([
      {
        user_id: session.userId,
        quiz_id: quizId,
        attempt_number: attemptNumber,
        started_at: startedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        question_order: questionOrder,
        option_orders: optionOrders,
        current_question_index: 0,
        answers: {},
      },
    ])
    .select('*')
    .maybeSingle()

  if (insErr || !created) {
    console.error('[quizzes/start] insert error:', insErr)
    return NextResponse.json({ error: insErr?.message || 'Could not start attempt' }, { status: 500 })
  }

  return NextResponse.json(await buildState(supabase, created))
}

/** Builds the full client-state payload for an attempt row. */
async function buildState(supabase: any, attempt: any): Promise<AttemptStateForClient> {
  const order: string[] = attempt.question_order
  const idx = Math.max(0, Math.min(order.length - 1, attempt.current_question_index ?? 0))
  const currentQuestionId = order[idx]

  const { data: q } = await supabase
    .from('questions')
    .select('id, question_text, option_a, option_b, option_c, option_d, difficulty, points')
    .eq('id', currentQuestionId)
    .maybeSingle()

  const optionOrders = attempt.option_orders as OptionOrdersMap
  const display = q
    ? questionToDisplay(q as QuestionRow, optionOrders[currentQuestionId])
    : null

  // Translate stored original letter (in `answers`) back to display slot (A/B/C/D)
  const previouslySelectedLetter = attempt.answers?.[currentQuestionId] ?? null
  let previouslySelected: 'A' | 'B' | 'C' | 'D' | null = null
  if (previouslySelectedLetter) {
    const slotIdx = optionOrders[currentQuestionId].indexOf(previouslySelectedLetter)
    if (slotIdx >= 0) previouslySelected = (['A', 'B', 'C', 'D'] as const)[slotIdx]
  }

  const expiresAt = attempt.expires_at as string
  const timeRemainingMs = Math.max(
    0,
    new Date(expiresAt).getTime() - Date.now(),
  )

  return {
    attemptId: attempt.id,
    quizId: attempt.quiz_id,
    totalQuestions: order.length,
    currentQuestionIndex: idx,
    expiresAt,
    timeRemainingMs,
    current: display!,
    previouslySelected,
    answeredQuestionIds: Object.keys(attempt.answers ?? {}),
  }
}
