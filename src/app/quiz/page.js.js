'use client'
import { useState, useEffect, Suspense } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'

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
    let query = supabase.from('questions').select('*').eq('difficulty', level).eq('approved', true)
    if (category !== 'All') query = query.eq('category', category)
    const { data } = await query.limit(10)
    if (!data || data.length === 0) { alert('No questions available for this level yet.'); return }
    setQuestions(data.sort(() => Math.random() - 0.5))
    setCurrent(0); setScore(0); setSelected(null); setShowExplanation(false); setTimer(30); setDone(false); setNewLevel(null)
    setStarted(true)
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
        <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 20 }}>←</button>
        <div style={{ fontFamily: 'Rajdhani', fontSize: 20, fontWeight: 700, color: 'var(--red)' }}>Start Quiz</div>
        <div style={{ width: 30 }} />
      </div>
      <div className="page">
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>DIFFICULTY</div>
          <select value={level} onChange={e => setLevel(e.target.value)}>
            <option>Beginner</option>
            <option>Intermediate</option>
            <option>Advanced</option>
          </select>
        </div>
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>CATEGORY</div>
          <select value={category} onChange={e => setCategory(e.target.value)}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="card" style={{ marginBottom: 24, display: 'flex', gap: 16, justifyContent: 'space-around', textAlign: 'center' }}>
          {[['⏱️', '30s', 'Per question'], ['📝', '10', 'Questions'], ['🎯', '80%', 'To level up']].map(([icon, val, label]) => (
            <div key={label}>
              <div style={{ fontSize: 20 }}>{icon}</div>
              <div style={{ fontFamily: 'Rajdhani', fontSize: 20, fontWeight: 700, marginTop: 4 }}>{val}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{label}</div>
            </div>
          ))}
        </div>
        <button className="btn btn-primary" onClick={startQuiz}>🚀 Start Quiz</button>
      </div>
    </div>
  )

  // Results screen
  if (done) {
    const pct = Math.round((score / questions.length) * 100)
    const emoji = pct >= 80 ? '🎉' : pct >= 50 ? '👍' : '💪'
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--dark)' }}>
        <div className="navbar">
          <div style={{ fontFamily: 'Rajdhani', fontSize: 20, fontWeight: 700, color: 'var(--red)' }}>Results</div>
        </div>
        <div className="page" style={{ textAlign: 'center', paddingTop: 40 }}>
          <div style={{ fontSize: 72, marginBottom: 16 }}>{emoji}</div>
          <div style={{ fontFamily: 'Rajdhani', fontSize: 64, fontWeight: 900, color: pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--yellow)' : 'var(--red)', lineHeight: 1 }}>{pct}%</div>
          <div style={{ color: 'var(--muted)', marginTop: 8, marginBottom: 24 }}>{score} / {questions.length} correct</div>

          {newLevel && (
            <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid var(--green)', borderRadius: 12, padding: 14, marginBottom: 16, color: 'var(--green)', fontWeight: 600 }}>
              🎊 Level Up! You're now at {newLevel}!
            </div>
          )}
          {pct >= 70 && (
            <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid #3b82f6', borderRadius: 12, padding: 14, marginBottom: 24, color: '#60a5fa', fontSize: 14 }}>
              📜 Certificate generated for passing {level}!
            </div>
          )}
          <button className="btn btn-primary" style={{ marginBottom: 10 }} onClick={startQuiz}>Play Again</button>
          <button className="btn btn-secondary" onClick={() => router.push('/dashboard')}>Dashboard</button>
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
      <div style={{ padding: '12px 16px', background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Q {current + 1}/{total} · {level}</div>
          <div className={timerClass}>{timer}s</div>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${((current) / total) * 100}%` }} />
        </div>
        <div style={{ height: 4 }} />
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${(timer / 30) * 100}%`, background: timer <= 5 ? 'var(--red)' : timer <= 10 ? 'var(--yellow)' : 'var(--green)' }} />
        </div>
      </div>

      {/* Question */}
      <div style={{ flex: 1, padding: 16, overflow: 'auto' }}>
        <div className="card" style={{ marginBottom: 14 }}>
          <span className="badge badge-blue" style={{ marginBottom: 10, display: 'inline-block' }}>{q.category}</span>
          <div style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.5 }}>{q.question}</div>
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {options.map(opt => {
            let cls = 'option'
            if (selected !== null) {
              if (opt.key === q.correct_answer) cls += ' option-correct'
              else if (opt.key === selected) cls += ' option-wrong'
            }
            return (
              <button key={opt.key} className={cls} onClick={() => handleAnswer(opt.key)} disabled={selected !== null}>
                <span className="option-key" style={{ background: opt.key === q.correct_answer && selected !== null ? 'var(--green)' : opt.key === selected && selected !== q.correct_answer ? 'var(--red)' : 'var(--border)' }}>
                  {opt.key.toUpperCase()}
                </span>
                {opt.text}
              </button>
            )
          })}
        </div>

        {/* Explanation */}
        {showExplanation && (
          <div style={{ marginTop: 14 }}>
            <div className="explanation">
              <div style={{ fontWeight: 700, marginBottom: 6, color: selected === q.correct_answer ? 'var(--green)' : 'var(--red)' }}>
                {selected === q.correct_answer ? '✅ Correct!' : `❌ Answer: ${q.correct_answer.toUpperCase()}`}
              </div>
              {q.explanation && <div style={{ color: 'var(--muted)', fontSize: 14 }}>{q.explanation}</div>}
            </div>
            <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={nextQuestion}>
              {current + 1 >= total ? 'See Results →' : 'Next Question →'}
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
