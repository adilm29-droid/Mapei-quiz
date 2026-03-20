'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'

const LEVELS = ['Foundation', 'Practitioner', 'Advanced', 'Expert']
const LEVEL_CLASS = { Foundation: 'level-foundation', Practitioner: 'level-practitioner', Advanced: 'level-advanced', Expert: 'level-expert' }

const MOTIVATIONAL = {
  high: ["Outstanding! You're a Mapei expert!", "Incredible! You really know your stuff!", "Brilliant work! Keep setting the standard!", "Exceptional! Ready for the next level!"],
  mid: ["Good effort! You're on the right track!", "Nice work! A little more practice and you'll ace it!", "Solid performance! Keep pushing!", "Well done! Review the tricky ones and try again!"],
  low: ["Don't give up! Every expert was once a beginner.", "Keep learning! Practice makes perfect!", "Rome wasn't built in a day. Try again!", "The more you practice, the better you'll get!"]
}
function getMotivation(pct) { const p = pct >= 80 ? MOTIVATIONAL.high : pct >= 50 ? MOTIVATIONAL.mid : MOTIVATIONAL.low; return p[Math.floor(Math.random() * p.length)] }

function Particles({ count = 25 }) {
  const ref = useRef(null)
  useEffect(() => {
    const c = ref.current; if (!c) return; const ctx = c.getContext('2d'); let id
    const p = []; const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight }
    resize(); window.addEventListener('resize', resize)
    for (let i = 0; i < count; i++) p.push({ x: Math.random()*c.width, y: Math.random()*c.height, r: Math.random()*1.5+0.5, dx: (Math.random()-0.5)*0.2, dy: (Math.random()-0.5)*0.2, o: Math.random()*0.15+0.05 })
    function draw() { ctx.clearRect(0,0,c.width,c.height); for(const d of p){d.x+=d.dx;d.y+=d.dy;if(d.x<0)d.x=c.width;if(d.x>c.width)d.x=0;if(d.y<0)d.y=c.height;if(d.y>c.height)d.y=0;ctx.beginPath();ctx.arc(d.x,d.y,d.r,0,Math.PI*2);ctx.fillStyle=`rgba(255,255,255,${d.o})`;ctx.fill()}id=requestAnimationFrame(draw)}
    draw(); return () => { cancelAnimationFrame(id); window.removeEventListener('resize', resize) }
  }, [count])
  return <canvas ref={ref} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} />
}

