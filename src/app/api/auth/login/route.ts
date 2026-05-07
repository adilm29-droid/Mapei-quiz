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

  let data: any = null
  let queryError: any = null
  try {
    const result = await supabase
      .from('users')
      .select('*')
      .ilike('username', username)
      .eq('password', password)
      .maybeSingle()
    data = result.data
    queryError = result.error
  } catch (thrown: any) {
    // supabase-js throws on network failures (URL unreachable, project paused, DNS, etc.)
    const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '<missing>'
    console.error('[auth/login] network/throw:', thrown?.message, 'url=', supaUrl)
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

  if (queryError) {
    console.error('[auth/login] supabase error:', queryError)
    return NextResponse.json(
      { error: `Database error: ${queryError.message}` },
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
