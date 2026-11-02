import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getHrRespondent } from '@/lib/hr-gate'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/survey/names
 * Previously entered names + departments for the autocomplete lists,
 * so feedback for one person stays under one spelling. Never returns respondents.
 */
export async function GET() {
  const me = await getHrRespondent()
  if (!me) return NextResponse.json({ error: 'Please enter the passcode first.' }, { status: 401 })

  const { data, error } = await getSupabaseAdmin()
    .from('hr_responses')
    .select('assessed_name, department')
    .limit(5000)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const names = [...new Set((data ?? []).map(d => d.assessed_name).filter(Boolean))].sort()
  const depts = [...new Set((data ?? []).map(d => d.department).filter(Boolean) as string[])].sort()
  return NextResponse.json({ me, names, depts })
}
