import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guard'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** POST /api/admin/quizzes/[id]/unlock — toggles is_unlocked. */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin()
  if (guard instanceof NextResponse) return guard
  const { id } = await context.params

  const supabase = getSupabaseAdmin()
  const { data: q } = await supabase
    .from('quizzes')
    .select('is_unlocked')
    .eq('id', id)
    .maybeSingle()
  if (!q) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })

  const next = !q.is_unlocked
  const { error } = await supabase
    .from('quizzes')
    .update({
      is_unlocked: next,
      unlocked_at: next ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ is_unlocked: next })
}
