'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'motion/react'
import { Flame, Trophy, Sparkles, Star } from 'lucide-react'
import { GradientButton } from '@/components/ui/gradient-button'
import { Button } from '@/components/ui/button'
import { NumberTicker } from '@/components/ui/number-ticker'
import { AchievementToastStack, type AchievementForToast } from '@/components/motion/achievement-toast'
import { getBadgeImage } from '@/lib/achievements/badge-images'
import type { AttemptResultForClient } from '@/lib/types'

export function ResultsClient({ quizId, attemptId }: { quizId: string; attemptId: string }) {
  const [result, setResult] = useState<AttemptResultForClient | null>(null)
  const [stage, setStage] = useState<'score' | 'xp' | 'levelUp' | 'badges' | 'streak' | 'cta'>('score')
  const [error, setError] = useState<string | null>(null)
  const [badgeIdx, setBadgeIdx] = useState(0)
  const [activeToasts, setActiveToasts] = useState<AchievementForToast[]>([])

  // When the result lands, queue up achievement toasts. They render as a
  // stack in the bottom-right and auto-dismiss after 4s each.
  useEffect(() => {
    if (!result?.newAchievements?.length) return
    const queued: AchievementForToast[] = result.newAchievements.map(a => ({
      id: a.id,
      name: a.name,
      description: a.description,
      tier_color: a.tier_color,
      image: getBadgeImage(a.scope, a.code),
    }))
    setActiveToasts(queued)
  }, [result])

  function dismissToast(id: string) {
    setActiveToasts(prev => prev.filter(t => t.id !== id))
  }

  // Submit (idempotent — server returns the same payload if already submitted)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await fetch(`/api/attempts/${attemptId}/submit`, { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (cancelled) return
      if (!res.ok) {
        setError(body?.error || 'Could not load results')
        return
      }
      setResult(body as AttemptResultForClient)
    })()
    return () => {
      cancelled = true
    }
  }, [attemptId])

  // Stage progression
  useEffect(() => {
    if (!result) return
    if (stage === 'score') {
      // Score number ticks up over 1500ms; advance after 1900ms
      const t = setTimeout(() => setStage('xp'), 1900)
      return () => clearTimeout(t)
    }
    if (stage === 'xp') {
      const t = setTimeout(() => setStage(result.xp.leveledUp ? 'levelUp' : (result.newBadges.length > 0 ? 'badges' : 'streak')), 1700)
      return () => clearTimeout(t)
    }
    if (stage === 'levelUp') {
      const t = setTimeout(() => setStage(result.newBadges.length > 0 ? 'badges' : 'streak'), 2200)
      return () => clearTimeout(t)
    }
    if (stage === 'badges') {
      // Badges advance manually via tap (next badge); auto-advance after the last one
      const t = setTimeout(() => {
        if (badgeIdx + 1 >= result.newBadges.length) setStage('streak')
        else setBadgeIdx(i => i + 1)
      }, 2200)
      return () => clearTimeout(t)
    }
    if (stage === 'streak') {
      const t = setTimeout(() => setStage('cta'), 1300)
      return () => clearTimeout(t)
    }
  }, [stage, result, badgeIdx])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-md rounded-2xl border border-danger/30 bg-danger/10 p-8 text-center">
          <p className="text-h3 font-semibold text-danger">{error}</p>
          <Link href="/home" className="mt-4 inline-block text-caption text-whitex-muted hover:text-white">
            ← Back to home
          </Link>
        </div>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="flex min-h-screen items-center justify-center text-caption text-whitex-muted">
        Tallying your score…
      </div>
    )
  }

  const maxScore = result.perQuestion.reduce(
    (s, _) => s,
    0,
  ) // we only have totalQuestions in the result; max is implicit in the percent.
  // Better: derive maxScore = round(finalScore / percent * 100) when percent > 0, else 0
  const max = result.percent > 0 ? Math.round((result.finalScore / result.percent) * 100) : 0
  // Color band per design §6.4
  const grad =
    result.percent === 100
      ? 'champion'
      : result.percent >= 70
      ? 'spring'
      : result.percent >= 50
      ? 'sunset'
      : 'ember'

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Backdrop accent for hype */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 800px 600px at 50% 30%, rgba(139,92,246,0.15), transparent 70%)',
        }}
      />

      <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-6 px-5 py-12 text-center">
        {/* Stage 1: score */}
        <motion.div
          key="score"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 240, damping: 22 }}
          className="flex flex-col items-center"
        >
          <p className="mb-3 text-micro uppercase tracking-[0.45em] text-whitex-faint">
            {result.attempt_kind === 'practice' ? '🎯 Practice score' : 'Your score'}
          </p>
          {result.attempt_kind === 'practice' ? (
            <p className="mb-2 text-caption text-whitex-muted">
              This was a practice attempt — your leaderboard score and XP are
              unchanged.
            </p>
          ) : null}
          <div className={`text-display-xl font-display tabular text-gradient-${grad} bg-clip-text text-transparent`}>
            <NumberTicker value={result.finalScore} duration={1500} />
          </div>
          <p className="mt-2 text-h2 text-whitex-muted">
            of {max} ·{' '}
            <span className={`text-gradient-${grad} bg-clip-text text-transparent font-semibold`}>
              {result.percent}%
            </span>
          </p>
          <p className="mt-1 text-caption text-whitex-faint">
            {result.perQuestion.filter(q => q.isCorrect).length} of {result.totalQuestions} correct
          </p>
        </motion.div>

        {/* Stage 2: XP card */}
        <AnimatePresence>
          {(stage === 'xp' || stage === 'levelUp' || stage === 'badges' || stage === 'streak' || stage === 'cta') &&
            result.xp.delta > 0 && (
              <motion.div
                key="xp"
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 220, damping: 22 }}
                className="w-full max-w-sm rounded-2xl border border-info/30 bg-midnight-elevated/60 p-5 backdrop-blur"
              >
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <p className="text-micro uppercase tracking-wider text-whitex-faint">XP earned</p>
                    <p className="mt-1 text-h1 font-bold text-gradient-aurora bg-clip-text text-transparent">
                      +<NumberTicker value={result.xp.delta} duration={1200} />
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-micro uppercase tracking-wider text-whitex-faint">Level</p>
                    <p className="mt-1 text-h2 font-bold text-white tabular">{result.xp.newLevel}</p>
                    <p className="text-caption text-whitex-muted">{result.xp.newTitle}</p>
                  </div>
                </div>
              </motion.div>
            )}
        </AnimatePresence>

        {/* Stage 3: Level up takeover */}
        <AnimatePresence>
          {stage === 'levelUp' && result.xp.leveledUp && (
            <motion.div
              key="levelup"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 flex items-center justify-center bg-midnight-deepest/95 backdrop-blur-xl"
            >
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 14 }}
                className="text-center"
              >
                <Sparkles className="mx-auto h-12 w-12 text-gradient-plasma" />
                <p className="mt-4 text-micro uppercase tracking-[0.5em] text-whitex-faint">Level up</p>
                <p className="mt-3 text-display-lg font-display font-bold text-gradient-plasma bg-clip-text text-transparent">
                  LEVEL {result.xp.newLevel}
                </p>
                <p className="mt-2 text-h2 text-whitex-soft">{result.xp.newTitle}</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stage 4: badges (one at a time) */}
        <AnimatePresence>
          {stage === 'badges' && result.newBadges[badgeIdx] && (
            <motion.div
              key={`badge-${badgeIdx}`}
              initial={{ rotateY: 180, opacity: 0, scale: 0.6 }}
              animate={{ rotateY: 0, opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 220, damping: 16 }}
              className="fixed inset-0 z-40 flex items-center justify-center bg-midnight-deepest/95 backdrop-blur-xl"
              onClick={() => {
                if (!result) return
                if (badgeIdx + 1 >= result.newBadges.length) setStage('streak')
                else setBadgeIdx(i => i + 1)
              }}
            >
              <div className="text-center">
                <p className="mb-2 text-micro uppercase tracking-[0.5em] text-whitex-faint">Badge unlocked</p>
                <div
                  className={`mx-auto flex h-32 w-32 items-center justify-center rounded-3xl bg-gradient-${result.newBadges[badgeIdx].gradient} shadow-glow-${result.newBadges[badgeIdx].gradient === 'champion' ? 'champion' : 'aurora'}`}
                >
                  <Star className="h-16 w-16 fill-white text-white drop-shadow-md" />
                </div>
                <p className="mt-5 text-h1 font-bold text-white">{result.newBadges[badgeIdx].name}</p>
                <p className="mt-1 max-w-xs text-caption text-whitex-muted">{result.newBadges[badgeIdx].description}</p>
                <p className="mt-6 text-micro uppercase tracking-wider text-whitex-faint">
                  Tap to continue ({badgeIdx + 1} / {result.newBadges.length})
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stage 5: streak card */}
        <AnimatePresence>
          {(stage === 'streak' || stage === 'cta') && result.streak.current > 0 && (
            <motion.div
              key="streak"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 240, damping: 24 }}
              className="w-full max-w-sm rounded-2xl border border-sunset-from/40 bg-gradient-sunset/10 p-5 backdrop-blur"
              style={{ background: 'linear-gradient(135deg, rgba(236,72,153,0.10), rgba(249,115,22,0.10))' }}
            >
              <div className="flex items-center gap-3">
                <Flame className="h-7 w-7 fill-current text-sunset-from" />
                <div className="text-left">
                  <p className="text-h2 font-bold text-white tabular">{result.streak.current}-day streak</p>
                  {result.streak.hitMilestone && (
                    <p className="text-caption text-sunset-from">Milestone unlocked!</p>
                  )}
                  {result.streak.freezeUsed && (
                    <p className="text-caption text-whitex-muted">A freeze was used to keep your streak alive ❄️</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stage 6: action buttons */}
        <AnimatePresence>
          {stage === 'cta' && (
            <motion.div
              key="cta"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mt-4 flex flex-col items-center gap-3 sm:flex-row"
            >
              <Link href={`/quiz/${quizId}/review?attempt=${attemptId}`}>
                <GradientButton gradient="aurora" size="md" asChild>
                  <span>Review your answers</span>
                </GradientButton>
              </Link>
              <Link href="/home">
                <Button
                  variant="ghost"
                  className="text-whitex-muted hover:bg-midnight-line hover:text-white"
                >
                  Back to home
                </Button>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        <Trophy className="pointer-events-none invisible h-0 w-0" />
      </div>

      <AchievementToastStack toasts={activeToasts} onDismiss={dismissToast} />
    </div>
  )
}
