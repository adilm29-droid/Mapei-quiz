'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { LogoFull } from '@/components/brand/LogoFull'
import { AuthForm } from '@/components/auth/AuthForm'

export default function SignInPage() {
  const router = useRouter()
  return (
    <main className="relative flex min-h-screen w-full flex-col bg-gradient-to-b from-[#040a1c] via-[#06122e] to-[#0a1740]">
      {/* Soft glow blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 60% at 20% 10%, rgba(140,180,235,0.08), transparent 70%), radial-gradient(ellipse 50% 50% at 80% 90%, rgba(120,160,220,0.06), transparent 70%)',
        }}
      />

      <div className="relative z-20 flex w-full items-center justify-between px-6 py-6 sm:px-10 sm:py-8">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.25em] text-white/55 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>
        <LogoFull markClassName="h-7 w-7" wordmarkClassName="h-5" />
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center px-6 pb-10">
        <AuthForm />
      </div>

      <div className="relative z-10 pb-6 text-center text-[10px] font-medium uppercase tracking-[0.3em] text-white/35">
        LapizBlue © 2026 · v1.0 · Internal Use Only
      </div>
    </main>
  )
}
