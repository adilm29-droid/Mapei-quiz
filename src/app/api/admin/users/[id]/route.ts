import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guard'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * PATCH /api/admin/users/[id]
 * Admin-only. Updates the editable fields of a user row.
 *
 * Accepted body keys (all optional, applied if present):
 *   firstName, lastName, email, role, status
 *
 * Username and password are NOT changeable here — username because it's
 * a stable identifier; password because it has its own dedicated route
 * that re-fires the welcome email.
 */
export async function PATCH(
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

  const update: Record<string, unknown> = {}

  if (typeof body.firstName === 'string') update.first_name = body.firstName.trim() || null
  if (typeof body.lastName === 'string') update.last_name = body.lastName.trim() || null

  if (typeof body.email === 'string') {
    const email = body.email.trim().toLowerCase()
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }
    update.email = email
  }

  if (body.role === 'admin' || body.role === 'staff') update.role = body.role
  if (
    body.status === 'pending' ||
    body.status === 'approved' ||
    body.status === 'rejected' ||
    body.status === 'suspended'
  ) {
    update.status = body.status
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No editable fields supplied' }, { status: 400 })
  }
  update.updated_at = new Date().toISOString()

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('users')
    .update(update)
    .eq('id', id)
    .select('id,username,email,first_name,last_name,role,status')
    .maybeSingle()

  if (error) {
    const msg = error.message || ''
    const isDup = msg.includes('duplicate') || msg.includes('unique')
    console.error('[admin/users/:id][PATCH]', error)
    return NextResponse.json(
      { error: isDup ? 'That email is already in use' : `Update failed: ${msg}` },
      { status: isDup ? 409 : 500 },
    )
  }
  if (!data) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }
  return NextResponse.json({ user: data })
}
