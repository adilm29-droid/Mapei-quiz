'use client'

import { motion } from 'motion/react'
import { AlarmClock } from 'lucide-react'

export function TimeUpModal() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
        className="max-w-sm rounded-3xl border border-danger/40 bg-midnight-elevated p-8 text-center shadow-glow-ember"
      >
        <AlarmClock className="mx-auto h-10 w-10 text-danger" />
        <p className="mt-4 text-h2 font-semibold text-white">Time's up</p>
        <p className="mt-2 text-caption text-whitex-muted">Submitting your quiz…</p>
      </motion.div>
    </motion.div>
  )
}
