import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

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
  const password = passwordRaw.trim()

  let supabase
  try {
    supabase = getSupabaseAdmin()
  } catch (e: any) {
    console.error('[auth/login] config error:', e?.message)
    return NextResponse.json(
      { error: e?.message || 'Server misconfigured' },
      { status: 500 },
    )
  }

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .ilike('username', username)
    .eq('password', password)
    .maybeSingle()

  if (error) {
    console.error('[auth/login] supabase error:', error)
    return NextResponse.json(
      { error: `Database error: ${error.message}` },
      { status: 500 },
    )
  }

  if (!data) {
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 })
  }

  if (data.status === 'pending') {
    return NextResponse.json(
      { error: 'Your account is pending admin approval. Check your email for updates.' },
      { status: 403 },
    )
  }

  if (data.status === 'rejected') {
    return NextResponse.json(
      { error: 'Your account was not approved. Contact tarun@lapizblue.com' },
      { status: 403 },
    )
  }

  return NextResponse.json({ user: data })
}
