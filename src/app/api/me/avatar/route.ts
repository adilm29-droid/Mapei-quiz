import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth-guard'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { isValidAvatarUrl } from '@/lib/avatar-gallery'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/me/avatar
 * Body: { avatar_url: string | null }
 *
 * Sets the current user's avatar to one of the gallery images, or clears it
 * (null → falls back to initials placeholder). Validates against the static
 * gallery so users can't inject arbitrary URLs.
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

  const url = body.avatar_url
  if (url !== null && (typeof url !== 'string' || !isValidAvatarUrl(url))) {
    return NextResponse.json({ error: 'Avatar must be one of the gallery images' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('users')
    .update({ avatar_url: url, updated_at: new Date().toISOString() })
    .eq('id', session.userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, avatar_url: url })
}
