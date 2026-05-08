'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, FileText, Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/admin/users',    label: 'Users',    Icon: Users },
  { href: '/admin/quizzes',  label: 'Quizzes',  Icon: FileText },
  { href: '/admin/requests', label: 'Requests', Icon: Inbox },
] as const

export function AdminTabsNav() {
  const pathname = usePathname()
  return (
    <nav className="inline-flex h-11 items-center gap-1 rounded-xl border border-midnight-line bg-midnight-deepest/60 p-1 backdrop-blur">
      {TABS.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-4 py-1.5 text-caption font-medium tracking-wide transition-colors',
              active
                ? 'bg-midnight-elevated text-white shadow-sm'
                : 'text-whitex-muted hover:text-whitex-soft',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
