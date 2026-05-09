'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { Search, UserPlus } from 'lucide-react'
import { GradientButton } from '@/components/ui/gradient-button'
import { CreateUserDialog } from './create-user-dialog'
import { UserTable } from './user-table'
import type { AdminUserRow } from './types'

export function UsersClient({ initialUsers }: { initialUsers: AdminUserRow[] }) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'staff'>('all')
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'approved' | 'pending' | 'rejected' | 'suspended'
  >('all')

  function refresh() {
    router.refresh()
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return initialUsers.filter(u => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false
      if (statusFilter !== 'all' && u.status !== statusFilter) return false
      if (!q) return true
      const name = `${u.first_name ?? ''} ${u.last_name ?? ''}`.toLowerCase()
      return (
        name.includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      )
    })
  }, [initialUsers, query, roleFilter, statusFilter])

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-h1 font-semibold tracking-tight text-white">Users</h1>
          <p className="mt-1 text-caption text-whitex-muted">
            {filtered.length === initialUsers.length
              ? `${initialUsers.length} ${initialUsers.length === 1 ? 'account' : 'accounts'} total`
              : `${filtered.length} of ${initialUsers.length} match`}
          </p>
        </div>
        <GradientButton gradient="aurora" size="md" onClick={() => setCreateOpen(true)}>
          <UserPlus className="h-4 w-4" />
          Create User
        </GradientButton>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-whitex-faint" />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search name, username, email…"
            className="w-full rounded-lg border border-midnight-line bg-midnight-elevated py-2 pl-9 pr-3 text-caption text-white placeholder:text-whitex-faint focus:border-aurora-from focus:outline-none"
          />
        </div>
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value as typeof roleFilter)}
          className="rounded-lg border border-midnight-line bg-midnight-elevated px-3 py-2 text-caption text-white focus:border-aurora-from focus:outline-none"
        >
          <option value="all">All roles</option>
          <option value="admin">Admin</option>
          <option value="staff">Staff</option>
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
          className="rounded-lg border border-midnight-line bg-midnight-elevated px-3 py-2 text-caption text-white focus:border-aurora-from focus:outline-none"
        >
          <option value="all">All statuses</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      <UserTable users={filtered} onChange={refresh} />

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={refresh} />
    </>
  )
}
