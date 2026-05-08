import { NextResponse } from 'next/server'

/**
 * Verifies that an incoming cron route request bears the Vercel-set
 * `Authorization: Bearer ${CRON_SECRET}` header. Vercel cron schedulers
 * inject this automatically for routes referenced in vercel.json.
 *
 * Returns null on success, or a NextResponse to forward on failure.
 */
export function requireCron(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json(
      { error: 'Server misconfigured: CRON_SECRET not set' },
      { status: 500 },
    )
  }
  const auth = request.headers.get('authorization') || request.headers.get('Authorization') || ''
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}
