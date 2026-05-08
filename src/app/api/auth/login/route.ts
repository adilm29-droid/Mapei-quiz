import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { verifyPassword } from '@/lib/passwords'
import { signSession, sessionCookieOptions } from '@/lib/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  let body: { username?: unknown; password?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const usernameRaw = typeof body.username === 'string' ? body.username : ''
  const passwordRaw = typeof body.password === 'string' ? body.password : ''
  if (!usernameRaw || !passwordRaw) {
    return NextResponse.json({ error: 'Please enter username and password' }, { status: 400 })
  }

  const username = usernameRaw.trim().toLowerCase()
  const password = passwordRaw // do not trim — passwords may legitimately contain spaces

  let supabase
  try {
    supabase = getSupabaseAdmin()
  } catch (e: any) {
    console.error('[auth/login] config error:', e?.message)
    return NextResponse.json({ error: e?.message || 'Server misconfigured' }, { status: 500 })
  }

  let user: any = null
  try {
    const result = await supabase
      .from('users')
      .select('*')
      .ilike('username', username)
      .maybeSingle()
    if (result.error) {
      const msg = result.error.message || ''
      if (/fetch failed|ENOTFOUND|ECONNREFUSED|timeout|network/i.test(msg)) {
        return NextResponse.json(
          {
            error:
              'Cannot reach Supabase. NEXT_PUBLIC_SUPABASE_URL on Vercel is wrong or missing. ' +
              `(detail: ${msg})`,
          },
          { status: 502 },
        )
      }
      console.error('[auth/login] supabase error:', result.error)
      return NextResponse.json({ error: `Database error: ${msg}` }, { status: 500 })
    }
    user = result.data
  } catch (thrown: any) {
    console.error('[auth/login] network/throw:', thrown?.message)
    return NextResponse.json(
      { error: `Cannot reach database. (${thrown?.message || 'unknown'})` },
      { status: 502 },
    )
  }

  if (!user) {
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 })
  }

  // Verify bcrypt hash
  const ok = await verifyPassword(password, user.password_hash || '')
  if (!ok) {
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 })
  }

  if (user.status === 'pending') {
    return NextResponse.json(
      { error: 'Your account is pending admin approval. Check your email for updates.' },
      { status: 403 },
    )
  }
  if (user.status === 'rejected') {
    return NextResponse.json(
      { error: 'Your account was not approved. Contact tarun.s@lapizblue.com' },
      { status: 403 },
    )
  }
  if (user.status === 'suspended') {
    return NextResponse.json(
      { error: 'Your account has been suspended. Contact tarun.s@lapizblue.com' },
      { status: 403 },
    )
  }

  // Sign JWT and set cookie
  let token: string
  try {
    token = signSession({ userId: user.id, role: user.role })
  } catch (e: any) {
    console.error('[auth/login] sign session error:', e?.message)
    return NextResponse.json({ error: e?.message || 'Could not create session' }, { status: 500 })
  }

  // Strip the password hash from the user object before returning
  const { password_hash, ...safeUser } = user

  const res = NextResponse.json({ user: safeUser })
  res.cookies.set({
    ...sessionCookieOptions(process.env.NODE_ENV === 'production'),
    value: token,
  })
  return res
}
