'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface RequestRow {
  id: string
  status: 'pending' | 'granted' | 'denied'
  requested_at: string
  resolved_at: string | null
  user: { id: string; username: string; first_name: string | null; last_name: string | null; email: string }
  quiz: { id: string; title: string; week_number: number }
}

const STATUS_TONE = { pending: 'warning', granted: 'success', denied: 'danger' } as const

export function RequestsClient({ initial }: { initial: RequestRow[] }) {
  const router = useRouter()
  const [tab, setTab] = useState<'pending' | 'history'>('pending')
  const [busy, setBusy] = useState<string | null>(null)

  const pending = useMemo(() => initial.filter(r => r.status === 'pending'), [initial])
  const history = useMemo(() => initial.filter(r => r.status !== 'pending'), [initial])
  const rows = tab === 'pending' ? pending : history

  async function resolve(req: RequestRow, decision: 'granted' | 'denied') {
    setBusy(req.id)
    const res = await fetch(`/api/admin/access-requests/${req.id}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision }),
    })
    const body = await res.json().catch(() => ({}))
    setBusy(null)
    if (!res.ok) {
      toast.error(body?.error || 'Could not resolve')
      return
    }
    toast.success(`@${req.user.username} → ${decision}`)
    router.refresh()
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-h1 font-semibold tracking-tight text-white">Access Requests</h1>
          <p className="mt-1 text-caption text-whitex-muted">
            {pending.length} pending · {history.length} resolved
          </p>
        </div>
        <div className="inline-flex items-center gap-1 rounded-xl border border-midnight-line bg-midnight-deepest/60 p-1 backdrop-blur">
          <button
            onClick={() => setTab('pending')}
            className={
              tab === 'pending'
                ? 'rounded-lg bg-midnight-elevated px-4 py-1.5 text-caption font-medium text-white shadow-sm'
                : 'rounded-lg px-4 py-1.5 text-caption text-whitex-muted hover:text-whitex-soft'
            }
          >
            Pending ({pending.length})
          </button>
          <button
            onClick={() => setTab('history')}
            className={
              tab === 'history'
                ? 'rounded-lg bg-midnight-elevated px-4 py-1.5 text-caption font-medium text-white shadow-sm'
                : 'rounded-lg px-4 py-1.5 text-caption text-whitex-muted hover:text-whitex-soft'
            }
          >
            History ({history.length})
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-midnight-line bg-midnight-elevated/40 p-12 text-center backdrop-blur">
          <p className="text-caption text-whitex-muted">
            {tab === 'pending'
              ? 'No pending requests.'
              : 'No resolved requests yet.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-midnight-line bg-midnight-elevated/40 backdrop-blur">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-midnight-line text-micro uppercase tracking-wider text-whitex-faint">
                <th className="px-5 py-3 font-medium">User</th>
                <th className="px-5 py-3 font-medium">Quiz</th>
                <th className="px-5 py-3 font-medium">Requested</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="w-44 px-5 py-3 text-right font-medium" />
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr
                  key={r.id}
                  className="border-b border-midnight-line/60 last:border-0 hover:bg-midnight-line/40"
                >
                  <td className="px-5 py-3">
                    <div className="text-body font-medium text-whitex-soft">
                      {[r.user.first_name, r.user.last_name].filter(Boolean).join(' ') ||
                        `@${r.user.username}`}
                    </div>
                    <div className="text-micro tabular text-whitex-faint">
                      @{r.user.username} · {r.user.email}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-caption text-whitex-soft">
                    <span className="font-mono text-whitex-faint">W{r.quiz.week_number}</span>{' '}
                    {r.quiz.title}
                  </td>
                  <td className="px-5 py-3 text-caption text-whitex-muted">
                    {new Date(r.requested_at).toLocaleString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {r.status === 'pending' ? (
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => resolve(r, 'granted')}
                          disabled={busy === r.id}
                          className="text-success hover:bg-success/10"
                        >
                          <Check className="mr-1 h-3.5 w-3.5" /> Approve
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => resolve(r, 'denied')}
                          disabled={busy === r.id}
                          className="text-danger hover:bg-danger/10"
                        >
                          <X className="mr-1 h-3.5 w-3.5" /> Deny
                        </Button>
                      </div>
                    ) : (
                      <span className="text-micro tabular text-whitex-faint">
                        {r.resolved_at
                          ? new Date(r.resolved_at).toLocaleString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                            })
                          : '—'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
