import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getHrRespondent } from '@/lib/hr-gate'
import { normaliseName, periodFor, scoreOf } from '@/lib/hr-survey'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/survey/submit
 * Body: { type: 'A'|'B', assessed, department?, answers: number[10], comment? }
 * Respondent comes from the hr_gate cookie. Score is computed here, not trusted from the client.
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

  const assessed = normaliseName(body?.assessed).slice(0, 120)
  if (assessed.length < 2) {
    return NextResponse.json({ error: 'Please enter the name of the person you are rating.' }, { status: 400 })
  }
  if (assessed === normaliseName(me.name)) {
    return NextResponse.json({ error: 'This survey is for rating someone else, not yourself.' }, { status: 400 })
  }

  const answers = Array.isArray(body?.answers) ? body.answers.map(Number) : []
  if (answers.length !== 10 || !answers.every((a: number) => Number.isInteger(a) && a >= 1 && a <= 5)) {
    return NextResponse.json({ error: 'Please answer all 10 questions.' }, { status: 400 })
  }

  const department = normaliseName(body?.department).slice(0, 80) || null
  const comment = String(body?.comment ?? '').trim().slice(0, 2000) || null
  const { total, kpi } = scoreOf(answers)

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

  // Survey A is anonymous culture — the respondent doesn't get a score back
  return NextResponse.json({ ok: true, assessed, ...(type === 'B' ? { total, kpi } : {}) })
}
