'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { MoveRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { LoadingScreen } from '@/components/loading-screen'
import { LogoFull } from '@/components/brand/LogoFull'
import { AuthForm } from '@/components/auth/AuthForm'

interface Beam {
  x: number
  y: number
  width: number
  length: number
  angle: number
  speed: number
  opacity: number
  pulse: number
  pulseSpeed: number
  layer: number
}

const LAYERS = 3
const BEAMS_PER_LAYER = 8
const POWER_WORDS = ['STRONGER', 'HARDER', 'SHARPER', 'WIN']
const ROTATE_INTERVAL_MS = 2000
const INTRO_DURATION_MS = 1300

function createBeam(width: number, height: number, layer: number): Beam {
  const angle = -35 + Math.random() * 10
  const baseSpeed = 0.18 + layer * 0.18
  const baseOpacity = 0.07 + layer * 0.05
  const baseWidth = 10 + layer * 5
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    width: baseWidth,
    length: height * 2.5,
    angle,
    speed: baseSpeed + Math.random() * 0.2,
    opacity: baseOpacity + Math.random() * 0.1,
    pulse: Math.random() * Math.PI * 2,
    pulseSpeed: 0.01 + Math.random() * 0.015,
    layer,
  }
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const noiseRef = useRef<HTMLCanvasElement>(null)
  const beamsRef = useRef<Beam[]>([])
  const rafRef = useRef<number>(0)
  const [wordIndex, setWordIndex] = useState(0)
  const [intro, setIntro] = useState(true)
  const [splitMode, setSplitMode] = useState(false)
  const [reelOn, setReelOn] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem('lpz_intro_seen')) setIntro(false)
  }, [])

  // Word reel only ticks while it's on
  useEffect(() => {
    if (!reelOn) return
    const id = setInterval(() => setWordIndex(prev => (prev + 1) % POWER_WORDS.length), ROTATE_INTERVAL_MS)
    return () => clearInterval(id)
  }, [reelOn])

  // Canvas beam background
  useEffect(() => {
    const canvas = canvasRef.current
    const noiseCanvas = noiseRef.current
    if (!canvas || !noiseCanvas) return
    const ctx = canvas.getContext('2d')
    const nCtx = noiseCanvas.getContext('2d')
    if (!ctx || !nCtx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.scale(dpr, dpr)

      noiseCanvas.width = window.innerWidth * dpr
      noiseCanvas.height = window.innerHeight * dpr
      noiseCanvas.style.width = `${window.innerWidth}px`
      noiseCanvas.style.height = `${window.innerHeight}px`
      nCtx.setTransform(1, 0, 0, 1, 0, 0)
      nCtx.scale(dpr, dpr)

      beamsRef.current = []
      for (let layer = 1; layer <= LAYERS; layer++) {
        for (let i = 0; i < BEAMS_PER_LAYER; i++) {
          beamsRef.current.push(createBeam(window.innerWidth, window.innerHeight, layer))
        }
      }
    }

    resize()
    window.addEventListener('resize', resize)

    const generateNoise = () => {
      const img = nCtx.createImageData(noiseCanvas.width, noiseCanvas.height)
      for (let i = 0; i < img.data.length; i += 4) {
        const v = Math.random() * 255
        img.data[i] = v
        img.data[i + 1] = v
        img.data[i + 2] = v
        img.data[i + 3] = 10
      }
      nCtx.putImageData(img, 0, 0)
    }

    const drawBeam = (beam: Beam) => {
      ctx.save()
      ctx.translate(beam.x, beam.y)
      ctx.rotate((beam.angle * Math.PI) / 180)
      const pulsing = Math.min(1, beam.opacity * (0.8 + Math.sin(beam.pulse) * 0.4))
      const grad = ctx.createLinearGradient(0, 0, 0, beam.length)
      grad.addColorStop(0,   'rgba(220,235,255,0)')
      grad.addColorStop(0.2, `rgba(220,235,255,${pulsing * 0.5})`)
      grad.addColorStop(0.5, `rgba(220,235,255,${pulsing})`)
      grad.addColorStop(0.8, `rgba(220,235,255,${pulsing * 0.5})`)
      grad.addColorStop(1,   'rgba(220,235,255,0)')
      ctx.fillStyle = grad
      ctx.filter = `blur(${2 + beam.layer * 2}px)`
      ctx.fillRect(-beam.width / 2, 0, beam.width, beam.length)
      ctx.restore()
    }

    const animate = () => {
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height)
      grad.addColorStop(0, '#040a1c')
      grad.addColorStop(1, '#0d1f44')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      beamsRef.current.forEach(beam => {
        if (!reduced) {
          beam.y -= beam.speed * (beam.layer / LAYERS + 0.5)
          beam.pulse += beam.pulseSpeed
          if (beam.y + beam.length < -50) {
            beam.y = window.innerHeight + 50
            beam.x = Math.random() * window.innerWidth
          }
        }
        drawBeam(beam)
      })

      generateNoise()
      rafRef.current = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  function dismissIntro() {
    if (typeof window !== 'undefined') sessionStorage.setItem('lpz_intro_seen', '1')
    setIntro(false)
  }

  function openSignIn() {
    setReelOn(true)
    setSplitMode(true)
  }

  return (
    <>
      <AnimatePresence>
        {intro && <LoadingScreen key="intro" onComplete={dismissIntro} duration={INTRO_DURATION_MS} />}
      </AnimatePresence>

      <main className="relative h-screen w-full overflow-hidden bg-[#040a1c]">
        <canvas ref={noiseRef} className="pointer-events-none absolute inset-0 z-0" />
        <canvas ref={canvasRef} className="absolute inset-0 z-10" />

        {/* Top-left brand */}
        <div className="absolute left-6 top-6 z-30 sm:left-10 sm:top-8">
          <LogoFull markClassName="h-8 w-8" wordmarkClassName="h-6" />
        </div>

        {/* Form panel — slides in from the left */}
        <AnimatePresence>
          {splitMode && (
            <motion.aside
              key="form-panel"
              initial={{ x: '-100%', opacity: 0 }}
              animate={{ x: '0%', opacity: 1 }}
              exit={{ x: '-100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 90, damping: 22, mass: 0.8 }}
              className="absolute inset-y-0 left-0 z-30 flex w-full items-center justify-center overflow-y-auto px-6 py-20 backdrop-blur-xl md:w-1/2 md:py-10"
              style={{
                background:
                  'linear-gradient(135deg, rgba(5,11,31,0.92) 0%, rgba(7,18,46,0.88) 50%, rgba(10,23,64,0.82) 100%)',
                borderRight: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <AuthForm />
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Hero panel — full width by default, shrinks to right half on split */}
        <motion.div
          className="absolute inset-y-0 right-0 z-20 flex items-center justify-center px-6"
          initial={false}
          animate={{ width: splitMode ? '50%' : '100%' }}
          transition={{ type: 'spring', stiffness: 90, damping: 22, mass: 0.8 }}
        >
          <motion.div
            layout
            transition={{ type: 'spring', stiffness: 90, damping: 22 }}
            className="flex w-full max-w-3xl flex-col items-center gap-10 text-center"
          >
            <h1 className="font-sans text-5xl font-light tracking-tight text-white md:text-7xl">
              <span className="block font-extralight text-white/85">Lapiz Blue</span>
              <span className="block font-bold tracking-tighter">Quiz Contest</span>
            </h1>

            {/* Subtitle + word reel */}
            <div className="flex flex-col items-center gap-3">
              <p className="font-sans text-lg text-white/65 md:text-xl">Get better with products,</p>

              {/* Reel container — fixed pixel height so absolute children render */}
              <div className="relative flex h-14 w-full items-center justify-center overflow-hidden md:h-16">
                <AnimatePresence>
                  {reelOn &&
                    POWER_WORDS.map((word, i) => (
                      <motion.span
                        key={word}
                        className="absolute inset-0 flex items-center justify-center font-sans text-3xl font-bold tracking-[0.18em] text-white md:text-4xl"
                        initial={{ opacity: 0, y: '100%' }}
                        transition={{ type: 'spring', stiffness: 70, damping: 16 }}
                        animate={
                          wordIndex === i
                            ? { opacity: 1, y: '0%' }
                            : { opacity: 0, y: wordIndex > i ? '-120%' : '120%' }
                        }
                      >
                        {word}
                      </motion.span>
                    ))}
                </AnimatePresence>
              </div>
            </div>

            {/* CTA — hidden once split mode opens */}
            <AnimatePresence>
              {!splitMode && (
                <motion.div
                  key="cta"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16, scale: 0.96 }}
                  transition={{ duration: 0.3 }}
                >
                  <Button
                    size="lg"
                    onClick={openSignIn}
                    className="group gap-3 rounded-full bg-white px-8 text-base font-semibold text-[#040a1c] shadow-[0_0_40px_rgba(180,210,255,0.25)] hover:bg-white/90"
                  >
                    Hop on the Quiz
                    <MoveRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>

        {/* Footer */}
        <div className="absolute bottom-6 left-0 right-0 z-30 text-center text-[10px] font-medium uppercase tracking-[0.3em] text-white/35">
          LapizBlue © 2026 · v1.0 · Internal Use Only
        </div>
      </main>
    </>
  )
}
