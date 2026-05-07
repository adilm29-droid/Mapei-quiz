import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { verifyDecision, type DecisionAction } from '@/lib/decision-token'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function htmlPage(title: string, message: string, accent: string, subtitle = ''): string {
  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} · LapizBlue</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{min-height:100dvh;display:flex;align-items:center;justify-content:center;
       background:linear-gradient(160deg,#040a1c,#0a1740,#06122e);
       font-family:'Manrope',-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif;
       color:#fff;padding:24px}
  .card{max-width:480px;width:100%;background:rgba(255,255,255,0.04);
        border:1px solid rgba(255,255,255,0.1);border-radius:24px;padding:48px 40px;
        text-align:center;backdrop-filter:blur(24px)}
  .badge{width:64px;height:64px;border-radius:50%;display:inline-flex;
         align-items:center;justify-content:center;font-size:32px;
         background:${accent}22;border:2px solid ${accent};margin-bottom:20px}
  h1{font-size:22px;font-weight:600;letter-spacing:-0.01em;margin-bottom:10px}
  p{font-size:14px;color:rgba(255,255,255,0.65);line-height:1.6;margin-bottom:8px}
  .sub{font-size:12px;color:rgba(255,255,255,0.4);margin-top:18px;
       letter-spacing:2px;text-transform:uppercase}
</style></head><body>
<div class="card">
  <div class="badge">${accent === '#7adca0' ? '✓' : accent === '#ff7a7a' ? '✕' : 'i'}</div>
  <h1>${title}</h1>
  <p>${message}</p>
  ${subtitle ? `<div class="sub">${subtitle}</div>` : ''}
</div>
</body></html>`
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const userId = url.searchParams.get('id') || ''
  const actionRaw = url.searchParams.get('action') || ''
  const sig = url.searchParams.get('sig') || ''

  if (!userId || (actionRaw !== 'approve' && actionRaw !== 'reject') || !sig) {
    return new Response(
      htmlPage('Invalid Link', 'This approval link is malformed or missing parameters.', '#ff7a7a'),
      { status: 400, headers: { 'content-type': 'text/html; charset=utf-8' } },
    )
  }

  const action = actionRaw as DecisionAction

  if (!verifyDecision(userId, action, sig)) {
    return new Response(
      htmlPage(
        'Invalid Signature',
        'This link is not authentic or has been tampered with.',
        '#ff7a7a',
      ),
      { status: 401, headers: { 'content-type': 'text/html; charset=utf-8' } },
    )
  }

  let supabase
  try {
    supabase = getSupabaseAdmin()
  } catch (e: any) {
    console.error('[auth/decision] config error:', e?.message)
    return new Response(
      htmlPage('Server Error', e?.message || 'Server misconfigured.', '#ff7a7a'),
      { status: 500, headers: { 'content-type': 'text/html; charset=utf-8' } },
    )
  }

  // Fetch the user we're acting on
  const { data: user, error: fetchErr } = await supabase
    .from('users')
    .select('id,username,first_name,last_name,email,status')
    .eq('id', userId)
    .maybeSingle()

  if (fetchErr) {
    console.error('[auth/decision] fetch error:', fetchErr)
    return new Response(
      htmlPage('Database Error', `Could not look up the user: ${fetchErr.message}`, '#ff7a7a'),
      { status: 500, headers: { 'content-type': 'text/html; charset=utf-8' } },
    )
  }
  if (!user) {
    return new Response(
      htmlPage(
        'User Not Found',
        'The account this link refers to no longer exists.',
        '#ff7a7a',
      ),
      { status: 404, headers: { 'content-type': 'text/html; charset=utf-8' } },
    )
  }

  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username

  // Idempotent — if already in the target state, just confirm it
  const targetStatus = action === 'approve' ? 'approved' : 'rejected'
  if (user.status === targetStatus) {
    return new Response(
      htmlPage(
        action === 'approve' ? 'Already Approved' : 'Already Rejected',
        `${fullName}'s account is already marked as ${targetStatus}. No further action needed.`,
        action === 'approve' ? '#7adca0' : '#ff7a7a',
        '@LapizBlue',
      ),
      { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } },
    )
  }

  // Update the status
  const { error: updateErr } = await supabase
    .from('users')
    .update({ status: targetStatus })
    .eq('id', userId)

  if (updateErr) {
    console.error('[auth/decision] update error:', updateErr)
    return new Response(
      htmlPage('Database Error', `Could not update status: ${updateErr.message}`, '#ff7a7a'),
      { status: 500, headers: { 'content-type': 'text/html; charset=utf-8' } },
    )
  }

  // If approved, fire the welcome email to the user (fire-and-forget)
  if (action === 'approve' && user.email) {
    try {
      const origin = url.origin
      await fetch(`${origin}/api/send-email`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'approved',
          data: {
            email: user.email,
            first_name: user.first_name,
            username: user.username,
          },
        }),
      }).catch(() => {})
    } catch {
      /* swallow — status was updated, email is best-effort */
    }
  }

  return new Response(
    htmlPage(
      action === 'approve' ? `${fullName} approved` : `${fullName} rejected`,
      action === 'approve'
        ? `Their account is now active. They have been notified by email and can sign in.`
        : `Their access request has been declined. No further action needed.`,
      action === 'approve' ? '#7adca0' : '#ff7a7a',
      '@LapizBlue',
    ),
    { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } },
  )
}
