'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { SURVEYS, SCALE, normaliseName, type SurveyType } from '@/lib/hr-survey'
import { StaggerText, MagneticButton, Counter, Arrow, spotlight, EASE_SHEET } from '../_components/ui'

// three.js mascot loads after the form, client-only
const Mascot = dynamic(() => import('../_components/Mascot'), { ssr: false })

const EMPTY: number[] = Array(10).fill(0)
const ADVANCE_MS = 450
type Step = 'type' | 'who' | 'q' | 'comment' | 'done'

const slide = {
  enter: (dir: number) => ({ opacity: 0, y: dir * 26, filter: 'blur(3px)' }),
  center: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: (dir: number) => ({ opacity: 0, y: dir * -18, scale: 0.98, filter: 'blur(3px)' }),
}

export default function SurveyForm() {
  const router = useRouter()
  const reduce = useReducedMotion()
  const [me, setMe] = useState<{ name: string; email: string } | null>(null)
  const [step, setStep] = useState<Step>('type')
  const [qi, setQi] = useState(0)
  const [dir, setDir] = useState(1)
  const [type, setType] = useState<SurveyType | null>(null)
  const [dept, setDept] = useState('')
  const [assessed, setAssessed] = useState('')
  const [answers, setAnswers] = useState<number[]>(EMPTY)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [known, setKnown] = useState<{ names: string[]; depts: string[] }>({ names: [], depts: [] })
  const [result, setResult] = useState<{ total: number; kpi: number } | null>(null)
  const [mood, setMood] = useState(0)
  const [cheer, setCheer] = useState(0)
  const [shy, setShy] = useState(false)
  const [calm, setCalm] = useState(false)
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch('/api/survey/names')
      .then(async res => {
        if (res.status === 401) return router.replace('/survey')
        const body = await res.json().catch(() => ({}))
        if (body?.me) setMe(body.me)
        setKnown({ names: body?.names ?? [], depts: body?.depts ?? [] })
      })
      .catch(() => router.replace('/survey'))
    try {
      setCalm(localStorage.getItem('pank_calm') === '1')
    } catch {}
  }, [router])

  const survey = type ? SURVEYS[type] : null
  const answered = answers.filter(Boolean).length

  const react = (m: number) => {
    setMood(m)
    setCheer(c => c + 1)
  }

  function go(next: Step, d = 1) {
    setDir(d)
    setError('')
    setStep(next)
  }

  function pick(t: SurveyType) {
    setType(t)
    react(4)
    go('who')
  }

  function toQuestions(e: React.FormEvent) {
    e.preventDefault()
    if (!me) return
    const n = normaliseName(assessed)
    if (n.length < 2) {
      react(1)
      return setError('Please enter the name of the person you are rating.')
    }
    if (normaliseName(me.name) === n) {
      react(1)
      return setError('This survey is for rating someone else, not yourself.')
    }
    setAssessed(n)
    setDept(normaliseName(dept))
    setQi(0)
    go('q')
  }

  const toQuestion = useCallback((i: number) => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current)
    setDir(i >= qi ? 1 : -1)
    setQi(i)
  }, [qi])

  const answer = useCallback(
    (v: number) => {
      setAnswers(a => {
        const n = [...a]
        n[qi] = v
        return n
      })
      react(v)
      if (advanceTimer.current) clearTimeout(advanceTimer.current)
      advanceTimer.current = setTimeout(() => {
        if (qi < 9) {
          setDir(1)
          setQi(qi + 1)
        } else {
          go('comment')
        }
      }, ADVANCE_MS)
    },
    [qi],
  )

  function back() {
    if (advanceTimer.current) clearTimeout(advanceTimer.current)
    if (step === 'q' && qi > 0) return toQuestion(qi - 1)
    if (step === 'q') return go('who', -1)
    if (step === 'comment') {
      setQi(9)
      return go('q', -1)
    }
    if (step === 'who') return go('type', -1)
  }

  // keyboard: 1–5 to rate, Enter to continue, ← to go back
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (step !== 'q') return
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key >= '1' && e.key <= '5') answer(Number(e.key))
      else if (e.key === 'Enter' && answers[qi]) {
        if (qi < 9) toQuestion(qi + 1)
        else go('comment')
      } else if (e.key === 'ArrowLeft' || e.key === 'Backspace') back()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  async function submit() {
    const missing = answers.findIndex(a => !a)
    if (missing !== -1) {
      setQi(missing)
      go('q', -1)
      return
    }
    setBusy(true)
    const res = await fetch('/api/survey/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, assessed, department: dept, answers, comment }),
    }).catch(() => null)
    const body = res ? await res.json().catch(() => ({})) : {}
    setBusy(false)
    if (!res || !res.ok) {
      if (res?.status === 401) return router.replace('/survey')
      react(1)
      return setError(body?.error || 'Could not save your answers. Please check your connection and try again.')
    }
    setResult(type === 'B' ? { total: body.total, kpi: body.kpi } : null)
    setShy(false)
    go('done')
  }

  function another() {
    setType(null)
    setAssessed('')
    setAnswers(EMPTY)
    setComment('')
    setResult(null)
    setQi(0)
    setMood(0)
    go('type')
  }

  async function finish() {
    await fetch('/api/survey/enter', { method: 'DELETE' }).catch(() => null)
    try {
      sessionStorage.removeItem('hr_respondent')
    } catch {}
    router.push('/survey')
  }

  function toggleCalm() {
    setCalm(c => {
      try {
        localStorage.setItem('pank_calm', c ? '0' : '1')
      } catch {}
      return !c
    })
  }

  if (!me) return null

  const stepKey = step === 'q' ? `q${qi}` : step
  const transition = { duration: reduce ? 0.15 : 0.45, ease: EASE_SHEET }

  return (
    <div className="sv-page">
      <header className="sv-top">
        <div className="sv-brand">
          <span className="sv-dot" aria-hidden="true" />
          <span className="eyebrow">Colleague Feedback</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button type="button" className="calm" aria-pressed={calm} onClick={toggleCalm}>
            <span className="sw" aria-hidden="true" /> Calm mode
          </button>
          <span className="muted" style={{ fontSize: 14, fontWeight: 600 }}>{me.name}</span>
        </div>
      </header>

      <div className={`sv-card ${step === 'done' ? 'is-done' : ''}`}>
        <div className="sv-main">
          {/* progress */}
          {(step === 'q' || step === 'comment') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div className="rail" aria-hidden="true">
                {answers.map((a, i) => (
                  <button
                    key={i}
                    type="button"
                    tabIndex={-1}
                    className={`${a ? 'done' : ''} ${step === 'q' && i === qi ? 'now' : ''}`}
                    onClick={() => a && (step === 'q' ? toQuestion(i) : (setQi(i), go('q', -1)))}
                  />
                ))}
              </div>
              <Counter value={step === 'q' ? qi + 1 : 10} total={10} />
            </div>
          )}

          <div className="sv-body">
            <AnimatePresence mode="wait" custom={dir} initial={false}>
              <motion.div
                key={stepKey}
                custom={dir}
                variants={slide}
                initial="enter"
                animate="center"
                exit="exit"
                transition={transition}
              >
                {step === 'type' && (
                  <section aria-labelledby="t-type">
                    <span className="eyebrow">Step 1 of 3</span>
                    <StaggerText text="Who are you giving feedback to?" className="display step-title" as="h1" />
                    <div className="choices">
                      {(['A', 'B'] as const).map(k => (
                        <button key={k} type="button" className="choice spot" onPointerMove={spotlight} onClick={() => pick(k)}>
                          <span className="tag">{k}</span>
                          <span>
                            <span className="title">{k === 'A' ? 'My manager / HOD' : 'A team member or colleague'}</span>
                            <span className="sub" style={{ display: 'block' }}>{SURVEYS[k].blurb}</span>
                          </span>
                          <Arrow className="go" />
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                {step === 'who' && survey && (
                  <form onSubmit={toQuestions} noValidate>
                    <span className="eyebrow">Step 2 of 3 · Survey {type}</span>
                    <StaggerText text="Who are you rating?" className="display step-title" as="h1" />
                    <div style={{ marginTop: 22, maxWidth: 480 }}>
                      <div className="field">
                        <input id="assessed" list="known-names" autoComplete="off" placeholder=" " value={assessed} onChange={e => setAssessed(e.target.value)} autoFocus />
                        <label htmlFor="assessed">{survey.assessedLabel}</label>
                        <span className="line" />
                        <datalist id="known-names">
                          {known.names.map(n => (
                            <option key={n} value={n} />
                          ))}
                        </datalist>
                      </div>
                      <p className="hint">Pick from the list if the name appears, so feedback for one person stays together.</p>
                      <div className="field">
                        <input id="dept" list="known-depts" autoComplete="off" placeholder=" " value={dept} onChange={e => setDept(e.target.value)} />
                        <label htmlFor="dept">Department (optional)</label>
                        <span className="line" />
                        <datalist id="known-depts">
                          {known.depts.map(n => (
                            <option key={n} value={n} />
                          ))}
                        </datalist>
                      </div>
                    </div>
                    {error && <div className="err" role="alert">{error}</div>}
                    <div className="sv-foot" style={{ marginTop: 28 }}>
                      <button type="button" className="sv-btn-link" onClick={back}>← Back</button>
                      <MagneticButton type="submit">Start questions <Arrow /></MagneticButton>
                    </div>
                  </form>
                )}

                {step === 'q' && survey && (
                  <section aria-labelledby={`q-${qi}`}>
                    <span className="eyebrow">
                      Rating {assessed}
                    </span>
                    <StaggerText id={`q-${qi}`} text={survey.questions[qi]} className="display q-text" as="h2" />
                    <div className="pebbles" role="radiogroup" aria-labelledby={`q-${qi}`}>
                      {SCALE.map(s => {
                        const on = answers[qi] === s.value
                        return (
                          <motion.button
                            key={s.value}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            aria-label={`${s.value}, ${s.label}`}
                            className={`pebble spot ${on ? 'on' : ''}`}
                            onPointerMove={spotlight}
                            onClick={() => answer(s.value)}
                            whileHover={reduce ? undefined : { y: -4 }}
                            whileTap={reduce ? undefined : { scale: 0.93, y: 3 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 26 }}
                          >
                            {on && <motion.span layoutId={`fill-${qi}`} className="fill" transition={{ type: 'spring', stiffness: 520, damping: 32 }} />}
                            <span className="key" aria-hidden="true">{s.value}</span>
                            <span className="num" aria-hidden="true">{s.value}</span>
                            <span className="lbl" aria-hidden="true">{'short' in s ? s.short : s.label}</span>
                          </motion.button>
                        )
                      })}
                    </div>
                    <div className="scale-ends" aria-hidden="true">
                      <span>Needs a lot of work</span>
                      <span>Outstanding</span>
                    </div>
                  </section>
                )}

                {step === 'comment' && (
                  <section>
                    <span className="eyebrow">Step 3 of 3 · optional</span>
                    <StaggerText text="Anything else you’d like HR to know?" className="display step-title" as="h1" />
                    <p className="muted" style={{ marginTop: 10 }}>
                      Not scored. {type === 'A' ? 'Your manager never sees who wrote what.' : 'Be specific and kind.'}
                    </p>
                    <div className="field" style={{ marginTop: 18 }}>
                      <textarea
                        id="comment"
                        rows={4}
                        maxLength={2000}
                        placeholder=" "
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                        onFocus={() => setShy(type === 'A')}
                        onBlur={() => setShy(false)}
                      />
                      <label htmlFor="comment">Your comment</label>
                      <span className="line" />
                    </div>
                    {error && <div className="err" role="alert">{error}</div>}
                  </section>
                )}

                {step === 'done' && (
                  <section aria-live="polite">
                    <motion.div
                      className="seal"
                      initial={{ scale: 1.6, opacity: 0, rotate: -20 }}
                      animate={{ scale: 1, opacity: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.15 }}
                      aria-hidden="true"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 21s-7.5-4.6-9.6-9.2C.8 8.3 3 4.5 6.6 4.5c2.1 0 3.6 1.2 4.4 2.6.8-1.4 2.3-2.6 4.4-2.6 3.6 0 5.8 3.8 4.2 7.3C19.5 16.4 12 21 12 21z" />
                      </svg>
                    </motion.div>
                    <span className="eyebrow">Received</span>
                    <StaggerText text={`Thank you, ${me.name.split(' ')[0]}. Honestly.`} className="display step-title" as="h1" delay={0.35} />
                    <p className="muted" style={{ marginTop: 12, fontSize: 17 }}>
                      Your feedback for <strong>{assessed}</strong> is in.{' '}
                      {type === 'A'
                        ? 'It’s confidential — your manager will never see your name or answers.'
                        : result
                          ? `Total ${result.total} / 50 · KPI score ${result.kpi} / 100.`
                          : ''}
                    </p>
                  </section>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* footer actions */}
          {step === 'q' && (
            <div className="sv-foot">
              <button type="button" className="sv-btn-link" onClick={back}>← Back</button>
              <span className="enter-hint">
                {answers[qi] ? (
                  <>press <kbd>Enter ↵</kbd> or wait</>
                ) : (
                  <>press <kbd>1</kbd>–<kbd>5</kbd></>
                )}
              </span>
            </div>
          )}
          {step === 'comment' && (
            <div className="sv-foot">
              <button type="button" className="sv-btn-link" onClick={back}>← Back</button>
              <MagneticButton type="button" onClick={submit} disabled={busy}>
                {busy ? 'Sending…' : comment.trim() ? 'Send feedback' : 'Skip & send'} <Arrow />
              </MagneticButton>
            </div>
          )}
          {step === 'done' && (
            <div className="sv-foot" style={{ flexWrap: 'wrap' }}>
              <button type="button" className="sv-btn sv-btn-ghost" onClick={finish}>Finish</button>
              <MagneticButton type="button" onClick={another}>Rate someone else <Arrow /></MagneticButton>
            </div>
          )}
        </div>

        <aside className="sv-stage">
          <Mascot
            mood={mood}
            cheer={cheer}
            celebrate={step === 'done'}
            read={step === 'q' ? qi + 1 : 0}
            shy={shy}
            calm={calm}
          />
          <p className="sv-stage-note">{step === 'q' ? 'Pank is listening' : 'Click Pank to tickle'}</p>
        </aside>
      </div>
    </div>
  )
}
