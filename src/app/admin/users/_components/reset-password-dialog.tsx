'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { GradientButton } from '@/components/ui/gradient-button'
import type { AdminUserRow } from './types'

function genTempPassword(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

export function ResetPasswordDialog({
  user,
  open,
  onOpenChange,
  onReset,
}: {
  user: AdminUserRow
  open: boolean
  onOpenChange: (o: boolean) => void
  onReset: () => void
}) {
  const [tempPassword, setTempPassword] = useState(genTempPassword())
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) setTempPassword(genTempPassword())
  }, [open])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/users/${user.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempPassword }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(body?.error || 'Reset failed')
        setSubmitting(false)
        return
      }
      toast.success(`Reset @${user.username} — new password emailed`)
      onOpenChange(false)
      onReset()
    } catch {
      toast.error('Network error')
    }
    setSubmitting(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset password for @{user.username}</DialogTitle>
          <DialogDescription>
            We'll set this as their new password and email it to {user.email}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="rp">New temp password</Label>
            <div className="flex gap-2">
              <Input
                id="rp"
                value={tempPassword}
                onChange={(e) => setTempPassword(e.target.value)}
                className="font-mono"
                minLength={6}
                required
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setTempPassword(genTempPassword())}
                className="border-midnight-line bg-midnight-deepest/60 text-whitex-muted hover:bg-midnight-line hover:text-white"
              >
                Regenerate
              </Button>
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-whitex-muted hover:bg-midnight-line/50 hover:text-whitex-soft"
            >
              Cancel
            </Button>
            <GradientButton type="submit" gradient="sunset" size="md" disabled={submitting}>
              {submitting ? 'Resetting…' : 'Reset & email'}
            </GradientButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