function ProgressRing({ percent, size = 140, stroke = 10, color = '#4ade80' }) {
  const r = (size - stroke) / 2, ci = 2 * Math.PI * r, o = ci - (percent / 100) * ci
  return (
    <div className="progress-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle className="progress-ring-bg" cx={size/2} cy={size/2} r={r} strokeWidth={stroke} />
        <circle className="progress-ring-fill" cx={size/2} cy={size/2} r={r} strokeWidth={stroke} stroke={color} strokeDasharray={ci} strokeDashoffset={o} />
      </svg>
      <div className="progress-ring-text" style={{ fontSize: size * 0.3, color }}>{percent}%</div>
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
  const [level, setLevel] = useState('Foundation')
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
    setUser(u); const lvl = searchParams.get('level'); if (lvl) setLevel(lvl)
  }, [])

  async function startQuiz() {
    setLoadingQuiz(true)
    let q = supabase.from('questions').select('*').eq('difficulty', level).eq('approved', true)
    if (category !== 'All') q = q.eq('category', category)
    const { data } = await q.limit(10)
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
    const q = questions[current]; const correct = choice === q.correct_answer
    setSelected(choice || 'timeout'); if (correct) setScore(s => s + 1); setShowExplanation(true)
    await supabase.from('attempts').insert([{ user_id: user.id, question_id: q.id, user_answer: choice, is_correct: correct, difficulty: level, time_taken: 30 - timer }])
  }

  async function nextQuestion() {
    if (current + 1 >= questions.length) await finishQuiz()
    else { setCurrent(c => c + 1); setSelected(null); setShowExplanation(false); setTimer(30) }
  }

  async function finishQuiz() {
    const total = questions.length, pct = Math.round((score / total) * 100)
    const idx = LEVELS.indexOf(level); let nl = level
    if (pct >= 80 && idx < LEVELS.length - 1) nl = LEVELS[idx + 1]
    else if (pct < 50 && idx > 0) nl = LEVELS[idx - 1]
    setNewLevel(nl !== level ? nl : null)
    await supabase.from('scores').insert([{ user_id: user.id, score: pct, level, category, total_questions: total }])
    const aid = searchParams.get('assignment'); if (aid) await supabase.from('assignments').update({ completed: true }).eq('id', aid)
    setDone(true)
  }

  if (!user) return null
  const timerClass = timer <= 5 ? 'timer timer-danger' : timer <= 10 ? 'timer timer-warning' : 'timer'

  if (!started) return (
    <div style={{ minHeight: '100dvh', position: 'relative' }}>
      <Particles />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="navbar">
          <img src="/lapizblue-logo.png" alt="LapizBlue" style={{ height: 26, filter: 'brightness(1.8)' }} />
          <div style={{ fontFamily: 'Rajdhani', fontSize: 18, fontWeight: 700 }}>Start Quiz</div>
          <button className="btn btn-ghost btn-sm" style={{ width: 'auto' }} onClick={() => router.push('/dashboard')}>Back</button>
        </div>
        <div className="page">
          <div className="card animate-fade" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Difficulty</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {LEVELS.map(l => (
                <button key={l} onClick={() => setLevel(l)} className={`badge ${LEVEL_CLASS[l]}`}
                  style={{ cursor: 'pointer', padding: '10px 16px', fontSize: 14, fontWeight: 600, border: level === l ? '2px solid' : '1px solid', opacity: level === l ? 1 : 0.5, borderRadius: 10, textAlign: 'center' }}>{l}</button>
              ))}
            </div>
          </div>
          <div className="card animate-fade stagger-1" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Category</div>
            <select value={category} onChange={e => setCategory(e.target.value)}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
          </div>
          <div className="card animate-fade stagger-2" style={{ marginBottom: 24, display: 'flex', gap: 16, justifyContent: 'space-around', textAlign: 'center' }}>
            {[['30s', 'Per question', '#60a5fa'], ['10', 'Questions', '#fbbf24'], ['80%', 'To level up', '#4ade80']].map(([v, l, c]) => (
              <div key={l}><div style={{ fontFamily: 'Rajdhani', fontSize: 28, fontWeight: 800, color: c }}>{v}</div><div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{l}</div></div>
            ))}
          </div>
          <button className="btn btn-primary animate-fade stagger-3" onClick={startQuiz} disabled={loadingQuiz}>
            {loadingQuiz ? <><div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> Loading...</> : 'Start Quiz'}
          </button>
          <div className="app-footer">Made by Adil Mohamed&nbsp;&nbsp;|&nbsp;&nbsp;LapizBlue &copy; 2026</div>
        </div>
      </div>
    </div>
  )

  if (done) {
    const pct = Math.round((score / questions.length) * 100)
    const color = pct >= 80 ? '#4ade80' : pct >= 50 ? '#fbbf24' : '#ff6b6b'
    return (
      <div style={{ minHeight: '100dvh', position: 'relative' }}>
        <Particles />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="navbar">
            <img src="/lapizblue-logo.png" alt="LapizBlue" style={{ height: 26, filter: 'brightness(1.8)' }} />
            <div style={{ fontFamily: 'Rajdhani', fontSize: 18, fontWeight: 700 }}>Results</div>
            <div style={{ width: 60 }} />
          </div>
          <div className="page" style={{ textAlign: 'center', paddingTop: 40 }}>
            <div className="animate-scale"><ProgressRing percent={pct} size={160} stroke={12} color={color} /></div>
            <div className="animate-fade stagger-1" style={{ marginTop: 20 }}>
              <div style={{ fontFamily: 'Rajdhani', fontSize: 24, fontWeight: 700 }}>{score} / {questions.length} correct</div>
              <div className={`badge ${LEVEL_CLASS[level]}`} style={{ marginTop: 8, padding: '6px 16px', fontSize: 14 }}>{level}</div>
            </div>
            <div className="card animate-fade stagger-2" style={{ marginTop: 24, marginBottom: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{pct >= 80 ? '🌟' : pct >= 50 ? '💪' : '📚'}</div>
              <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.5 }}>{getMotivation(pct)}</div>
            </div>
            {newLevel && (
              <div className="animate-scale stagger-3" style={{ background: 'rgba(34,197,94,0.1)', border: '1.5px solid rgba(34,197,94,0.4)', borderRadius: 14, padding: 18, marginBottom: 16, color: '#4ade80', fontWeight: 700, fontSize: 16 }}>
                Level Up! You're now at {newLevel}!
              </div>
            )}
            <div className="animate-fade stagger-4" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
              <button className="btn btn-primary" onClick={startQuiz}>Play Again</button>
              <button className="btn btn-secondary" onClick={() => router.push('/dashboard')}>Back to Dashboard</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const q = questions[current], total = questions.length
  const options = [{ key: 'a', text: q.option_a }, { key: 'b', text: q.option_b }, { key: 'c', text: q.option_c }, { key: 'd', text: q.option_d }]

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <Particles count={15} />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ padding: '14px 20px', background: 'rgba(10,22,40,0.9)', backdropFilter: 'blur(20px)', borderBottom: '2px solid var(--red)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>Question {current + 1} of {total}</div>
              <span className={`badge ${LEVEL_CLASS[level]}`} style={{ marginTop: 4 }}>{level}</span>
            </div>
            <div className={timerClass}>{timer}s</div>
          </div>
          <div className="progress-bar" style={{ marginBottom: 6 }}><div className="progress-fill" style={{ width: `${(current / total) * 100}%` }} /></div>
          <div className="progress-bar"><div className="progress-fill" style={{ width: `${(timer / 30) * 100}%`, background: timer <= 5 ? 'var(--red)' : timer <= 10 ? 'var(--yellow)' : 'var(--green)' }} /></div>
        </div>

        <div style={{ flex: 1, padding: 16, overflow: 'auto' }}>
          <div className="card animate-fade" style={{ marginBottom: 16 }}>
            <span className="badge badge-blue" style={{ marginBottom: 10, display: 'inline-block' }}>{q.category}</span>
            <div style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.6 }}>{q.question}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {options.map((opt, i) => {
              let cls = 'option'
              if (selected !== null) { if (opt.key === q.correct_answer) cls += ' option-correct'; else if (opt.key === selected) cls += ' option-wrong' }
              return (
                <button key={opt.key} className={`${cls} animate-fade`} style={{ animationDelay: `${i * 0.05}s` }} onClick={() => handleAnswer(opt.key)} disabled={selected !== null}>
                  <span className="option-key" style={{
                    background: opt.key === q.correct_answer && selected !== null ? 'rgba(34,197,94,0.3)' : opt.key === selected && selected !== q.correct_answer ? 'rgba(227,6,19,0.3)' : 'rgba(255,255,255,0.06)',
                    color: (opt.key === q.correct_answer && selected !== null) ? '#4ade80' : (opt.key === selected && selected !== q.correct_answer) ? '#ff6b6b' : 'var(--text)'
                  }}>{opt.key.toUpperCase()}</span>
                  {opt.text}
                </button>
              )
            })}
          </div>
          {showExplanation && (
            <div className="animate-fade-up" style={{ marginTop: 16 }}>
              <div className="explanation">
                <div style={{ fontWeight: 700, marginBottom: 6, color: selected === q.correct_answer ? '#4ade80' : '#ff6b6b', fontSize: 15 }}>
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
    </div>
  )
}

export default function QuizPage() { return <Suspense><QuizContent /></Suspense> }
