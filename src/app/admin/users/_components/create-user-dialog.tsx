'use client'

import { useState } from 'react'
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

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

function genTempPassword(): string {
  // 10-char readable password — admin will share it once via email
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

export function CreateUserDialog({ open, onOpenChange, onCreated }: Props) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [tempPassword, setTempPassword] = useState(genTempPassword())
  const [role, setRole] = useState<'staff' | 'admin'>('staff')
  const [submitting, setSubmitting] = useState(false)

  function reset() {
    setFirstName('')
    setLastName('')
    setEmail('')
    setUsername('')
    setTempPassword(genTempPassword())
    setRole('staff')
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, username, tempPassword, role }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(body?.error || 'Could not create user')
        setSubmitting(false)
        return
      }
      toast.success(`Created @${username} — credentials emailed`)
      reset()
      onOpenChange(false)
      onCreated()
    } catch {
      toast.error('Network error')
    }
    setSubmitting(false)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o) }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create user</DialogTitle>
          <DialogDescription>
            They'll receive an email with their username and the temporary password below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoCapitalize="none"
              required
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="tempPassword">Temporary password</Label>
            <div className="flex gap-2">
              <Input
                id="tempPassword"
                value={tempPassword}
                onChange={(e) => setTempPassword(e.target.value)}
                required
                className="font-mono"
                minLength={6}
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
            <p className="text-micro text-whitex-faint">User can change this after first sign-in.</p>
          </div>

          <div className="grid gap-1.5">
            <Label>Role</Label>
            <div className="flex gap-2">
              {(['staff', 'admin'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={
                    role === r
                      ? 'flex-1 rounded-xl border border-info/60 bg-info/10 px-4 py-2.5 text-caption font-medium capitalize text-white'
                      : 'flex-1 rounded-xl border border-midnight-line bg-midnight-deepest/60 px-4 py-2.5 text-caption font-medium capitalize text-whitex-muted hover:text-whitex-soft'
                  }
                >
                  {r}
                </button>
              ))}
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
            <GradientButton type="submit" gradient="aurora" size="md" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create & email credentials'}
            </GradientButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
