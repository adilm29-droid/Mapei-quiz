'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { EMAIL_RE } from '@/lib/hr-survey'

const PREFILL_KEY = 'hr_respondent'

export default function SurveyGate() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const boxes = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(PREFILL_KEY) || 'null')
      if (saved?.name) setName(saved.name)
      if (saved?.email) setEmail(saved.email)
    } catch {}
    router.prefetch('/survey/form')
  }, [router])

  function setDigit(i: number, v: string) {
    const digits = v.replace(/\D/g, '')
    if (digits.length > 1) {
      // pasted the whole code
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

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const n = name.trim().replace(/\s+/g, ' ')
    const em = email.trim().toLowerCase()
    const pc = code.join('')
    if (n.length < 2) return setError('Please enter your full name.')
    if (!EMAIL_RE.test(em)) return setError('Please enter a valid email address.')
    if (pc.length !== 6) return setError('Please enter the 6-digit passcode from HR.')
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
      return setError(body?.error || 'Could not reach the server. Please try again.')
    }
    try {
      sessionStorage.setItem(PREFILL_KEY, JSON.stringify({ name: n, email: em }))
    } catch {}
    router.push('/survey/form')
  }

  return (
    <main className="hr-shell hr-fade">
      <div className="hr-brand">
        <span className="hr-brand-dot" aria-hidden="true" />
        LapizBlue · Human Resources
      </div>
      <div className="hr-card hr-accent">
        <h1 style={{ fontSize: 30, lineHeight: 1.15, marginBottom: 10 }}>Colleague Feedback Survey</h1>
        <p className="hr-sub">
          Ten short questions, rated 1 to 5. There are no right or wrong answers. It takes about two minutes.
        </p>
      </div>

      <form className="hr-card" onSubmit={submit} noValidate>
        <div className="hr-field">
          <label className="hr-label" htmlFor="hr-name">
            Your full name<span className="req" aria-hidden="true">*</span>
          </label>
          <input id="hr-name" autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Sara Ahmed" required />
        </div>
        <div className="hr-field">
          <label className="hr-label" htmlFor="hr-email">
            Work email<span className="req" aria-hidden="true">*</span>
          </label>
          <input
            id="hr-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="name@lapizblue.com"
            required
          />
        </div>
        <fieldset className="hr-field" style={{ border: 0, padding: 0, margin: '18px 0 0' }}>
          <legend className="hr-label">
            Passcode<span className="req" aria-hidden="true">*</span>
          </legend>
          <div className="hr-otp">
            {code.map((d, i) => (
              <input
                key={i}
                ref={el => {
                  boxes.current[i] = el
                }}
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
          <p className="hr-help">Ask HR for the 6-digit staff passcode.</p>
        </fieldset>
        {error && (
          <div className="hr-error" role="alert">
            {error}
          </div>
        )}
        <button className="hr-btn" type="submit" disabled={busy} style={{ marginTop: 22 }}>
          {busy ? 'Checking…' : 'Start survey'}
        </button>
      </form>
      <p className="hr-foot">Staff only · Responses are stored securely for HR KPI scoring</p>
    </main>
  )
}
