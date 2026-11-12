import { NextResponse, after } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getHrRespondent } from '@/lib/hr-gate'
import { getSession } from '@/lib/session'
import { normaliseName, periodFor, scoreOf } from '@/lib/hr-survey'
import { STAFF, canonicalName, departmentOf } from '@/lib/hr-roster'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/survey/submit
 * Body: { type: 'A'|'B', assessed, department?, answers: number[10], comment? }
 * Respondent comes from the hr_gate cookie. Score is computed here, not trusted from the client.
 * Only a signed-in admin may submit more than once for the same person in a period.
 */
export async function POST(request: Request) {
  const me = await getHrRespondent()
  if (!me) return NextResponse.json({ error: 'Your session expired. Please enter the passcode again.' }, { status: 401 })

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const type = body?.type
  if (type !== 'A' && type !== 'B') return NextResponse.json({ error: 'Choose a survey type.' }, { status: 400 })

  // Prefer the directory entry the person tapped; otherwise snap typed text to the directory when it's clearly one person
  const picked = STAFF.find(p => p.id === body?.person_id) ?? null
  const typed = normaliseName(body?.assessed).slice(0, 120)
  if (!picked && typed.length < 2) {
    return NextResponse.json({ error: 'Please enter the name of the person you are rating.' }, { status: 400 })
  }
  const snapped = picked ? { name: picked.name, person: picked } : canonicalName(typed)
  const assessed = snapped.name
  if (assessed.toLowerCase() === canonicalName(me.name).name.toLowerCase()) {
    return NextResponse.json({ error: 'This survey is for rating someone else, not yourself.' }, { status: 400 })
  }

  const answers = Array.isArray(body?.answers) ? body.answers.map(Number) : []
  if (answers.length !== 10 || !answers.every((a: number) => Number.isInteger(a) && a >= 1 && a <= 5)) {
    return NextResponse.json({ error: 'Please answer all 10 questions.' }, { status: 400 })
  }

  const department = snapped.person ? departmentOf(snapped.person) : normaliseName(body?.department).slice(0, 80) || null
  const comment = String(body?.comment ?? '').trim().slice(0, 2000) || null
  const { total, kpi } = scoreOf(answers)
  const isAdmin = (await getSession())?.role === 'admin'

  const { error } = await getSupabaseAdmin().from('hr_responses').insert({
    survey_type: type,
    period: periodFor(),
    department,
    assessed_name: assessed,
    respondent_name: me.name,
    respondent_email: me.email,
    answers,
    total,
    kpi_score: kpi,
    comment,
    is_admin: isAdmin,
  })
  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: `You have already submitted this survey for ${assessed} this period.` },
        { status: 409 },
      )
    }
    return NextResponse.json({ error: 'Could not save your answers. Please try again.' }, { status: 500 })
  }

  // Let HR know someone finished. after() keeps the function alive until the mail is handed off.
  const origin = new URL(request.url).origin
  after(() =>
    fetch(`${origin}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'hr_survey_submitted',
        data: { respondent_name: me.name, assessed_name: assessed, survey_type: type, admin_url: `${origin}/admin/hr` },
      }),
    })
      .then(r => (r.ok ? null : r.text().then(t => console.error('[survey/submit] HR mail failed:', r.status, t))))
      .catch(e => console.error('[survey/submit] HR mail failed:', e)),
  )

  // Survey A is anonymous culture — the respondent doesn't get a score back
  return NextResponse.json({ ok: true, assessed, ...(type === 'B' ? { total, kpi } : {}) })
}
