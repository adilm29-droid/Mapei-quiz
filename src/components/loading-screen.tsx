'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import gsap from 'gsap'

import { LogoFull } from './brand/LogoFull'

interface LoadingScreenProps {
  onComplete: () => void
  duration?: number
}

export function LoadingScreen({ onComplete, duration = 1300 }: LoadingScreenProps) {
  const cloudA = useRef<HTMLDivElement>(null)
  const cloudB = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setTimeout(onComplete, duration)
    return () => clearTimeout(t)
  }, [duration, onComplete])

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return

    const ctx = gsap.context(() => {
      if (cloudA.current) gsap.to(cloudA.current, { xPercent: -25, duration: 60, repeat: -1, ease: 'none' })
      if (cloudB.current) gsap.to(cloudB.current, { xPercent: -20, duration: 90, repeat: -1, ease: 'none' })
    })
    return () => ctx.revert()
  }, [])

  return (
    <motion.div
      className="fixed inset-0 z-50 overflow-hidden bg-gradient-to-b from-[#040a1c] via-[#06122e] to-[#0a1740]"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: 'easeInOut' }}
    >
      {/* Cloud layers — pure radial gradients, no filter:blur (filter triggers GPU repaint per frame) */}
      <div
        ref={cloudA}
        aria-hidden
        className="pointer-events-none absolute -left-1/4 top-[20%] h-[55%] w-[160%] opacity-55 motion-reduce:hidden"
        style={{
          background:
            'radial-gradient(ellipse 30% 60% at 20% 50%, rgba(170,200,240,0.20), transparent 70%), radial-gradient(ellipse 28% 55% at 60% 45%, rgba(150,180,225,0.14), transparent 70%), radial-gradient(ellipse 30% 60% at 88% 60%, rgba(180,210,245,0.18), transparent 70%)',
          willChange: 'transform',
          transform: 'translateZ(0)',
        }}
      />
      <div
        ref={cloudB}
        aria-hidden
        className="pointer-events-none absolute -left-1/4 top-[55%] h-[55%] w-[160%] opacity-40 motion-reduce:hidden"
        style={{
          background:
            'radial-gradient(ellipse 38% 55% at 30% 50%, rgba(120,150,210,0.16), transparent 70%), radial-gradient(ellipse 34% 55% at 78% 60%, rgba(150,180,225,0.12), transparent 70%)',
          willChange: 'transform',
          transform: 'translateZ(0)',
        }}
      />

      {/* Soft vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.45)_100%)]" />

      {/* Center: standard horizontal logo lockup, ONLY the circle spins */}
      <div className="relative z-10 flex h-full w-full flex-col items-center justify-center gap-7">
        <LogoFull
          spinMark
          className="gap-5"
          markClassName="h-20 w-20"
          wordmarkClassName="h-12 w-auto"
        />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="flex items-center gap-2 font-sans text-[11px] font-medium uppercase tracking-[0.45em] text-white/65"
        >
          <span>Loading</span>
          <span className="loading-dots inline-flex gap-1">
            <span />
            <span />
            <span />
          </span>
        </motion.div>
      </div>

      <style jsx>{`
        .loading-dots span {
          width: 3px;
          height: 3px;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.7);
          display: inline-block;
          animation: dotPulse 1.1s ease-in-out infinite;
        }
        .loading-dots span:nth-child(2) { animation-delay: 0.13s; }
        .loading-dots span:nth-child(3) { animation-delay: 0.26s; }
        @keyframes dotPulse {
          0%, 80%, 100% { opacity: 0.25; transform: translateY(0); }
          40%           { opacity: 1;    transform: translateY(-2px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .loading-dots span { animation: none; opacity: 0.7; }
        }
      `}</style>
    </motion.div>
  )
}
