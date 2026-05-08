import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth-guard'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { questionToDisplay } from '@/lib/quiz-engine'
import type { AttemptStateForClient, OptionOrdersMap, QuestionRow, AnswerLetter } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const LETTERS: readonly AnswerLetter[] = ['A', 'B', 'C', 'D'] as const

/**
 * GET /api/attempts/[id]
 *
 * Resume — returns the active attempt state at the question the user was
 * last on (or a specific question via ?q=index).
 *
 * Auto-finalizes (sets is_incomplete=true) if expires_at has passed.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireSession()
  if (guard instanceof NextResponse) return guard
  const session = guard
  const { id } = await context.params

  const supabase = getSupabaseAdmin()
  const { data: attempt, error } = await supabase
    .from('attempts')
    .select('*')
    .eq('id', id)
    .eq('user_id', session.userId)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!attempt) return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })

  // Lazy expiry sweep — anything past expires_at without submit gets marked incomplete
  if (!attempt.submitted_at && new Date(attempt.expires_at).getTime() < Date.now()) {
    await supabase
      .from('attempts')
      .update({ is_incomplete: true })
      .eq('id', attempt.id)
    return NextResponse.json({ error: 'This attempt has expired', expired: true }, { status: 410 })
  }

  if (attempt.submitted_at) {
    return NextResponse.json({ error: 'This attempt is already submitted' }, { status: 400 })
  }

  // Optional ?q=<index> override
  const url = new URL(request.url)
  const qParam = url.searchParams.get('q')
  const order: string[] = attempt.question_order
  let idx = attempt.current_question_index ?? 0
  if (qParam !== null) {
    const parsed = parseInt(qParam, 10)
    if (!Number.isNaN(parsed) && parsed >= 0 && parsed < order.length) idx = parsed
  }
  idx = Math.max(0, Math.min(order.length - 1, idx))

  const currentQuestionId = order[idx]
  const { data: q } = await supabase
    .from('questions')
    .select('id, question_text, option_a, option_b, option_c, option_d, difficulty, points')
    .eq('id', currentQuestionId)
    .maybeSingle()

  const optionOrders = attempt.option_orders as OptionOrdersMap
  const display = q ? questionToDisplay(q as QuestionRow, optionOrders[currentQuestionId]) : null

  const previouslyLetter: AnswerLetter | null = attempt.answers?.[currentQuestionId] ?? null
  let previouslySelected: 'A' | 'B' | 'C' | 'D' | null = null
  if (previouslyLetter) {
    const slotIdx = optionOrders[currentQuestionId].indexOf(previouslyLetter)
    if (slotIdx >= 0) previouslySelected = LETTERS[slotIdx]
  }

  const payload: AttemptStateForClient = {
    attemptId: attempt.id,
    quizId: attempt.quiz_id,
    totalQuestions: order.length,
    currentQuestionIndex: idx,
    expiresAt: attempt.expires_at,
    timeRemainingMs: Math.max(0, new Date(attempt.expires_at).getTime() - Date.now()),
    current: display!,
    previouslySelected,
    answeredQuestionIds: Object.keys(attempt.answers ?? {}),
  }
  return NextResponse.json(payload)
}
