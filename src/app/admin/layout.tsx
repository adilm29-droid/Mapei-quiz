import { redirect } from 'next/navigation'
import { Toaster } from 'sonner'
import { getSession } from '@/lib/session'
import { LogoFull } from '@/components/brand/LogoFull'
import { AdminTabsNav } from './_components/admin-tabs-nav'
import { SignOutButton } from './_components/sign-out-button'

/**
 * Admin shell. Server component — verifies session + role server-side and
 * redirects unauthenticated / non-admin users before any markup renders.
 *
 * Renders the persistent chrome (top bar with logo, tabs, sign-out) around
 * the per-tab pages (/admin/users, /admin/quizzes, /admin/requests).
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/signin')
  if (session.role !== 'admin') redirect('/')

  return (
    <div className="min-h-screen text-whitex-soft">
      <header className="border-b border-midnight-line/60 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
          <div className="flex items-center gap-6">
            <LogoFull markClassName="h-8 w-8" wordmarkClassName="h-6" />
            <span className="hidden text-micro uppercase tracking-[0.4em] text-whitex-faint sm:inline">
              Admin
            </span>
          </div>
          <SignOutButton />
        </div>
        <div className="mx-auto max-w-6xl px-6 pb-3">
          <AdminTabsNav />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>

      <Toaster
        theme="dark"
        position="top-center"
        toastOptions={{
          style: {
            background: 'rgba(19, 28, 74, 0.95)',
            border: '1px solid rgba(31, 42, 92, 1)',
            color: '#F8FAFC',
            backdropFilter: 'blur(20px)',
          },
        }}
      />
    </div>
  )
}
