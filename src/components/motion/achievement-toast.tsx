'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import confetti from 'canvas-confetti'
import { Award } from 'lucide-react'

/**
 * AchievementToast per CLAUDE_CODE_PROMPT.md §7.
 *
 * Slides in from the bottom-right with the icon, name and a brief
 * confetti burst. Auto-dismisses after 4s. Multiple toasts stack
 * vertically because the parent uses position: fixed bottom-right
 * and inserts each toast as a flex column item.
 *
 * Usage:
 *   <AchievementToastStack toasts={newAchievements} onDone={...} />
 *
 * The component fires its own canvas-confetti burst when mounted —
 * a small celebration without taking over the screen.
 */

export interface AchievementForToast {
  id: string
  name: string
  description: string
  tier_color: string
}

const TIER_BG: Record<string, string> = {
  slate: 'from-slate-500 to-slate-700',
  bronze: 'from-amber-700 to-amber-900',
  silver: 'from-slate-300 to-slate-500',
  champion: 'from-amber-300 to-yellow-500',
  spring: 'from-emerald-400 to-cyan-500',
  aurora: 'from-blue-500 to-violet-500',
  plasma: 'from-fuchsia-500 to-pink-500',
  sunset: 'from-pink-500 to-orange-500',
  ember: 'from-red-500 to-orange-500',
}

export function AchievementToastStack({
  toasts,
  onDismiss,
}: {
  toasts: AchievementForToast[]
  onDismiss: (id: string) => void
}) {
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {toasts.map(t => (
          <Toast key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
        ))}
      </AnimatePresence>
    </div>
  )
}

function Toast({
  toast,
  onDismiss,
}: {
  toast: AchievementForToast
  onDismiss: () => void
}) {
  useEffect(() => {
    // Brief confetti burst from the toast's anchor (bottom-right region)
    confetti({
      particleCount: 40,
      spread: 60,
      origin: { x: 0.9, y: 0.85 },
      ticks: 80,
    })
    const t = setTimeout(onDismiss, 4000)
    return () => clearTimeout(t)
  }, [onDismiss])

  const tier = TIER_BG[toast.tier_color] ?? TIER_BG.aurora

  return (
    <motion.div
      initial={{ x: 80, opacity: 0, scale: 0.9 }}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      exit={{ x: 40, opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 320, damping: 24 }}
      className={
        'pointer-events-auto flex max-w-[320px] items-start gap-3 rounded-2xl bg-gradient-to-br p-3 pr-4 text-white shadow-2xl ring-1 ring-white/20 ' +
        tier
      }
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15">
        <Award className="h-6 w-6 drop-shadow" />
      </div>
      <div>
        <p className="text-micro font-semibold uppercase tracking-wider text-white/80">
          Achievement unlocked
        </p>
        <p className="mt-0.5 text-caption font-bold leading-tight">{toast.name}</p>
        <p className="mt-0.5 text-micro text-white/85">{toast.description}</p>
      </div>
    </motion.div>
  )
}
