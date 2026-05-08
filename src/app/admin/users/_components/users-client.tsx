'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { GradientButton } from '@/components/ui/gradient-button'
import { CreateUserDialog } from './create-user-dialog'
import { UserTable } from './user-table'
import type { AdminUserRow } from './types'

export function UsersClient({ initialUsers }: { initialUsers: AdminUserRow[] }) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)

  function refresh() {
    router.refresh()
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-h1 font-semibold tracking-tight text-white">Users</h1>
          <p className="mt-1 text-caption text-whitex-muted">
            {initialUsers.length} {initialUsers.length === 1 ? 'account' : 'accounts'} total
          </p>
        </div>
        <GradientButton gradient="aurora" size="md" onClick={() => setCreateOpen(true)}>
          <UserPlus className="h-4 w-4" />
          Create User
        </GradientButton>
      </div>

      <UserTable users={initialUsers} onChange={refresh} />

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={refresh} />
    </>
  )
}
