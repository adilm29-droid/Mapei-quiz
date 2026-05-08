'use client'

import { useState } from 'react'
import { MoreHorizontal, Pencil, Key, Ban, ShieldCheck, Shield, CircleCheck } from 'lucide-react'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { EditUserDialog } from './edit-user-dialog'
import { ResetPasswordDialog } from './reset-password-dialog'
import type { AdminUserRow } from './types'

export function UserRowActions({
  user,
  onChange,
}: {
  user: AdminUserRow
  onChange: () => void
}) {
  const [editOpen, setEditOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)

  async function patchStatus(status: AdminUserRow['status']) {
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(body?.error || 'Update failed')
      return
    }
    toast.success(`@${user.username} → ${status}`)
    onChange()
  }

  async function patchRole(role: 'admin' | 'staff') {
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(body?.error || 'Update failed')
      return
    }
    toast.success(`@${user.username} is now ${role}`)
    onChange()
  }

  const isSuspended = user.status === 'suspended'
  const isAdmin = user.role === 'admin'

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-whitex-muted hover:bg-midnight-line/60 hover:text-white"
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Actions for @{user.username}</span>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil className="h-3.5 w-3.5" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setResetOpen(true)}>
            <Key className="h-3.5 w-3.5" /> Reset password
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {user.status === 'pending' && (
            <DropdownMenuItem onSelect={() => patchStatus('approved')}>
              <CircleCheck className="h-3.5 w-3.5" /> Approve
            </DropdownMenuItem>
          )}
          {!isAdmin ? (
            <DropdownMenuItem onSelect={() => patchRole('admin')}>
              <ShieldCheck className="h-3.5 w-3.5" /> Promote to admin
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => patchRole('staff')}>
              <Shield className="h-3.5 w-3.5" /> Demote to staff
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          {isSuspended ? (
            <DropdownMenuItem onSelect={() => patchStatus('approved')}>
              <CircleCheck className="h-3.5 w-3.5" /> Unsuspend
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem destructive onSelect={() => patchStatus('suspended')}>
              <Ban className="h-3.5 w-3.5" /> Suspend
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <EditUserDialog user={user} open={editOpen} onOpenChange={setEditOpen} onSaved={onChange} />
      <ResetPasswordDialog
        user={user}
        open={resetOpen}
        onOpenChange={setResetOpen}
        onReset={onChange}
      />
    </>
  )
}
