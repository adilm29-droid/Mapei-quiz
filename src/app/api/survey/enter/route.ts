import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { signHrGate, hrGateCookieOptions } from '@/lib/hr-gate'
import { EMAIL_RE } from '@/lib/hr-survey'
import { canonicalName, isJunkEmail, isJunkName } from '@/lib/hr-roster'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/survey/enter
 * Body: { name, email, passcode }
 * Checks the shared staff passcode and sets the hr_gate cookie.
 */
export async function POST(request: Request) {
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const name = String(body?.name ?? '').trim().replace(/\s+/g, ' ').slice(0, 120)
  const email = String(body?.email ?? '').trim().toLowerCase().slice(0, 200)
  const passcode = String(body?.passcode ?? '')

  if (name.length < 2) return NextResponse.json({ error: 'Please enter your full name.' }, { status: 400 })
  if (isJunkName(name)) {
    return NextResponse.json({ error: 'Please enter your real name. HR needs to know who has completed the survey.' }, { status: 400 })
  }
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  if (isJunkEmail(email)) return NextResponse.json({ error: 'Please enter your own email address.' }, { status: 400 })
  if (!/^\d{6}$/.test(passcode)) {
    return NextResponse.json({ error: 'Please enter the 6-digit passcode from HR.' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.from('hr_settings').select('value').eq('key', 'passcode').maybeSingle()
  if (error) return NextResponse.json({ error: 'Could not reach the server. Please try again.' }, { status: 500 })

  if (!data || data.value !== passcode) {
    // Slow down guessing
    await new Promise(r => setTimeout(r, 700))
    return NextResponse.json({ error: 'That passcode is not correct. Please check with HR.' }, { status: 401 })
  }

  // Store the directory spelling when the typed name clearly means one person ("kamran sir" → Kamran)
  const { name: finalName } = canonicalName(name)
  const res = NextResponse.json({ ok: true, name: finalName, email })
  const secure = new URL(request.url).protocol === 'https:'
  res.cookies.set({ ...hrGateCookieOptions(secure), value: signHrGate({ name: finalName, email }) })
  return res
}

/** DELETE /api/survey/enter — leave the survey (clears the cookie). */
export async function DELETE(request: Request) {
  const res = NextResponse.json({ ok: true })
  const secure = new URL(request.url).protocol === 'https:'
  res.cookies.set({ ...hrGateCookieOptions(secure), value: '', maxAge: 0 })
  return res
}
