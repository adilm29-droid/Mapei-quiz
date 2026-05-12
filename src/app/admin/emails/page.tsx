import { redirect } from 'next/navigation'
import { CheckCircle2, AlertTriangle, Clock, Mail } from 'lucide-react'
import { getSession } from '@/lib/session'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { formatUaeDateTime } from '@/lib/utils/timezone'
import { Badge } from '@/components/ui/badge'

export const dynamic = 'force-dynamic'

interface LogRow {
  id: string
  user_id: string | null
  type: string
  subject: string | null
  status: string | null
  error_message: string | null
  sent_at: string
  recipient_name: string
  recipient_email: string | null
}

/**
 * /admin/emails — read-only review of `email_log`.
 *
 * Per CLAUDE_CODE_PROMPT.md §13. Shows the 200 most recent rows with
 * recipient, type, subject, status, and any send error. Server component
 * — service-role read, admin gate from the layout.
 */
export default async function AdminEmailsPage() {
  const session = await getSession()
  if (!session) redirect('/signin')
  if (session.role !== 'admin') redirect('/')

  const supabase = getSupabaseAdmin()

  const { data: rawLogs } = await supabase
    .from('email_log')
    .select('id, user_id, type, subject, status, error_message, sent_at')
    .order('sent_at', { ascending: false })
    .limit(200)

  const userIds = Array.from(
    new Set((rawLogs ?? []).map((r: any) => r.user_id).filter(Boolean) as string[]),
  )
  const userMap = new Map<string, { name: string; email: string | null }>()
  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, first_name, last_name, username, email')
      .in('id', userIds)
    for (const u of users ?? []) {
      const name =
        [u.first_name, u.last_name].filter(Boolean).join(' ') ||
        `@${u.username}`
      userMap.set(u.id, { name, email: u.email })
    }
  }

  const logs: LogRow[] = (rawLogs ?? []).map((r: any) => {
    const u = r.user_id ? userMap.get(r.user_id) : null
    return {
      id: r.id,
      user_id: r.user_id,
      type: r.type,
      subject: r.subject,
      status: r.status,
      error_message: r.error_message,
      sent_at: r.sent_at,
      recipient_name: u?.name ?? '(unknown recipient)',
      recipient_email: u?.email ?? null,
    }
  })

  const stats = {
    total: logs.length,
    failed: logs.filter(l => l.status === 'failed').length,
    sent: logs.filter(l => l.status === 'sent' || l.status === null).length,
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-h2 font-semibold text-white">Email log</h1>
          <p className="text-caption text-whitex-muted">
            Last 200 entries from <code>email_log</code>. Status reflects whether the SMTP send
            succeeded; failures keep the original payload for replay.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="info">
            <Mail className="mr-1 h-3 w-3" /> {stats.total} total
          </Badge>
          <Badge tone="success">{stats.sent} sent</Badge>
          {stats.failed > 0 && <Badge tone="danger">{stats.failed} failed</Badge>}
        </div>
      </header>

      {logs.length === 0 ? (
        <div className="rounded-2xl border border-midnight-line bg-midnight-elevated/40 p-10 text-center text-caption text-whitex-muted">
          No emails have been logged yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-midnight-line bg-midnight-elevated/40">
          <table className="w-full text-left text-caption">
            <thead className="bg-midnight-deepest/60 text-micro uppercase tracking-wider text-whitex-faint">
              <tr>
                <th className="px-4 py-3 font-semibold">When</th>
                <th className="px-4 py-3 font-semibold">Recipient</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Subject</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-midnight-line">
              {logs.map(l => (
                <tr key={l.id} className="text-whitex-soft">
                  <td className="px-4 py-3 font-mono text-micro tabular text-whitex-muted">
                    {formatUaeDateTime(l.sent_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold">{l.recipient_name}</div>
                    {l.recipient_email && (
                      <div className="text-micro text-whitex-faint">{l.recipient_email}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <code className="rounded bg-midnight-deepest/60 px-1.5 py-0.5 text-micro">
                      {l.type}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-whitex-muted">
                    {l.subject ?? <span className="italic text-whitex-faint">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={l.status} error={l.error_message} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function StatusPill({ status, error }: { status: string | null; error: string | null }) {
  if (status === 'failed') {
    return (
      <span
        title={error ?? undefined}
        className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-micro font-medium text-rose-300"
      >
        <AlertTriangle className="h-3 w-3" /> failed
      </span>
    )
  }
  if (status === 'queued') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-micro font-medium text-amber-300">
        <Clock className="h-3 w-3" /> queued
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-micro font-medium text-emerald-300">
      <CheckCircle2 className="h-3 w-3" /> sent
    </span>
  )
}
