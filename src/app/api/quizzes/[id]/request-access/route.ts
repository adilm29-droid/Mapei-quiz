import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth-guard'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/quizzes/[id]/request-access
 *
 * User has used both attempts and wants a 3rd. Creates a pending access_request
 * and emails the admin (fire-and-forget). Idempotent — duplicate pending
 * requests for the same user+quiz get coalesced.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireSession()
  if (guard instanceof NextResponse) return guard
  const session = guard
  const { id: quizId } = await context.params

  const supabase = getSupabaseAdmin()

  // Existing pending request? Just say "already requested."
  const { data: existing } = await supabase
    .from('access_requests')
    .select('id, status')
    .eq('user_id', session.userId)
    .eq('quiz_id', quizId)
    .eq('status', 'pending')
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ ok: true, alreadyRequested: true })
  }

  const { data: req, error } = await supabase
    .from('access_requests')
    .insert([{ user_id: session.userId, quiz_id: quizId, status: 'pending' }])
    .select('id')
    .maybeSingle()

  if (error || !req) {
    console.error('[quizzes/request-access] insert error:', error)
    return NextResponse.json({ error: error?.message || 'Could not file request' }, { status: 500 })
  }

  // Fire admin notification (no buttons yet — admin Requests tab handles approve/deny)
  try {
    const origin = new URL(request.url).origin
    const { data: user } = await supabase
      .from('users')
      .select('first_name, last_name, username, email')
      .eq('id', session.userId)
      .maybeSingle()
    const { data: quiz } = await supabase.from('quizzes').select('title').eq('id', quizId).maybeSingle()

    if (user && quiz) {
      // Reuse the new_registration shape — we'll add a dedicated template later.
      await fetch(`${origin}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'new_registration',
          data: {
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            username: `${user.username} — wants attempt 3 on "${quiz.title}"`,
          },
        }),
      }).catch(() => {})
    }
  } catch {
    /* swallow */
  }

  return NextResponse.json({ ok: true, requestId: req.id })
}
