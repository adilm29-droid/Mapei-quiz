'use client'

import { useRef } from 'react'
import { motion, useMotionValue, useSpring, useReducedMotion, AnimatePresence } from 'motion/react'

export const EASE_OUT = [0.23, 1, 0.32, 1] as const
export const EASE_SHEET = [0.32, 0.72, 0, 1] as const

/** Words rise in one by one with a soft blur. */
export function StaggerText({ text, className, as = 'h1', delay = 0, id }: { text: string; className?: string; as?: 'h1' | 'h2' | 'p'; delay?: number; id?: string }) {
  const reduce = useReducedMotion()
  const Tag = motion[as]
  const words = text.split(' ')
  return (
    <Tag id={id} className={className} aria-label={text}>
      {words.map((w, i) => (
        <motion.span
          key={i}
          aria-hidden="true"
          style={{ display: 'inline-block', whiteSpace: 'pre' }}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: '0.45em', filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.42, ease: EASE_OUT, delay: delay + i * 0.03 }}
        >
          {w}
          {i < words.length - 1 ? ' ' : ''}
        </motion.span>
      ))}
    </Tag>
  )
}

/** Primary button that leans toward the cursor (off for touch + reduced motion). */
export function MagneticButton({ children, className = 'sv-btn', ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLButtonElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 300, damping: 20, mass: 0.6 })
  const sy = useSpring(y, { stiffness: 300, damping: 20, mass: 0.6 })
  return (
    <motion.button
      ref={ref}
      className={className}
      style={{ x: sx, y: sy }}
      onPointerMove={e => {
        if (reduce || e.pointerType !== 'mouse' || !ref.current) return
        const r = ref.current.getBoundingClientRect()
        x.set((e.clientX - (r.left + r.width / 2)) * 0.3)
        y.set((e.clientY - (r.top + r.height / 2)) * 0.35)
      }}
      onPointerLeave={() => {
        x.set(0)
        y.set(0)
      }}
      {...(rest as any)}
    >
      {children}
    </motion.button>
  )
}

/** Writes --x / --y for a cursor-follow spotlight. */
export function spotlight(e: React.PointerEvent<HTMLElement>) {
  const el = e.currentTarget
  const r = el.getBoundingClientRect()
  el.style.setProperty('--x', `${e.clientX - r.left}px`)
  el.style.setProperty('--y', `${e.clientY - r.top}px`)
}

/** "03 / 10" with rolling digits. */
export function Counter({ value, total }: { value: number; total: number }) {
  const v = String(value).padStart(2, '0')
  return (
    <span className="count" aria-label={`Question ${value} of ${total}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={v}
          style={{ display: 'inline-block' }}
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '-100%', opacity: 0 }}
          transition={{ duration: 0.3, ease: EASE_OUT }}
        >
          {v}
        </motion.span>
      </AnimatePresence>
      <span style={{ opacity: 0.45 }}> / {String(total).padStart(2, '0')}</span>
    </span>
  )
}

export function Arrow({ className = 'arrow' }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
