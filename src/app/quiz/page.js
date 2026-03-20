'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { LEVELS, LEVEL_CLASS, CATEGORIES, awardXP, getRank, getAvatar } from '../../lib/helpers'

const MOTIVATIONAL = {
  high: ["Outstanding! You're a product expert!", "Incredible! You really know your stuff!", "Brilliant work! Keep setting the standard!", "Exceptional! Ready for the next level!"],
  mid: ["Good effort! You're on the right track!", "Nice work! A little more practice!", "Solid performance! Keep pushing!", "Well done! Review the tricky ones!"],
  low: ["Don't give up! Every expert was once a beginner.", "Keep learning! Practice makes perfect!", "Rome wasn't built in a day. Try again!", "The more you practice, the better you'll get!"]
}
function getMotivation(pct) { const p = pct >= 80 ? MOTIVATIONAL.high : pct >= 50 ? MOTIVATIONAL.mid : MOTIVATIONAL.low; return p[Math.floor(Math.random() * p.length)] }

function Particles({ count = 20 }) {
  const ref = useRef(null)
  useEffect(() => {
    const c = ref.current; if (!c) return; const ctx = c.getContext('2d'); let id
    const p = []; const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight }
    resize(); window.addEventListener('resize', resize)
    for (let i = 0; i < count; i++) p.push({ x: Math.random()*c.width, y: Math.random()*c.height, r: Math.random()*1.5+0.5, dx: (Math.random()-0.5)*0.2, dy: (Math.random()-0.5)*0.2, o: Math.random()*0.12+0.04 })
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
  const [xpResult, setXpResult] = useState(null)
  const router = useRouter()
  const searchParams = useSearchParams()

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
    setCurrent(0); setScore(0); setSelected(null); setShowExplanation(false); setTimer(30); setDone(false); setNewLevel(null); setXpResult(null)
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
    // Award XP
    const result = await awardXP(user.id, score, total, pct, level)
    setXpResult(result)
    setUser(prev => ({ ...prev, xp: result.newXp, rank: result.newRank.name }))
    setDone(true)
  }

  if (!user) return null
  const timerClass = timer <= 5 ? 'timer timer-danger' : timer <= 10 ? 'timer timer-warning' : 'timer'

  // Start screen
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
          <div className="card animate-fade stagger-2" style={{ marginBottom: 16, textAlign: 'center', padding: 18 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>XP Rewards</div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              {[['Complete', '+10'], ['Per correct', '+5'], ['70%+', '+25'], ['90%+', '+50']].map(([l, v]) => (
                <div key={l} style={{ background: 'rgba(227,6,19,0.08)', border: '1px solid rgba(227,6,19,0.2)', borderRadius: 10, padding: '6px 12px' }}>
                  <div style={{ fontFamily: 'Rajdhani', fontSize: 16, fontWeight: 800, color: '#ff6b6b' }}>{v} XP</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
          <button className="btn btn-primary animate-fade stagger-3" onClick={startQuiz} disabled={loadingQuiz}>
            {loadingQuiz ? <><div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> Loading...</> : 'Start Quiz'}
          </button>
          <div className="app-footer">Made by Adil Mohamed&nbsp;&nbsp;|&nbsp;&nbsp;LapizBlue &copy; 2026</div>
        </div>
      </div>
    </div>
  )

  // Results screen
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
          <div className="page" style={{ textAlign: 'center', paddingTop: 30 }}>
            <div className="animate-scale"><ProgressRing percent={pct} size={140} stroke={10} color={color} /></div>
            <div className="animate-fade stagger-1" style={{ marginTop: 16 }}>
              <div style={{ fontFamily: 'Rajdhani', fontSize: 22, fontWeight: 700 }}>{score} / {questions.length} correct</div>
              <div className={`badge ${LEVEL_CLASS[level]}`} style={{ marginTop: 8, padding: '5px 14px', fontSize: 13 }}>{level}</div>
            </div>

            {/* XP earned */}
            {xpResult && (
              <div className="card animate-scale stagger-2" style={{ marginTop: 18, marginBottom: 14, borderColor: 'rgba(227,6,19,0.3)', textAlign: 'center' }}>
                <div style={{ fontFamily: 'Rajdhani', fontSize: 32, fontWeight: 900, color: '#ff6b6b' }}>+{xpResult.xpGained} XP</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>Total: {xpResult.newXp} XP</div>
                <div style={{ marginTop: 8 }}>
                  <span style={{ background: `${xpResult.newRank.color}20`, color: xpResult.newRank.color, border: `1px solid ${xpResult.newRank.color}40`, padding: '3px 12px', borderRadius: 12, fontSize: 12, fontWeight: 700 }}>
                    {xpResult.newRank.icon} {xpResult.newRank.name}
                  </span>
                </div>
              </div>
            )}

            <div className="card animate-fade stagger-3" style={{ marginBottom: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>{pct >= 80 ? '🌟' : pct >= 50 ? '💪' : '📚'}</div>
              <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.5 }}>{getMotivation(pct)}</div>
            </div>

            {newLevel && (
              <div className="animate-scale" style={{ background: 'rgba(34,197,94,0.1)', border: '1.5px solid rgba(34,197,94,0.4)', borderRadius: 14, padding: 16, marginBottom: 14, color: '#4ade80', fontWeight: 700, fontSize: 15 }}>
                Level Up! You're now at {newLevel}!
              </div>
            )}

            <div className="animate-fade stagger-4" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className="btn btn-primary" onClick={startQuiz}>Play Again</button>
              <button className="btn btn-secondary" onClick={() => router.push('/dashboard')}>Back to Dashboard</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Quiz screen
  const q = questions[current], total = questions.length
  const options = [{ key: 'a', text: q.option_a }, { key: 'b', text: q.option_b }, { key: 'c', text: q.option_c }, { key: 'd', text: q.option_d }]

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <Particles count={12} />
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
                  {selected === q.correct_answer ? 'Correct! +5 XP' : `Incorrect - Answer: ${q.correct_answer.toUpperCase()}`}
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
