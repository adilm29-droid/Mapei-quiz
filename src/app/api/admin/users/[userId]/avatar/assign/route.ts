import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guard'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { AVATAR_GALLERY } from '@/lib/avatar-gallery'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/users/[userId]/avatar/assign
 * body: { url: string }
 *
 * Sets a user's avatar to an existing image (no new upload). The URL
 * must either belong to the static gallery under /public/avatars/ OR
 * to the `avatars` storage bucket. Anything else is rejected so admins
 * can't point a user at an arbitrary remote image.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  const guard = await requireAdmin()
  if (guard instanceof NextResponse) return guard
  const adminSession = guard

  const { userId } = await context.params
  const supabase = getSupabaseAdmin()

  let url: string
  try {
    const body = await request.json()
    url = typeof body?.url === 'string' ? body.url.trim() : ''
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  if (!url) return NextResponse.json({ error: '`url` is required' }, { status: 400 })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const isStatic = (AVATAR_GALLERY as readonly string[]).includes(url)
  const bucketPrefix = `${supabaseUrl}/storage/v1/object/public/avatars/`
  const isBucket = supabaseUrl && url.startsWith(bucketPrefix)

  if (!isStatic && !isBucket) {
    return NextResponse.json(
      { error: 'URL must come from the static gallery or the avatars bucket' },
      { status: 400 },
    )
  }

  const { error: updErr } = await supabase
    .from('users')
    .update({ avatar_url: url, updated_at: new Date().toISOString() })
    .eq('id', userId)
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 })
  }

  await supabase.from('admin_actions').insert({
    admin_user_id: adminSession.userId,
    affected_user_id: userId,
    action_type: 'avatar_assign',
    payload: { avatar_url: url, source: isStatic ? 'static' : 'bucket' },
  })

  return NextResponse.json({ data: { avatar_url: url }, error: null })
}
