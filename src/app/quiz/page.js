'use client'
import { useState, useEffect, Suspense } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'

const LEVEL_CLASS = { Beginner: 'level-beginner', Intermediate: 'level-intermediate', Advanced: 'level-advanced' }

const MOTIVATIONAL = {
  high: [
    "Outstanding performance! You're a Mapei expert!",
    "Incredible! You really know your stuff!",
    "Brilliant work! Keep setting the standard!",
    "Exceptional! You're ready for the next level!",
  ],
  mid: [
    "Good effort! You're on the right track!",
    "Nice work! A little more practice and you'll ace it!",
    "Solid performance! Keep pushing forward!",
    "Well done! Review the tricky ones and try again!",
  ],
  low: [
    "Don't give up! Every expert was once a beginner.",
    "Keep learning! Practice makes perfect!",
    "Rome wasn't built in a day. Try again!",
    "The more you practice, the better you'll get!",
  ]
}

function getMotivation(pct) {
  const pool = pct >= 80 ? MOTIVATIONAL.high : pct >= 50 ? MOTIVATIONAL.mid : MOTIVATIONAL.low
  return pool[Math.floor(Math.random() * pool.length)]
}

function ProgressRing({ percent, size = 140, stroke = 10, color = 'var(--green)' }) {
  const radius = (size - stroke) / 2
  const circ = 2 * Math.PI * radius
  const offset = circ - (percent / 100) * circ
  return (
    <div className="progress-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle className="progress-ring-bg" cx={size/2} cy={size/2} r={radius} strokeWidth={stroke} />
        <circle className="progress-ring-fill" cx={size/2} cy={size/2} r={radius} strokeWidth={stroke}
          stroke={color} strokeDasharray={circ} strokeDashoffset={offset} />
      </svg>
      <div className="progress-ring-text" style={{ fontSize: size * 0.3, color }}>
        {percent}%
      </div>
    </div>
  )
}

