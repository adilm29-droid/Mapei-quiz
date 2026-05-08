'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Zap, Hourglass, Lock } from 'lucide-react'
import { GradientButton } from '@/components/ui/gradient-button'

interface ActiveAttempt {
  id: string
  expires_at: string
  current_question_index: number
  total: number
}

interface Quiz {
  id: string
  title: string
  week_number: number
  max_score: number | null
}

interface QuizCtaProps {
  quiz: Quiz | null
  activeAttempt: ActiveAttempt | null
  completedCount: number
  freeCap: number
}

function fmtMs(ms: number): string {
  if (ms <= 0) return '0:00'
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function QuizCta({ quiz, activeAttempt, completedCount, freeCap }: QuizCtaProps) {
  const [now, setNow] = useState(() => Date.now())

  // Tick every second so the resume timer stays live
  useEffect(() => {
    if (!activeAttempt) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [activeAttempt])

  if (!quiz) {
    return (
      <section className="rounded-2xl border border-midnight-line bg-midnight-elevated/40 p-6 text-center text-caption text-whitex-muted backdrop-blur">
        <Lock className="mx-auto mb-2 h-5 w-5" />
        The next quiz is being prepared. Check back soon.
      </section>
    )
  }

  if (activeAttempt) {
    const remainingMs = Math.max(0, new Date(activeAttempt.expires_at).getTime() - now)
    return (
      <CtaCard
        href={`/quiz/${quiz.id}`}
        gradient="ember"
        IconLeft={Hourglass}
        title="Resume quiz"
        subtitle={`${quiz.title} · ${fmtMs(remainingMs)} left`}
        ctaLabel="Resume →"
      />
    )
  }

  const usedAll = completedCount >= freeCap
  if (usedAll) {
    return (
      <CtaCard
        href={`/quiz/${quiz.id}/request-access`}
        gradient="sunset"
        IconLeft={Lock}
        title="Out of attempts"
        subtitle={`You've used both free attempts on "${quiz.title}".`}
        ctaLabel="Request another"
      />
    )
  }

  return (
    <CtaCard
      href={`/quiz/${quiz.id}`}
      gradient="aurora"
      IconLeft={Zap}
      title="Take this week's quiz"
      subtitle={`${quiz.title} · ${quiz.max_score ? `max ${quiz.max_score} pts` : '30 questions'} · 30 minutes`}
      ctaLabel="Start →"
      attemptsLeft={freeCap - completedCount}
    />
  )
}

function CtaCard({
  href,
  gradient,
  IconLeft,
  title,
  subtitle,
  ctaLabel,
  attemptsLeft,
}: {
  href: string
  gradient: 'aurora' | 'sunset' | 'ember'
  IconLeft: any
  title: string
  subtitle: string
  ctaLabel: string
  attemptsLeft?: number
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-midnight-line bg-midnight-elevated/40 backdrop-blur">
      <Link href={href} className="block">
        <div className="flex items-center gap-4 p-5 sm:p-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-midnight-deepest/60">
            <IconLeft className="h-5 w-5 text-whitex-soft" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-h3 font-semibold text-white">{title}</div>
            <div className="mt-0.5 truncate text-caption text-whitex-muted">{subtitle}</div>
            {attemptsLeft !== undefined && (
              <div className="mt-1 text-micro uppercase tracking-wider text-whitex-faint">
                {attemptsLeft} {attemptsLeft === 1 ? 'attempt' : 'attempts'} left
              </div>
            )}
          </div>
          <GradientButton gradient={gradient} size="md" asChild>
            <span>{ctaLabel}</span>
          </GradientButton>
        </div>
      </Link>
    </section>
  )
}
