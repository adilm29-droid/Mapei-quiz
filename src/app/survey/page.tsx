'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { EMAIL_RE } from '@/lib/hr-survey'
import { StaggerText, MagneticButton, Arrow } from './_components/ui'
import { NamePicker } from './_components/NamePicker'
import { isJunkEmail, isJunkName } from '@/lib/hr-roster'

const Mascot = dynamic(() => import('./_components/Mascot'), { ssr: false })
const PREFILL_KEY = 'hr_respondent'

export default function SurveyGate() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [shake, setShake] = useState(false)
  const [mood, setMood] = useState(0)
  const [cheer, setCheer] = useState(0)
  const boxes = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(PREFILL_KEY) || 'null')
      if (saved?.name) setName(saved.name)
      if (saved?.email) setEmail(saved.email)
    } catch {}
    router.prefetch('/survey/form')
    // say hello once the mascot has loaded
    const t = setTimeout(() => {
      setMood(4)
      setCheer(c => c + 1)
    }, 1400)
    return () => clearTimeout(t)
  }, [router])

  function react(m: number) {
    setMood(m)
    setCheer(c => c + 1)
  }

  function setDigit(i: number, v: string) {
    const digits = v.replace(/\D/g, '')
    if (digits.length > 1) {
      const next = [...code]
      for (let k = 0; k < digits.length && i + k < 6; k++) next[i + k] = digits[k]
      setCode(next)
      boxes.current[Math.min(i + digits.length, 5)]?.focus()
      return
    }
    const next = [...code]
    next[i] = digits
    setCode(next)
    if (digits && i < 5) boxes.current[i + 1]?.focus()
  }

  function onKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !code[i] && i > 0) boxes.current[i - 1]?.focus()
    if (e.key === 'ArrowLeft' && i > 0) boxes.current[i - 1]?.focus()
    if (e.key === 'ArrowRight' && i < 5) boxes.current[i + 1]?.focus()
  }

  function fail(msg: string) {
    setError(msg)
    setShake(true)
    setTimeout(() => setShake(false), 500)
    react(1)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const n = name.trim().replace(/\s+/g, ' ')
    const em = email.trim().toLowerCase()
    const pc = code.join('')
    if (n.length < 2) return fail('Please enter your full name.')
    if (isJunkName(n)) return fail('Please enter your real name — pick it from the list as you type.')
    if (!EMAIL_RE.test(em)) return fail('Please enter a valid email address.')
    if (isJunkEmail(em)) return fail('Please enter your own email address.')
    if (pc.length !== 6) return fail('Please enter the 6-digit passcode from HR.')
    setError('')
    setBusy(true)
    const res = await fetch('/api/survey/enter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: n, email: em, passcode: pc }),
    }).catch(() => null)
    const body = res ? await res.json().catch(() => ({})) : {}
    if (!res || !res.ok) {
      setBusy(false)
      if (res?.status === 401) {
        setCode(['', '', '', '', '', ''])
        boxes.current[0]?.focus()
      }
      return fail(body?.error || 'Could not reach the server. Please try again.')
    }
    try {
      sessionStorage.setItem(PREFILL_KEY, JSON.stringify({ name: body?.name || n, email: em }))
    } catch {}
    react(5)
    setTimeout(() => router.push('/survey/form'), 700)
  }

  return (
    <div className="sv-page">
      <header className="sv-top">
        <div className="sv-brand">
          <span className="sv-dot" aria-hidden="true" />
          <span className="eyebrow">LapizBlue · Human Resources</span>
        </div>
      </header>

      <div className="sv-card">
        <form className="sv-main" onSubmit={submit} noValidate>
          <div className="sv-body">
            <span className="eyebrow">Colleague Feedback · 2 minutes</span>
            <StaggerText text="Tell us how work really feels." className="display" as="h1" />
            <p className="muted" style={{ fontSize: 17, lineHeight: 1.55, marginTop: 14, maxWidth: 460 }}>
              Ten short questions, rated 1 to 5. There are no right or wrong answers — only honest ones.
            </p>

            <div style={{ marginTop: 26, maxWidth: 460 }}>
              <NamePicker id="hr-name" label="Your name" value={name} onChange={n => setName(n)} autoComplete="name" />
              <div className="field">
                <input
                  id="hr-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  placeholder=" "
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
                <label htmlFor="hr-email">Work email</label>
                <span className="line" />
              </div>
            </div>

            <fieldset style={{ border: 0, padding: 0, margin: '26px 0 0' }}>
              <legend className="eyebrow" style={{ marginBottom: 10 }}>
                Staff passcode
              </legend>
              <div className={`otp ${shake ? 'shake' : ''}`}>
                {code.map((d, i) => (
                  <input
                    key={i}
                    ref={el => {
                      boxes.current[i] = el
                    }}
                    className={d ? 'filled' : ''}
                    value={d}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete={i === 0 ? 'one-time-code' : 'off'}
                    maxLength={i === 0 ? 6 : 1}
                    aria-label={`Passcode digit ${i + 1} of 6`}
                    aria-invalid={error.includes('passcode') ? 'true' : undefined}
                    onChange={e => setDigit(i, e.target.value)}
                    onKeyDown={e => onKey(i, e)}
                    onFocus={e => e.target.select()}
                  />
                ))}
              </div>
              <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>
                Ask HR for the 6-digit code.
              </p>
            </fieldset>

            {error && (
              <div className="err" role="alert">
                {error}
              </div>
            )}
          </div>

          <div className="sv-foot">
            <span className="muted" style={{ fontSize: 13 }}>
              Staff only · confidential
            </span>
            <MagneticButton type="submit" disabled={busy}>
              {busy ? 'Checking…' : 'Begin'} <Arrow />
            </MagneticButton>
          </div>
        </form>

        <aside className="sv-stage">
          <Mascot mood={mood} cheer={cheer} />
          <p className="sv-stage-note">Say hi to Pank — click to tickle</p>
        </aside>
      </div>
    </div>
  )
}
