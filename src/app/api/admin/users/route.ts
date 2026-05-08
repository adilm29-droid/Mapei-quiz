import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guard'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { hashPassword } from '@/lib/passwords'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * GET /api/admin/users — admin-only. Lists every user (no password hash).
 */
export async function GET() {
  const guard = await requireAdmin()
  if (guard instanceof NextResponse) return guard

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('users')
    .select(
      'id,username,email,first_name,last_name,role,status,xp,level,title,current_streak,longest_streak,last_quiz_date,created_at,updated_at',
    )
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[admin/users][GET]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ users: data ?? [] })
}

/**
 * POST /api/admin/users — admin-only. Creates a user with status='approved'
 * and sends the account_created email with the temp password inline.
 */
export async function POST(request: Request) {
  const guard = await requireAdmin()
  if (guard instanceof NextResponse) return guard

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

  const supabase = getSupabaseAdmin()
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
    console.error('[admin/users][POST]', insertError)
    return NextResponse.json(
      { error: isDup ? 'Username or email already exists' : `Could not create user: ${msg}` },
      { status: isDup ? 409 : 500 },
    )
  }

  // Fire-and-forget welcome email with credentials
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
    /* swallow */
  }

  return NextResponse.json({ user: row })
}
