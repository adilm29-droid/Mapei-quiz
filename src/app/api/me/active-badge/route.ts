import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth-guard'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/me/active-badge
 *
 * Body: { badgeId: string | null }
 * Sets users.active_badge_id. Verifies the user actually owns that badge
 * (or null = no flair).
 */
export async function POST(request: Request) {
  const guard = await requireSession()
  if (guard instanceof NextResponse) return guard
  const session = guard

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const badgeId =
    typeof body.badgeId === 'string' ? body.badgeId : body.badgeId === null ? null : undefined
  if (badgeId === undefined) {
    return NextResponse.json({ error: 'badgeId required (or null to clear)' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  // Verify ownership
  if (badgeId) {
    const { data: owned } = await supabase
      .from('user_badges')
      .select('id')
      .eq('user_id', session.userId)
      .eq('badge_id', badgeId)
      .maybeSingle()
    if (!owned) {
      return NextResponse.json({ error: "You don't own this badge" }, { status: 403 })
    }
  }

  const { error } = await supabase
    .from('users')
    .update({ active_badge_id: badgeId, updated_at: new Date().toISOString() })
    .eq('id', session.userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, badgeId })
}
