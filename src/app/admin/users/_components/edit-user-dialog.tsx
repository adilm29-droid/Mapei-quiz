'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { GradientButton } from '@/components/ui/gradient-button'
import type { AdminUserRow } from './types'

export function EditUserDialog({
  user,
  open,
  onOpenChange,
  onSaved,
}: {
  user: AdminUserRow
  open: boolean
  onOpenChange: (o: boolean) => void
  onSaved: () => void
}) {
  const [firstName, setFirstName] = useState(user.first_name || '')
  const [lastName, setLastName] = useState(user.last_name || '')
  const [email, setEmail] = useState(user.email)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setFirstName(user.first_name || '')
      setLastName(user.last_name || '')
      setEmail(user.email)
    }
  }, [open, user])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(body?.error || 'Update failed')
        setSubmitting(false)
        return
      }
      toast.success(`@${user.username} updated`)
      onOpenChange(false)
      onSaved()
    } catch {
      toast.error('Network error')
    }
    setSubmitting(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit @{user.username}</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="ef">First name</Label>
              <Input id="ef" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="el">Last name</Label>
              <Input id="el" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ee">Email</Label>
            <Input id="ee" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
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
            <GradientButton type="submit" gradient="aurora" size="md" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save changes'}
            </GradientButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
