'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

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
    if (!data || data.length === 0) { alert('No approved questions available for this level yet.'); return }
    const shuffled = data.sort(() => Math.random() - 0.5)
    setQuestions(shuffled)
    setCurrent(0); setScore(0); setSelected(null); setShowExplanation(false); setTimer(30); setDone(false)
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
    setSelected(choice)
    if (correct) setScore(s => s + 1)
    if (!correct || q.explanation) setShowExplanation(true)
    await supabase.from('attempts').insert([{
      user_id: user.id, question_id: q.id,
      user_answer: choice, is_correct: correct,
      difficulty: level, time_taken: 30 - timer
    }])
  }

  async function nextQuestion() {
    if (current + 1 >= questions.length) {
      await finishQuiz()
    } else {
      setCurrent(c => c + 1); setSelected(null); setShowExplanation(false); setTimer(30)
    }
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
    await checkBadges(pct, nl !== level)
    const assignmentId = searchParams.get('assignment')
    if (assignmentId) await supabase.from('assignments').update({ completed: true }).eq('id', assignmentId)
    if (pct >= 70) await generateCertificate(pct)
    setDone(true)
  }

  async function checkBadges(pct, leveledUp) {
    const { data: existing } = await supabase.from('badges').select('badge_name').eq('user_id', user.id)
    const have = existing?.map(b => b.badge_name) || []
    const toAdd = []
    const { count } = await supabase.from('scores').select('*', { count: 'exact' }).eq('user_id', user.id)
    if (count === 1 && !have.includes('First Quiz')) toAdd.push('First Quiz')
    if (pct === 100 && !have.includes('Perfect Score')) toAdd.push('Perfect Score')
    if (leveledUp && !have.includes('Level Up')) toAdd.push('Level Up')
    if (count >= 5 && !have.includes('On Fire')) toAdd.push('On Fire')
    if (level === 'Advanced' && pct >= 70 && !have.includes('Master')) toAdd.push('Master')
    if (toAdd.length > 0) {
      await supabase.from('badges').insert(toAdd.map(b => ({ user_id: user.id, badge_name: b })))
    }
  }

  async function generateCertificate(pct) {
    await supabase.from('certificates').insert([{
      user_id: user.id, username: user.username,
      level, score: pct, issued_at: new Date().toISOString()
    }])
  }

  if (!user) return null

  // Start screen
  if (!started) return (
    <div style={{ maxWidth: 600, margin: '80px auto', padding: 24 }}>
      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#E30613', marginBottom: 8 }}>MAPEI Quiz</div>
        <h2 style={{ marginBottom: 24 }}>Configure Your Quiz</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24, textAlign: 'left' }}>
          <div>
            <label style={{ color: '#aaa', fontSize: 14, display: 'block', marginBottom: 6 }}>Difficulty Level</label>
            <select value={level} onChange={e => setLevel(e.target.value)}>
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>Advanced</option>
            </select>
          </div>
          <div>
            <label style={{ color: '#aaa', fontSize: 14, display: 'block', marginBottom: 6 }}>Product Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div style={{ background: '#2a2a4a', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 14, color: '#aaa' }}>
          ⏱️ 30 seconds per question &nbsp;&nbsp; 📝 Up to 10 questions &nbsp;&nbsp; 🎯 80% to level up
        </div>
        <button className="btn-primary" style={{ width: '100%' }} onClick={startQuiz}>Start Quiz</button>
        <button className="btn-secondary" style={{ width: '100%', marginTop: 10 }} onClick={() => router.push('/dashboard')}>Back</button>
      </div>
    </div>
  )

  // Results screen
  if (done) {
    const pct = Math.round((score / questions.length) * 100)
    return (
      <div style={{ maxWidth: 600, margin: '80px auto', padding: 24 }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>{pct >= 80 ? '🎉' : pct >= 50 ? '👍' : '💪'}</div>
          <h2 style={{ marginBottom: 8 }}>Quiz Complete!</h2>
          <div style={{ fontSize: 48, fontWeight: 900, color: pct >= 80 ? '#4CAF50' : pct >= 50 ? '#FF9800' : '#E30613', marginBottom: 8 }}>{pct}%</div>
          <div style={{ color: '#aaa', marginBottom: 16 }}>{score} / {questions.length} correct</div>
          {newLevel && <div style={{ background: '#1a3a1a', border: '1px solid #4CAF50', borderRadius: 8, padding: '12px', marginBottom: 16, color: '#4CAF50' }}>
            🎊 Level Up! You're now at <strong>{newLevel}</strong> level!
          </div>}
          {pct >= 70 && <div style={{ background: '#1a2a3a', border: '1px solid #2196F3', borderRadius: 8, padding: '12px', marginBottom: 16, color: '#64B5F6' }}>
            📜 Certificate generated for passing {level} level!
          </div>}
          <button className="btn-primary" style={{ width: '100%', marginBottom: 10 }} onClick={startQuiz}>Play Again</button>
          <button className="btn-secondary" style={{ width: '100%' }} onClick={() => router.push('/dashboard')}>Dashboard</button>
        </div>
      </div>
    )
  }

  // Quiz screen
  const q = questions[current]
  const options = [
    { key: 'a', text: q.option_a },
    { key: 'b', text: q.option_b },
    { key: 'c', text: q.option_c },
    { key: 'd', text: q.option_d },
  ]

  return (
    <div style={{ maxWidth: 700, margin: '40px auto', padding: 24 }}>
      {/* Progress */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, color: '#aaa', fontSize: 14 }}>
        <span>Question {current + 1} of {questions.length}</span>
        <span>{level} — {category}</span>
        <span style={{ color: timer <= 10 ? '#E30613' : '#4CAF50', fontWeight: 700 }}>⏱️ {timer}s</span>
      </div>
      <div style={{ background: '#2a2a4a', borderRadius: 8, height: 6, marginBottom: 24 }}>
        <div style={{ background: '#E30613', height: '100%', borderRadius: 8, width: `${((current + 1) / questions.length) * 100}%`, transition: 'width 0.3s' }} />
      </div>

      {/* Timer bar */}
      <div style={{ background: '#2a2a4a', borderRadius: 8, height: 4, marginBottom: 24 }}>
        <div style={{ background: timer <= 10 ? '#E30613' : '#4CAF50', height: '100%', borderRadius: 8, width: `${(timer / 30) * 100}%`, transition: 'width 1s' }} />
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>📦 {q.category}</div>
        <div style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.5 }}>{q.question}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        {options.map(opt => {
          let bg = '#16213e'; let border = '1px solid #2a2a4a'
          if (selected !== null) {
            if (opt.key === q.correct_answer) { bg = '#1a3a1a'; border = '1px solid #4CAF50' }
            else if (opt.key === selected && selected !== q.correct_answer) { bg = '#3a1a1a'; border = '1px solid #E30613' }
          }
          return (
            <button key={opt.key} onClick={() => handleAnswer(opt.key)} disabled={selected !== null}
              style={{ background: bg, border, borderRadius: 10, padding: '14px 18px', color: 'white', cursor: selected ? 'default' : 'pointer', textAlign: 'left', fontSize: 15, transition: 'all 0.2s' }}>
              <strong style={{ color: '#E30613' }}>{opt.key.toUpperCase()}.</strong> {opt.text}
            </button>
          )
        })}
      </div>

      {showExplanation && (
        <div style={{ background: '#1a2a3a', border: '1px solid #2196F3', borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ color: '#64B5F6', fontWeight: 700, marginBottom: 6 }}>
            {selected === q.correct_answer ? '✅ Correct!' : `❌ Correct answer: ${q.correct_answer.toUpperCase()}`}
          </div>
          {q.explanation && <div style={{ color: '#aaa', fontSize: 14 }}>{q.explanation}</div>}
          <button className="btn-primary" style={{ marginTop: 12 }} onClick={nextQuestion}>
            {current + 1 >= questions.length ? 'See Results' : 'Next Question →'}
          </button>
        </div>
      )}

      {selected !== null && !showExplanation && (
        <button className="btn-primary" onClick={nextQuestion}>
          {current + 1 >= questions.length ? 'See Results' : 'Next Question →'}
        </button>
      )}
    </div>
  )
}

export default function QuizPage() {
  return <Suspense><QuizContent /></Suspense>
}
