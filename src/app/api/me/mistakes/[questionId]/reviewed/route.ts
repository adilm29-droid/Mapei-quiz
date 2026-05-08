import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth-guard'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/me/mistakes/[questionId]/reviewed
 *
 * Marks a wrong question as "reviewed" — it then drops off the home
 * Mistakes carousel by default. Idempotent (UNIQUE on (user_id, question_id)).
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ questionId: string }> },
) {
  const guard = await requireSession()
  if (guard instanceof NextResponse) return guard
  const session = guard
  const { questionId } = await context.params

  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('reviewed_mistakes')
    .insert({ user_id: session.userId, question_id: questionId })

  // Duplicate-key violations are silently expected (idempotent)
  if (error && !/duplicate|unique/i.test(error.message)) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

/**
 * DELETE /api/me/mistakes/[questionId]/reviewed
 *
 * Un-marks a reviewed mistake. Used by the "Show all" toggle when the
 * user wants to see everything again.
 */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ questionId: string }> },
) {
  const guard = await requireSession()
  if (guard instanceof NextResponse) return guard
  const session = guard
  const { questionId } = await context.params

  const supabase = getSupabaseAdmin()
  await supabase
    .from('reviewed_mistakes')
    .delete()
    .eq('user_id', session.userId)
    .eq('question_id', questionId)

  return NextResponse.json({ ok: true })
}
