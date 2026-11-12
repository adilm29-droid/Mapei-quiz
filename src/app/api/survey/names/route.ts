import { NextResponse } from 'next/server'
import { getHrRespondent } from '@/lib/hr-gate'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/survey/names
 * Who is filling in the survey, from the hr_gate cookie. The staff list itself is built into
 * the form (src/lib/hr-roster.ts), so nothing here touches the database.
 */
export async function GET() {
  const me = await getHrRespondent()
  if (!me) return NextResponse.json({ error: 'Please enter the passcode first.' }, { status: 401 })
  return NextResponse.json({ me })
}
