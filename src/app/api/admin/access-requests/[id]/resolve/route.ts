import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guard'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/access-requests/[id]/resolve
 *
 * Body: { decision: 'granted' | 'denied' }
 * Sets the request's status, resolved_at, resolved_by; emails the user.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin()
  if (guard instanceof NextResponse) return guard
  const session = guard
  const { id } = await context.params

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  if (body?.decision !== 'granted' && body?.decision !== 'denied') {
    return NextResponse.json({ error: 'decision must be granted or denied' }, { status: 400 })
  }
  const decision: 'granted' | 'denied' = body.decision

  const supabase = getSupabaseAdmin()
  const { data: req } = await supabase
    .from('access_requests')
    .select(
      'id, status, user_id, quiz_id, users!inner(email, first_name, username), quizzes!inner(title)',
    )
    .eq('id', id)
    .maybeSingle()
  if (!req) return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  if ((req as any).status !== 'pending') {
    return NextResponse.json({ error: 'Already resolved' }, { status: 400 })
  }

  const { error } = await supabase
    .from('access_requests')
    .update({
      status: decision,
      resolved_at: new Date().toISOString(),
      resolved_by: session.userId,
    })
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Email the user (fire-and-forget)
  try {
    const origin = new URL(request.url).origin
    const user = (req as any).users
    const quiz = (req as any).quizzes
    await fetch(`${origin}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'access_request_resolved',
        data: {
          email: user.email,
          first_name: user.first_name || user.username,
          quiz_title: quiz.title,
          granted: decision === 'granted',
          quiz_url: `${origin}/home`,
        },
      }),
    }).catch(() => {})
  } catch {
    /* swallow */
  }

  return NextResponse.json({ ok: true, status: decision })
}
