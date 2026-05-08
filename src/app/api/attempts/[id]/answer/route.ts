import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth-guard'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { slotToOriginalLetter } from '@/lib/quiz-engine'
import type { AnswerLetter, OptionOrdersMap } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * PATCH /api/attempts/[id]/answer
 *
 * Body: { questionId, selectedDisplaySlot } where selectedDisplaySlot is
 *       'A'|'B'|'C'|'D' as shown to the user. Server translates to the
 *       original letter via the attempt's stored option_orders so scoring
 *       can compare directly with question.correct_answer.
 *
 * Body may also include: { advanceTo: number } to update current_question_index.
 *
 * Rejects if the attempt is submitted or expired.
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireSession()
  if (guard instanceof NextResponse) return guard
  const session = guard
  const { id } = await context.params

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const questionId = typeof body.questionId === 'string' ? body.questionId : null
  const slot = body.selectedDisplaySlot
  const advanceTo = typeof body.advanceTo === 'number' ? body.advanceTo : null

  if (!questionId || !['A', 'B', 'C', 'D'].includes(slot)) {
    return NextResponse.json({ error: 'questionId and selectedDisplaySlot required' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const { data: attempt, error } = await supabase
    .from('attempts')
    .select('id, user_id, expires_at, submitted_at, is_incomplete, option_orders, answers, question_order, current_question_index')
    .eq('id', id)
    .eq('user_id', session.userId)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!attempt) return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
  if (attempt.submitted_at) return NextResponse.json({ error: 'Attempt already submitted' }, { status: 400 })
  if (attempt.is_incomplete) return NextResponse.json({ error: 'Attempt is no longer active' }, { status: 400 })
  if (new Date(attempt.expires_at).getTime() < Date.now()) {
    await supabase.from('attempts').update({ is_incomplete: true }).eq('id', attempt.id)
    return NextResponse.json({ error: 'Attempt has expired' }, { status: 410 })
  }

  const order = attempt.question_order as string[]
  if (!order.includes(questionId)) {
    return NextResponse.json({ error: 'Question is not part of this attempt' }, { status: 400 })
  }

  const optionOrders = attempt.option_orders as OptionOrdersMap
  const orderForQ = optionOrders[questionId]
  if (!orderForQ) return NextResponse.json({ error: 'Option order missing' }, { status: 500 })

  const slotNum = (['A', 'B', 'C', 'D'] as const).indexOf(slot) + 1
  const originalLetter: AnswerLetter = slotToOriginalLetter(orderForQ, slotNum as 1 | 2 | 3 | 4)

  const newAnswers = { ...(attempt.answers ?? {}), [questionId]: originalLetter }
  let newIdx = attempt.current_question_index ?? 0
  if (advanceTo !== null && advanceTo >= 0 && advanceTo < order.length) {
    newIdx = advanceTo
  }

  const { error: updateErr } = await supabase
    .from('attempts')
    .update({ answers: newAnswers, current_question_index: newIdx })
    .eq('id', attempt.id)

  if (updateErr) {
    console.error('[attempts/answer] update error:', updateErr)
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    questionId,
    storedLetter: originalLetter,
    answeredQuestionIds: Object.keys(newAnswers),
    currentQuestionIndex: newIdx,
  })
}
