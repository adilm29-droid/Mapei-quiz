'use client'

import { Badge } from '@/components/ui/badge'
import { UserRowActions } from './user-row-actions'
import type { AdminUserRow } from './types'

const ROLE_TONE = { admin: 'glow', staff: 'neutral' } as const
const STATUS_TONE = {
  approved: 'success',
  pending: 'warning',
  rejected: 'danger',
  suspended: 'danger',
} as const

function formatRel(iso: string | null): string {
  if (!iso) return '—'
  const then = new Date(iso).getTime()
  const now = Date.now()
  const diff = Math.max(0, now - then)
  const m = Math.round(diff / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
}

function fullName(u: AdminUserRow): string {
  const fn = (u.first_name || '').trim()
  const ln = (u.last_name || '').trim()
  return [fn, ln].filter(Boolean).join(' ') || '—'
}

export function UserTable({
  users,
  onChange,
}: {
  users: AdminUserRow[]
  onChange: () => void
}) {
  if (users.length === 0) {
    return (
      <div className="rounded-2xl border border-midnight-line bg-midnight-elevated/50 p-12 text-center backdrop-blur">
        <p className="text-caption text-whitex-muted">
          No users yet. Create one with the button above.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-midnight-line bg-midnight-elevated/40 backdrop-blur">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-midnight-line text-micro uppercase tracking-wider text-whitex-faint">
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Username</th>
              <th className="px-5 py-3 font-medium">Email</th>
              <th className="px-5 py-3 font-medium">Role</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 text-right font-medium">XP</th>
              <th className="px-5 py-3 text-right font-medium">Level</th>
              <th className="px-5 py-3 font-medium">Last Active</th>
              <th className="w-12 px-5 py-3 text-right font-medium">{''}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr
                key={u.id}
                className={
                  i === users.length - 1
                    ? 'transition-colors hover:bg-midnight-line/40'
                    : 'border-b border-midnight-line/60 transition-colors hover:bg-midnight-line/40'
                }
              >
                <td className="px-5 py-3 text-body font-medium text-whitex-soft">{fullName(u)}</td>
                <td className="px-5 py-3 font-mono text-caption text-whitex-soft">@{u.username}</td>
                <td className="px-5 py-3 text-caption text-whitex-muted">{u.email}</td>
                <td className="px-5 py-3"><Badge tone={ROLE_TONE[u.role]}>{u.role}</Badge></td>
                <td className="px-5 py-3"><Badge tone={STATUS_TONE[u.status]}>{u.status}</Badge></td>
                <td className="tabular px-5 py-3 text-right font-mono text-caption text-whitex-soft">
                  {u.xp.toLocaleString('en-US')}
                </td>
                <td className="tabular px-5 py-3 text-right font-mono text-caption text-whitex-soft">
                  {u.level}
                </td>
                <td className="px-5 py-3 text-caption text-whitex-muted">
                  {formatRel(u.last_quiz_date || u.updated_at)}
                </td>
                <td className="px-5 py-3 text-right">
                  <UserRowActions user={u} onChange={onChange} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
