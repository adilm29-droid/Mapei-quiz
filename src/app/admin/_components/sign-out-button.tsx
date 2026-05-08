'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function SignOutButton() {
  const router = useRouter()
  async function onClick() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    try {
      localStorage.removeItem('user')
    } catch {}
    router.push('/signin')
    router.refresh()
  }
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="text-whitex-muted hover:bg-midnight-elevated hover:text-white"
    >
      <LogOut className="mr-2 h-3.5 w-3.5" />
      Sign out
    </Button>
  )
}
