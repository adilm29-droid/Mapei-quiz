'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { SURVEYS, SCALE, normaliseName, type SurveyType } from '@/lib/hr-survey'

// three.js mascot loads after the form, client-only
const Mascot = dynamic(() => import('../_components/Mascot'), { ssr: false })

const EMPTY: number[] = Array(10).fill(0)
type Step = 'type' | 'who' | 'questions' | 'done'

export default function SurveyForm() {
  const router = useRouter()
  const [me, setMe] = useState<{ name: string; email: string } | null>(null)
  const [step, setStep] = useState<Step>('type')
  const [type, setType] = useState<SurveyType | null>(null)
  const [dept, setDept] = useState('')
  const [assessed, setAssessed] = useState('')
  const [answers, setAnswers] = useState<number[]>(EMPTY)
  const [comment, setComment] = useState('')
  const [tried, setTried] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [known, setKnown] = useState<{ names: string[]; depts: string[] }>({ names: [], depts: [] })
  const [result, setResult] = useState<{ total: number; kpi: number } | null>(null)
  const [mood, setMood] = useState(0)
  const [cheer, setCheer] = useState(0)

  useEffect(() => {
    fetch('/api/survey/names')
      .then(async res => {
        if (res.status === 401) return router.replace('/survey')
        const body = await res.json().catch(() => ({}))
        if (body?.me) setMe(body.me)
        setKnown({ names: body?.names ?? [], depts: body?.depts ?? [] })
      })
      .catch(() => router.replace('/survey'))
  }, [router])

  useEffect(() => {
    document.querySelector('.hr')?.scrollTo?.(0, 0)
  }, [step])

  const survey = type ? SURVEYS[type] : null
  const answered = answers.filter(Boolean).length

  function pick(t: SurveyType) {
    setMood(4)
    setCheer(c => c + 1)
    setType(t)
    setError('')
    setStep('who')
  }

  function goQuestions(e: React.FormEvent) {
    e.preventDefault()
    if (!me) return
    const n = normaliseName(assessed)
    if (n.length < 2) return setError('Please enter the name of the person you are rating.')
    if (normaliseName(me.name) === n) return setError('This survey is for rating someone else, not yourself.')
    setAssessed(n)
    setDept(normaliseName(dept))
    setError('')
    setStep('questions')
  }

  function setAnswer(i: number, v: number) {
    setMood(v)
    setCheer(c => c + 1)
    setAnswers(a => {
      const n = [...a]
      n[i] = v
      return n
    })
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setTried(true)
    const missing = answers.findIndex(a => !a)
    if (missing !== -1) {
      setError(`Please answer all 10 questions. ${10 - answered} left.`)
      document.getElementById(`q-${missing}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setError('')
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
      return setError(body?.error || 'Could not save your answers. Please check your connection and try again.')
    }
    setResult(type === 'B' ? { total: body.total, kpi: body.kpi } : null)
    setStep('done')
  }

  function another() {
    setType(null)
    setAssessed('')
    setAnswers(EMPTY)
    setComment('')
    setTried(false)
    setError('')
    setResult(null)
    setMood(0)
    setStep('type')
  }

  async function finish() {
    await fetch('/api/survey/enter', { method: 'DELETE' }).catch(() => null)
    try {
      sessionStorage.removeItem('hr_respondent')
    } catch {}
    router.push('/survey')
  }

  if (!me) return null

  return (
    <main className="hr-shell hr-with-pank">
      <Mascot mood={mood} cheer={cheer} celebrate={step === 'done'} />
      <div className="hr-brand" style={{ justifyContent: 'space-between' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="hr-brand-dot" aria-hidden="true" />
          Colleague Feedback
        </span>
        <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 500 }}>{me.name}</span>
      </div>

      {step === 'type' && (
        <section className="hr-fade" aria-labelledby="t-type">
          <div className="hr-card hr-accent">
            <h1 id="t-type" style={{ fontSize: 26, marginBottom: 8 }}>
              Who are you giving feedback to?
            </h1>
            <p className="hr-sub">Choose one. You can submit another survey afterwards.</p>
          </div>
          <div className="hr-card">
            {(['A', 'B'] as const).map(k => (
              <button key={k} type="button" className="hr-choice" onClick={() => pick(k)}>
                <span className="hr-choice-tag">Survey {k}</span>
                <div className="hr-choice-title">{SURVEYS[k].picker}</div>
                <div className="hr-help" style={{ marginTop: 4 }}>
                  {SURVEYS[k].blurb}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 'who' && survey && (
        <form className="hr-fade" onSubmit={goQuestions} noValidate>
          <button type="button" className="hr-back" onClick={() => setStep('type')}>
            &larr; Back
          </button>
          <div className="hr-card hr-accent">
            <span className="hr-choice-tag">
              Survey {type} · {survey.title}
            </span>
            <h1 style={{ fontSize: 26, marginTop: 4 }}>Who are you rating?</h1>
          </div>
          <div className="hr-card">
            <div className="hr-field">
              <label className="hr-label" htmlFor="assessed">
                {survey.assessedLabel}
                <span className="req" aria-hidden="true">*</span>
              </label>
              <input
                id="assessed"
                list="known-names"
                autoComplete="off"
                value={assessed}
                onChange={e => setAssessed(e.target.value)}
                placeholder="Start typing a name"
                autoFocus
              />
              <datalist id="known-names">
                {known.names.map(n => (
                  <option key={n} value={n} />
                ))}
              </datalist>
              <p className="hr-help">Pick from the list if the name appears, so all feedback for one person stays together.</p>
            </div>
            <div className="hr-field">
              <label className="hr-label" htmlFor="dept">
                Department <span style={{ fontWeight: 400, color: 'var(--hr-muted)' }}>(optional)</span>
              </label>
              <input
                id="dept"
                list="known-depts"
                autoComplete="off"
                value={dept}
                onChange={e => setDept(e.target.value)}
                placeholder="e.g. Sales, Warehouse, Accounts"
              />
              <datalist id="known-depts">
                {known.depts.map(n => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </div>
            {error && (
              <div className="hr-error" role="alert">
                {error}
              </div>
            )}
            <button className="hr-btn" type="submit" style={{ marginTop: 22 }}>
              Continue
            </button>
          </div>
        </form>
      )}

      {step === 'questions' && survey && (
        <form className="hr-fade" onSubmit={submit} noValidate>
          <button type="button" className="hr-back" onClick={() => setStep('who')}>
            &larr; Back
          </button>
          <div className="hr-progress" aria-hidden="true">
            <div className="hr-progress-row">
              <span>
                Rating <strong style={{ color: 'var(--hr-ink)' }}>{assessed}</strong>
              </span>
              <span>{answered} / 10</span>
            </div>
            <div className="hr-progress-bar">
              <div className="hr-progress-fill" style={{ width: `${answered * 10}%` }} />
            </div>
          </div>
          <div className="hr-card">
            <p className="hr-help" style={{ marginTop: 0, marginBottom: 14 }}>
              1 = Very Poor · 2 = Poor · 3 = Satisfactory · 4 = Good · 5 = Excellent
            </p>
            {survey.questions.map((q, i) => (
              <div key={i} id={`q-${i}`} className={`hr-q ${tried && !answers[i] ? 'hr-q-missing' : ''}`}>
                <fieldset style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
                  <legend className="hr-q-text">
                    <span className="hr-q-num" aria-hidden="true">
                      {i + 1}
                    </span>
                    <span>{q}</span>
                  </legend>
                  <div className="hr-scale">
                    {SCALE.map(s => (
                      <label key={s.value} className="hr-rate">
                        <input
                          type="radio"
                          name={`q${i}`}
                          value={s.value}
                          checked={answers[i] === s.value}
                          onChange={() => setAnswer(i, s.value)}
                          aria-label={`${s.value}, ${s.label}`}
                        />
                        <span aria-hidden="true">
                          <b>{s.value}</b>
                          <small>{'short' in s ? s.short : s.label}</small>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>
            ))}
          </div>
          <div className="hr-card">
            <label className="hr-label" htmlFor="comment">
              Any other comments?{' '}
              <span style={{ fontWeight: 400, color: 'var(--hr-muted)' }}>(optional, not scored)</span>
            </label>
            <textarea
              id="comment"
              rows={4}
              maxLength={2000}
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Anything you'd like HR to know"
            />
            {error && (
              <div className="hr-error" role="alert">
                {error}
              </div>
            )}
            <button className="hr-btn" type="submit" disabled={busy} style={{ marginTop: 18 }}>
              {busy ? 'Submitting…' : 'Submit feedback'}
            </button>
          </div>
        </form>
      )}

      {step === 'done' && (
        <section className="hr-card hr-fade" style={{ textAlign: 'center', padding: '36px 24px' }} aria-live="polite">
          <div className="hr-done-icon" aria-hidden="true">
            ✓
          </div>
          <h1 style={{ fontSize: 26, marginBottom: 8 }}>Thank you, {me.name.split(' ')[0]}</h1>
          <p className="hr-sub" style={{ marginBottom: 6 }}>
            Your feedback for <strong style={{ color: 'var(--hr-ink)' }}>{assessed}</strong> has been recorded.
          </p>
          {type === 'A' ? (
            <p className="hr-help">Your feedback is confidential. Your manager will never see your name or your answers.</p>
          ) : (
            result && (
              <p className="hr-help">
                Total {result.total} / 50 · KPI score {result.kpi} / 100
              </p>
            )
          )}
          <div style={{ display: 'grid', gap: 10, marginTop: 24 }}>
            <button className="hr-btn" type="button" onClick={another}>
              Give feedback on someone else
            </button>
            <button className="hr-btn hr-btn-ghost" type="button" onClick={finish}>
              Finish
            </button>
          </div>
        </section>
      )}
    </main>
  )
}
