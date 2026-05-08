import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { hashPassword } from '@/lib/passwords'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * POST /api/admin/users — admin-only. Creates a user with status='approved'
 * (skipping the self-signup approval gate). Fires the 'account_created' email
 * with the credentials inline so the new user can log in immediately.
 */
export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : ''
  const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : ''
  const emailRaw = typeof body.email === 'string' ? body.email : ''
  const usernameRaw = typeof body.username === 'string' ? body.username : ''
  const tempPasswordRaw = typeof body.tempPassword === 'string' ? body.tempPassword : ''
  const role = body.role === 'admin' ? 'admin' : 'staff'

  if (!firstName || !lastName || !emailRaw || !usernameRaw || !tempPasswordRaw) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
  }

  const email = emailRaw.trim().toLowerCase()
  const username = usernameRaw.trim().toLowerCase()
  const tempPassword = tempPasswordRaw

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
  }
  if (tempPassword.length < 6) {
    return NextResponse.json(
      { error: 'Temp password must be at least 6 characters' },
      { status: 400 },
    )
  }

  let supabase
  try {
    supabase = getSupabaseAdmin()
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server misconfigured' }, { status: 500 })
  }

  const password_hash = await hashPassword(tempPassword)

  const { data: row, error: insertError } = await supabase
    .from('users')
    .insert([
      {
        first_name: firstName,
        last_name: lastName,
        email,
        username,
        password_hash,
        role,
        status: 'approved',
      },
    ])
    .select('id,username,email,first_name,last_name,role')
    .maybeSingle()

  if (insertError) {
    const msg = insertError.message || ''
    const isDup = msg.includes('duplicate') || msg.includes('unique')
    console.error('[admin/users] insert error:', insertError)
    return NextResponse.json(
      { error: isDup ? 'Username or email already exists' : `Could not create user: ${msg}` },
      { status: isDup ? 409 : 500 },
    )
  }

  // Fire welcome email with credentials (fire-and-forget)
  try {
    const origin = new URL(request.url).origin
    await fetch(`${origin}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'account_created',
        data: {
          email,
          first_name: firstName,
          username,
          temp_password: tempPassword,
          login_url: `${origin}/signin`,
        },
      }),
    }).catch(() => {})
  } catch {
    /* swallow — user is created either way */
  }

  return NextResponse.json({ user: row })
}
