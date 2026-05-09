import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guard'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { processAndUploadAvatar, AvatarValidationError } from '@/lib/storage/avatars'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/users/[userId]/avatar
 * multipart/form-data with file field "avatar".
 *
 * Per CLAUDE_CODE_PROMPT.md §15. Admin-only file upload — runs the
 * sharp pipeline (magic-byte validation → 512×512 webp q85) and stores
 * to the public `avatars` bucket. Updates users.avatar_url with a
 * cache-busted public URL.
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

  let buffer: Buffer
  let mime: string | undefined
  try {
    const form = await request.formData()
    const file = form.get('avatar')
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: '`avatar` field is required' }, { status: 400 })
    }
    mime = file.type || undefined
    buffer = Buffer.from(await file.arrayBuffer())
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Invalid form data' }, { status: 400 })
  }

  try {
    const { avatar_url } = await processAndUploadAvatar(supabase, userId, buffer, mime)
    await supabase
      .from('users')
      .update({ avatar_url, updated_at: new Date().toISOString() })
      .eq('id', userId)
    await supabase.from('admin_actions').insert({
      admin_user_id: adminSession.userId,
      affected_user_id: userId,
      action_type: 'avatar_upload',
      payload: { avatar_url },
    })
    return NextResponse.json({ data: { avatar_url }, error: null })
  } catch (e: any) {
    if (e instanceof AvatarValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 })
    }
    console.error('[admin/avatar] error:', e)
    return NextResponse.json({ error: e?.message || 'Upload failed' }, { status: 500 })
  }
}
