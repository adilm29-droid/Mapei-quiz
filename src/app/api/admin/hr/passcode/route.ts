import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guard'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** POST /api/admin/hr/passcode — Body: { passcode: '123456' } */
export async function POST(request: Request) {
  const guard = await requireAdmin()
  if (guard instanceof NextResponse) return guard

  const body = await request.json().catch(() => null)
  const passcode = String(body?.passcode ?? '')
  if (!/^\d{6}$/.test(passcode)) {
    return NextResponse.json({ error: 'Passcode must be exactly 6 digits' }, { status: 400 })
  }

  const { error } = await getSupabaseAdmin().from('hr_settings').upsert({ key: 'passcode', value: passcode })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
