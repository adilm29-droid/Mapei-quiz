'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Check } from 'lucide-react'
import { toast } from 'sonner'
import { AVATAR_GALLERY } from '@/lib/avatar-gallery'
import { GradientButton } from '@/components/ui/gradient-button'
import { Toaster } from 'sonner'
import { cn } from '@/lib/utils'

export function AvatarPicker({
  username,
  firstName,
  lastName,
}: {
  username: string
  firstName: string | null
  lastName: string | null
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function save() {
    if (!selected) return
    setSubmitting(true)
    const res = await fetch('/api/me/avatar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatar_url: selected }),
    })
    setSubmitting(false)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      toast.error(body?.error || 'Could not save avatar')
      return
    }
    router.push('/home')
    router.refresh()
  }

  const display = [firstName, lastName].filter(Boolean).join(' ') || `@${username}`

  return (
    <div className="min-h-screen px-5 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <h1 className="text-display-md font-display font-bold text-white">
            Welcome, {firstName || username}
          </h1>
          <p className="mt-3 text-body text-whitex-muted">
            Pick your avatar — it'll show next to your name on the leaderboard, in your profile,
            and during quizzes.
          </p>
          <p className="mt-1 text-caption text-whitex-faint">
            ({display})
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {AVATAR_GALLERY.map((url) => {
            const isSelected = selected === url
            return (
              <button
                key={url}
                type="button"
                onClick={() => setSelected(url)}
                className={cn(
                  'group relative aspect-square overflow-hidden rounded-full border-2 transition-all',
                  isSelected
                    ? 'border-info shadow-glow-aurora scale-105'
                    : 'border-midnight-line opacity-80 hover:border-info/40 hover:opacity-100',
                )}
              >
                <Image
                  src={url}
                  alt="Avatar option"
                  fill
                  sizes="(min-width: 1024px) 16vw, (min-width: 640px) 25vw, 33vw"
                  className="object-cover"
                />
                {isSelected && (
                  <span className="absolute inset-0 flex items-center justify-center bg-midnight-deepest/40">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-aurora shadow-glow-soft">
                      <Check className="h-5 w-5 text-white" />
                    </span>
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="mt-10 flex justify-center">
          <GradientButton
            gradient="aurora"
            size="lg"
            onClick={save}
            disabled={!selected || submitting}
          >
            {submitting ? 'Saving…' : selected ? "Looks good — let's go" : 'Pick one to continue'}
          </GradientButton>
        </div>
      </div>

      <Toaster theme="dark" position="top-center" />
    </div>
  )
}
