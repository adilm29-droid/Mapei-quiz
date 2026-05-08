import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guard'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { hashPassword } from '@/lib/passwords'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/users/[id]/reset-password
 * Admin-only. Sets a new temp password (server hashes with bcrypt) and
 * re-fires the account_created email so the user receives their new
 * credentials inline. Username does not change.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin()
  if (guard instanceof NextResponse) return guard
  const { id } = await context.params

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const tempPassword = typeof body.tempPassword === 'string' ? body.tempPassword : ''
  if (tempPassword.length < 6) {
    return NextResponse.json(
      { error: 'Temp password must be at least 6 characters' },
      { status: 400 },
    )
  }

  const supabase = getSupabaseAdmin()
  const password_hash = await hashPassword(tempPassword)

  const { data, error } = await supabase
    .from('users')
    .update({ password_hash, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id,username,email,first_name,last_name')
    .maybeSingle()

  if (error) {
    console.error('[admin/users/:id/reset-password]', error)
    return NextResponse.json({ error: `Reset failed: ${error.message}` }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Fire-and-forget email with the new credentials
  try {
    const origin = new URL(request.url).origin
    await fetch(`${origin}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'account_created',
        data: {
          email: data.email,
          first_name: data.first_name,
          username: data.username,
          temp_password: tempPassword,
          login_url: `${origin}/signin`,
        },
      }),
    }).catch(() => {})
  } catch {
    /* swallow */
  }

  return NextResponse.json({ user: data })
}
