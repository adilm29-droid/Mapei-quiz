import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Read-only diagnostic. Reveals env-var SHAPES (presence + first few chars + length)
 * so we can verify what Vercel actually has, without exposing the secret values.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

  const summarize = (v: string) => ({
    set: !!v,
    length: v.length,
    head: v ? v.slice(0, 12) : null,
    tail: v ? v.slice(-4) : null,
  })

  // Try to hit the REST root with the service key to verify reachability.
  let reach: any = { tried: false }
  if (url && service) {
    try {
      const res = await fetch(`${url}/rest/v1/`, {
        method: 'GET',
        headers: {
          apikey: service,
          Authorization: `Bearer ${service}`,
        },
        signal: AbortSignal.timeout(8000),
      })
      reach = { tried: true, status: res.status, ok: res.ok }
    } catch (e: any) {
      reach = { tried: true, error: e?.message || String(e) }
    }
  }

  return NextResponse.json({
    NEXT_PUBLIC_SUPABASE_URL: summarize(url),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: summarize(anon),
    SUPABASE_SERVICE_ROLE_KEY: summarize(service),
    reachability: reach,
  })
}
