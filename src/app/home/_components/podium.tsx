'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Lock, Trophy } from 'lucide-react'
import { Avatar } from '@/components/avatar/avatar'
import { cn } from '@/lib/utils'

interface PodiumUser {
  id: string
  username: string
  first_name: string | null
  last_name: string | null
  score: number
  maxScore: number
}

interface PodiumProps {
  users: PodiumUser[]            // ordered by rank: [#1, #2, #3]
  maxScore: number
  revealed: boolean
  attemptsSoFar: number
  isAdmin: boolean
  currentUserId: string
}

const PEDESTAL_HEIGHT = { 1: 140, 2: 110, 3: 80 } as const
const PEDESTAL_WIDTH = { 1: 110, 2: 100, 3: 100 } as const
const RANK_GRADIENT = { 1: 'champion', 2: 'silver', 3: 'bronze' } as const

export function Podium({ users, maxScore, revealed, attemptsSoFar, isAdmin, currentUserId }: PodiumProps) {
  const [showConfetti, setShowConfetti] = useState(false)
  const ordered = users.slice(0, 3)
  const champion = ordered[0]
  const youAreChamp = champion?.id === currentUserId

  // Daily-once confetti for #1
  useEffect(() => {
    if (!revealed || !youAreChamp) return
    if (typeof window === 'undefined') return
    const today = new Date().toISOString().slice(0, 10)
    const seenKey = `confetti_seen_${today}`
    if (localStorage.getItem(seenKey)) return
    localStorage.setItem(seenKey, '1')
    // Lazy load to keep initial JS slim
    setShowConfetti(true)
    setTimeout(() => setShowConfetti(false), 3500)
  }, [revealed, youAreChamp])

  return (
    <section className="rounded-3xl border border-midnight-line bg-midnight-elevated/40 px-6 pb-10 pt-7 backdrop-blur">
      <div className="mb-7 flex items-center justify-center gap-2 text-micro uppercase tracking-[0.4em] text-whitex-faint">
        <Trophy className="h-3.5 w-3.5" />
        <span>This week's podium</span>
      </div>

      {!revealed ? (
        <PodiumPlaceholder attemptsSoFar={attemptsSoFar} isAdmin={isAdmin} />
      ) : (
        <div className="relative flex items-end justify-center gap-4 sm:gap-8">
          {ordered[2] ? <Pedestal user={ordered[2]} rank={3} maxScore={maxScore} delayMs={0}   /> : <PedestalGap rank={3} />}
          {ordered[0] ? <Pedestal user={ordered[0]} rank={1} maxScore={maxScore} delayMs={240} /> : <PedestalGap rank={1} />}
          {ordered[1] ? <Pedestal user={ordered[1]} rank={2} maxScore={maxScore} delayMs={120} /> : <PedestalGap rank={2} />}

          <AnimatePresence>{showConfetti && <ConfettiBurst />}</AnimatePresence>
        </div>
      )}
    </section>
  )
}

function Pedestal({
  user,
  rank,
  maxScore,
  delayMs,
}: {
  user: PodiumUser
  rank: 1 | 2 | 3
  maxScore: number
  delayMs: number
}) {
  return (
    <motion.div
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 18, delay: delayMs / 1000 }}
      className="flex w-[100px] flex-col items-center gap-3 sm:w-[110px]"
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.25, delay: (delayMs + 220) / 1000 }}
        className="flex flex-col items-center gap-2"
      >
        <Avatar
          username={user.username}
          first_name={user.first_name}
          last_name={user.last_name}
          size="lg"
          champion={rank === 1}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: (delayMs + 350) / 1000 }}
        className="text-center"
      >
        <div className="text-h3 font-semibold text-white">
          {[user.first_name, user.last_name].filter(Boolean).join(' ') || `@${user.username}`}
        </div>
        <div className="mt-0.5 font-mono text-caption tabular text-whitex-muted">
          {user.score} / {user.maxScore || maxScore}
        </div>
      </motion.div>

      <div
        className={cn(
          'flex items-center justify-center rounded-t-xl border border-midnight-line text-display-md font-bold text-white shadow-lg',
          rank === 1 && 'bg-gradient-champion shadow-glow-champion',
          rank === 2 && 'bg-gradient-silver',
          rank === 3 && 'bg-gradient-bronze',
        )}
        style={{ height: PEDESTAL_HEIGHT[rank], width: PEDESTAL_WIDTH[rank] }}
      >
        {rank}
      </div>
    </motion.div>
  )
}

function PedestalGap({ rank }: { rank: 1 | 2 | 3 }) {
  return (
    <div
      className="flex w-[100px] items-end justify-center rounded-t-xl border border-dashed border-midnight-line bg-midnight-deepest/40 text-h3 text-whitex-faint sm:w-[110px]"
      style={{ height: PEDESTAL_HEIGHT[rank], width: PEDESTAL_WIDTH[rank] }}
    >
      —
    </div>
  )
}

function PodiumPlaceholder({ attemptsSoFar, isAdmin }: { attemptsSoFar: number; isAdmin: boolean }) {
  return (
    <div className="relative flex items-end justify-center gap-4 sm:gap-8 opacity-60">
      <div
        aria-hidden
        className="flex w-[100px] items-end rounded-t-xl border border-dashed border-midnight-line bg-midnight-deepest/30 sm:w-[110px]"
        style={{ height: 80 }}
      />
      <div
        aria-hidden
        className="flex w-[100px] items-end rounded-t-xl border border-dashed border-midnight-line bg-midnight-deepest/30 sm:w-[110px]"
        style={{ height: 140 }}
      />
      <div
        aria-hidden
        className="flex w-[100px] items-end rounded-t-xl border border-dashed border-midnight-line bg-midnight-deepest/30 sm:w-[110px]"
        style={{ height: 110 }}
      />

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
        <Lock className="h-6 w-6 animate-pulse text-whitex-muted" />
        <p className="max-w-[260px] text-body text-whitex-soft">
          Leaderboard reveals once 5 staff complete this week's quiz.
        </p>
        {isAdmin && (
          <p className="text-micro uppercase tracking-wider text-whitex-faint">
            {attemptsSoFar} / 5 attempts so far
          </p>
        )}
      </div>
    </div>
  )
}

/** Tiny inline confetti — 36 short-lived absolutely-positioned dots. */
function ConfettiBurst() {
  const particles = Array.from({ length: 36 }, (_, i) => i)
  const colors = ['#FCD34D', '#06B6D4', '#8B5CF6', '#EC4899', '#34D399', '#F97316']
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="pointer-events-none absolute inset-0 overflow-visible"
      aria-hidden
    >
      {particles.map(i => {
        const dx = (Math.random() - 0.5) * 360
        const dy = -Math.random() * 240 - 80
        const rot = (Math.random() - 0.5) * 720
        return (
          <motion.div
            key={i}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
            animate={{ x: dx, y: dy + 320, opacity: 0, rotate: rot }}
            transition={{ duration: 2.6 + Math.random() * 0.8, ease: 'easeOut' }}
            className="absolute left-1/2 top-1/2 h-2 w-2 rounded-sm"
            style={{ background: colors[i % colors.length] }}
          />
        )
      })}
    </motion.div>
  )
}
