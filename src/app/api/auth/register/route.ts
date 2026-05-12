import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { hashPassword } from '@/lib/passwords'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface RegisterPayload {
  firstName?: unknown
  lastName?: unknown
  email?: unknown
  username?: unknown
  password?: unknown
}

export async function POST(request: Request) {
  let body: RegisterPayload
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : ''
  const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : ''
  const emailRaw = typeof body.email === 'string' ? body.email : ''
  const usernameRaw = typeof body.username === 'string' ? body.username : ''
  const passwordRaw = typeof body.password === 'string' ? body.password : ''

  if (!firstName || !lastName || !emailRaw || !usernameRaw || !passwordRaw) {
    return NextResponse.json({ error: 'Please fill in all fields' }, { status: 400 })
  }

  const email = emailRaw.trim().toLowerCase()
  const username = usernameRaw.trim().toLowerCase()
  const password = passwordRaw.trim()

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: 'Password must be at least 6 characters' },
      { status: 400 },
    )
  }

  let supabase
  try {
    supabase = getSupabaseAdmin()
  } catch (e: any) {
    console.error('[auth/register] config error:', e?.message)
    return NextResponse.json(
      { error: e?.message || 'Server misconfigured' },
      { status: 500 },
    )
  }

  // Hash the password BEFORE the insert
  let password_hash: string
  try {
    password_hash = await hashPassword(password)
  } catch (e: any) {
    console.error('[auth/register] hash error:', e?.message)
    return NextResponse.json({ error: 'Could not secure password' }, { status: 500 })
  }

  let insertError: any = null
  let insertedUserId: string | null = null
  try {
    const result = await supabase
      .from('users')
      .insert([
        {
          first_name: firstName,
          last_name: lastName,
          email,
          username,
          password_hash,
          role: 'staff',
          status: 'pending',
        },
      ])
      .select('id')
      .maybeSingle()
    insertError = result.error
    insertedUserId = result.data?.id ?? null
  } catch (thrown: any) {
    const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '<missing>'
    console.error('[auth/register] network/throw:', thrown?.message, 'url=', supaUrl)
    return NextResponse.json(
      {
        error:
          'Cannot reach database. Check that NEXT_PUBLIC_SUPABASE_URL is set on Vercel ' +
          'and matches your Supabase project, and that the project is not paused. ' +
          `(detail: ${thrown?.message || 'unknown'})`,
      },
      { status: 502 },
    )
  }

  if (insertError) {
    const msg = insertError.message || ''
    const isDup = msg.includes('duplicate') || msg.includes('unique')
    console.error('[auth/register] supabase error:', insertError)
    return NextResponse.json(
      { error: isDup ? 'Username already exists' : `Registration failed: ${msg}` },
      { status: isDup ? 409 : 500 },
    )
  }

  // Fire-and-forget emails. Two go out at registration time:
  //   1. admin notification with approve/reject buttons
  //   2. user confirmation with username + the password they just typed
  //      (account is pending — login_url is included but the email body
  //       makes clear they must wait for admin approval first)
  // Neither blocks the response.
  try {
    const origin = new URL(request.url).origin

    // 1. admin notification
    fetch(`${origin}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'new_registration',
        data: {
          user_id: insertedUserId,
          first_name: firstName,
          last_name: lastName,
          email,
          username,
          origin,
        },
      }),
    }).catch(() => {})

    // 2. user confirmation with credentials
    fetch(`${origin}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'account_created',
        data: {
          email,
          first_name: firstName,
          username,
          // The user typed this seconds ago — they already know it. We
          // echo it back so they have a record of exactly what was saved.
          temp_password: password,
          login_url: `${origin}/signin`,
          is_pending: true,
        },
      }),
    }).catch(() => {})
  } catch {
    /* swallow */
  }

  return NextResponse.json({ ok: true, email })
}
