import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/me — returns the currently logged-in user (full row) or 401.
 * Replaces the legacy localStorage-based "who am I" behavior for new pages.
 */
export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  let supabase
  try {
    supabase = getSupabaseAdmin()
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server misconfigured' }, { status: 500 })
  }

  const { data, error } = await supabase
    .from('users')
    .select('id,username,email,first_name,last_name,role,status,avatar_url,xp,level,title,current_streak,longest_streak,streak_freezes,active_badge_id,last_quiz_date,created_at')
    .eq('id', session.userId)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json({ user: data })
}