function QuizContent() {
  const [user, setUser] = useState(null)
  const [questions, setQuestions] = useState([])
  const [current, setCurrent] = useState(0)
  const [score, setScore] = useState(0)
  const [selected, setSelected] = useState(null)
  const [showExplanation, setShowExplanation] = useState(false)
  const [timer, setTimer] = useState(30)
  const [done, setDone] = useState(false)
  const [level, setLevel] = useState('Beginner')
  const [category, setCategory] = useState('All')
  const [started, setStarted] = useState(false)
  const [newLevel, setNewLevel] = useState(null)
  const [loadingQuiz, setLoadingQuiz] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const CATEGORIES = ['All', 'Adhesives', 'Waterproofing', 'Flooring', 'Grouts and Mortars', 'Concrete Repair', 'General Products']

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('user') || 'null')
    if (!u) { router.push('/'); return }
    setUser(u)
    const lvl = searchParams.get('level')
    if (lvl) setLevel(lvl)
  }, [])

  async function startQuiz() {
    setLoadingQuiz(true)
    let query = supabase.from('questions').select('*').eq('difficulty', level).eq('approved', true)
    if (category !== 'All') query = query.eq('category', category)
    const { data } = await query.limit(10)
    if (!data || data.length === 0) { alert('No questions available for this level yet.'); setLoadingQuiz(false); return }
    setQuestions(data.sort(() => Math.random() - 0.5))
    setCurrent(0); setScore(0); setSelected(null); setShowExplanation(false); setTimer(30); setDone(false); setNewLevel(null)
    setStarted(true); setLoadingQuiz(false)
  }

  useEffect(() => {
    if (!started || done || showExplanation) return
    if (timer <= 0) { handleAnswer(null); return }
    const t = setTimeout(() => setTimer(t => t - 1), 1000)
    return () => clearTimeout(t)
  }, [timer, started, done, showExplanation])

  async function handleAnswer(choice) {
    if (selected !== null) return
    const q = questions[current]
    const correct = choice === q.correct_answer
    setSelected(choice || 'timeout')
    if (correct) setScore(s => s + 1)
    setShowExplanation(true)
    await supabase.from('attempts').insert([{ user_id: user.id, question_id: q.id, user_answer: choice, is_correct: correct, difficulty: level, time_taken: 30 - timer }])
  }

  async function nextQuestion() {
    if (current + 1 >= questions.length) { await finishQuiz() }
    else { setCurrent(c => c + 1); setSelected(null); setShowExplanation(false); setTimer(30) }
  }

  async function finishQuiz() {
    const total = questions.length
    const pct = Math.round((score / total) * 100)
    const levels = ['Beginner', 'Intermediate', 'Advanced']
    const idx = levels.indexOf(level)
    let nl = level
    if (pct >= 80 && idx < 2) nl = levels[idx + 1]
    else if (pct < 50 && idx > 0) nl = levels[idx - 1]
    setNewLevel(nl !== level ? nl : null)
    await supabase.from('scores').insert([{ user_id: user.id, score: pct, level, category, total_questions: total }])
    const assignmentId = searchParams.get('assignment')
    if (assignmentId) await supabase.from('assignments').update({ completed: true }).eq('id', assignmentId)
    setDone(true)
  }

  if (!user) return null

  const timerClass = timer <= 5 ? 'timer timer-danger' : timer <= 10 ? 'timer timer-warning' : 'timer'

  // Start screen
  if (!started) return (
    <div style={{ minHeight: '100dvh', background: 'var(--dark)' }}>
      <div className="navbar">
        <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 22, fontWeight: 600 }}>←</button>
        <div style={{ fontFamily: 'Rajdhani', fontSize: 20, fontWeight: 700 }}>Start Quiz</div>
        <div style={{ width: 30 }} />
      </div>
      <div className="page">
        <div className="card animate-fade" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Difficulty</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {['Beginner', 'Intermediate', 'Advanced'].map(l => (
              <button key={l} onClick={() => setLevel(l)}
                className={`badge ${LEVEL_CLASS[l]}`}
                style={{ cursor: 'pointer', padding: '10px 16px', fontSize: 14, fontWeight: 600, border: level === l ? '2px solid' : '1px solid', opacity: level === l ? 1 : 0.5, borderRadius: 10, flex: 1, textAlign: 'center' }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="card animate-fade stagger-1" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Category</div>
          <select value={category} onChange={e => setCategory(e.target.value)}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        <div className="card animate-fade stagger-2" style={{ marginBottom: 24, display: 'flex', gap: 16, justifyContent: 'space-around', textAlign: 'center' }}>
          {[['30s', 'Per question', 'var(--blue)'], ['10', 'Questions', 'var(--yellow)'], ['80%', 'To level up', 'var(--green)']].map(([val, label, color]) => (
            <div key={label}>
              <div style={{ fontFamily: 'Rajdhani', fontSize: 28, fontWeight: 800, color }}>{val}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        <button className="btn btn-primary animate-fade stagger-3" onClick={startQuiz} disabled={loadingQuiz}>
          {loadingQuiz ? <><div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> Loading...</> : 'Start Quiz'}
        </button>
      </div>
    </div>
  )

  // Results screen
  if (done) {
    const pct = Math.round((score / questions.length) * 100)
    const color = pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--yellow)' : 'var(--red)'
    const motivation = getMotivation(pct)
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--dark)' }}>
        <div className="navbar">
          <div style={{ fontFamily: 'Rajdhani', fontSize: 20, fontWeight: 700 }}>Results</div>
          <div />
        </div>
        <div className="page" style={{ textAlign: 'center', paddingTop: 40 }}>
          <div className="animate-scale">
            <ProgressRing percent={pct} size={160} stroke={12} color={color} />
          </div>

          <div className="animate-fade stagger-1" style={{ marginTop: 20 }}>
            <div style={{ fontFamily: 'Rajdhani', fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>{score} / {questions.length} correct</div>
            <div className={`badge ${LEVEL_CLASS[level]}`} style={{ marginTop: 8, padding: '6px 16px', fontSize: 14 }}>{level}</div>
          </div>

          {/* Motivational message */}
          <div className="card animate-fade stagger-2" style={{ marginTop: 24, marginBottom: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>{pct >= 80 ? '🌟' : pct >= 50 ? '💪' : '📚'}</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', lineHeight: 1.5 }}>{motivation}</div>
          </div>

          {newLevel && (
            <div className="animate-scale stagger-3" style={{ background: 'rgba(34,197,94,0.08)', border: '1.5px solid var(--green)', borderRadius: 14, padding: 18, marginBottom: 16, color: 'var(--green)', fontWeight: 700, fontSize: 16 }}>
              Level Up! You're now at {newLevel}!
            </div>
          )}

          <div className="animate-fade stagger-4" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
            <button className="btn btn-primary" onClick={startQuiz}>Play Again</button>
            <button className="btn btn-secondary" onClick={() => router.push('/dashboard')}>Back to Dashboard</button>
          </div>
        </div>
      </div>
    )
  }

  // Quiz screen
  const q = questions[current]
  const total = questions.length
  const options = [{ key: 'a', text: q.option_a }, { key: 'b', text: q.option_b }, { key: 'c', text: q.option_c }, { key: 'd', text: q.option_d }]

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--dark)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', background: 'var(--card)', borderBottom: '1px solid var(--border)', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>Question {current + 1} of {total}</div>
            <span className={`badge ${LEVEL_CLASS[level]}`} style={{ marginTop: 4 }}>{level}</span>
          </div>
          <div className={timerClass}>{timer}s</div>
        </div>
        <div className="progress-bar" style={{ marginBottom: 6 }}>
          <div className="progress-fill" style={{ width: `${((current) / total) * 100}%` }} />
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${(timer / 30) * 100}%`, background: timer <= 5 ? 'var(--red)' : timer <= 10 ? 'var(--yellow)' : 'var(--green)' }} />
        </div>
      </div>

      {/* Question */}
      <div style={{ flex: 1, padding: 16, overflow: 'auto' }}>
        <div className="card animate-fade" style={{ marginBottom: 16 }}>
          <span className="badge badge-blue" style={{ marginBottom: 10, display: 'inline-block' }}>{q.category}</span>
          <div style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.6 }}>{q.question}</div>
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {options.map((opt, i) => {
            let cls = 'option'
            if (selected !== null) {
              if (opt.key === q.correct_answer) cls += ' option-correct'
              else if (opt.key === selected) cls += ' option-wrong'
            }
            return (
              <button key={opt.key} className={`${cls} animate-fade`} style={{ animationDelay: `${i * 0.05}s` }}
                onClick={() => handleAnswer(opt.key)} disabled={selected !== null}>
                <span className="option-key" style={{
                  background: opt.key === q.correct_answer && selected !== null ? 'var(--green)' : opt.key === selected && selected !== q.correct_answer ? 'var(--red)' : 'var(--card2)',
                  color: (opt.key === q.correct_answer && selected !== null) || (opt.key === selected && selected !== q.correct_answer) ? 'white' : 'var(--text)'
                }}>
                  {opt.key.toUpperCase()}
                </span>
                {opt.text}
              </button>
            )
          })}
        </div>

        {/* Explanation */}
        {showExplanation && (
          <div className="animate-fade-up" style={{ marginTop: 16 }}>
            <div className="explanation">
              <div style={{ fontWeight: 700, marginBottom: 6, color: selected === q.correct_answer ? 'var(--green)' : 'var(--red)', fontSize: 15 }}>
                {selected === q.correct_answer ? 'Correct!' : `Incorrect - Answer: ${q.correct_answer.toUpperCase()}`}
              </div>
              {q.explanation && <div style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.6 }}>{q.explanation}</div>}
            </div>
            <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={nextQuestion}>
              {current + 1 >= total ? 'See Results' : 'Next Question'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function QuizPage() {
  return <Suspense><QuizContent /></Suspense>
}
