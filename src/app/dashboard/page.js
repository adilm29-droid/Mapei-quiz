'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

const BADGE_ICONS = { 'First Quiz': '🎯', 'Perfect Score': '💯', 'Level Up': '⬆️', 'On Fire': '🔥', 'Weekly Champion': '🏆', 'Master': '👑' }
const LEVEL_COLOR = { Foundation: '#4ade80', Practitioner: '#fbbf24', Advanced: '#ff6b6b', Expert: '#a78bfa' }
const LEVEL_CLASS = { Foundation: 'level-foundation', Practitioner: 'level-practitioner', Advanced: 'level-advanced', Expert: 'level-expert' }

function Particles({ count = 30 }) {
  const ref = useRef(null)
  useEffect(() => {
    const c = ref.current; if (!c) return; const ctx = c.getContext('2d'); let id
    const p = []; const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight }
    resize(); window.addEventListener('resize', resize)
    for (let i = 0; i < count; i++) p.push({ x: Math.random()*c.width, y: Math.random()*c.height, r: Math.random()*1.5+0.5, dx: (Math.random()-0.5)*0.2, dy: (Math.random()-0.5)*0.2, o: Math.random()*0.2+0.05 })
    function draw() { ctx.clearRect(0,0,c.width,c.height); for(const d of p){d.x+=d.dx;d.y+=d.dy;if(d.x<0)d.x=c.width;if(d.x>c.width)d.x=0;if(d.y<0)d.y=c.height;if(d.y>c.height)d.y=0;ctx.beginPath();ctx.arc(d.x,d.y,d.r,0,Math.PI*2);ctx.fillStyle=`rgba(255,255,255,${d.o})`;ctx.fill()}id=requestAnimationFrame(draw)}
    draw(); return () => { cancelAnimationFrame(id); window.removeEventListener('resize', resize) }
  }, [count])
  return <canvas ref={ref} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} />
}

function ProgressRing({ percent, size = 100, stroke = 8, color = 'var(--red)' }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, o = c - (percent / 100) * c
  return (
    <div className="progress-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle className="progress-ring-bg" cx={size/2} cy={size/2} r={r} strokeWidth={stroke} />
        <circle className="progress-ring-fill" cx={size/2} cy={size/2} r={r} strokeWidth={stroke} stroke={color} strokeDasharray={c} strokeDashoffset={o} />
      </svg>
      <div className="progress-ring-text" style={{ fontSize: size * 0.28, color }}>{percent}%</div>
    </div>
  )
}

function getGreeting() { const h = new Date().getHours(); if (h < 12) return 'Good Morning'; if (h < 17) return 'Good Afternoon'; return 'Good Evening' }

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [scores, setScores] = useState([])
  const [badges, setBadges] = useState([])
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [totalAttempts, setTotalAttempts] = useState(0)
  const router = useRouter()

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('user') || 'null')
    if (!u) { router.push('/'); return }
    setUser(u); loadData(u.id)
  }, [])

  async function loadData(uid) {
    setLoading(true)
    const [{ data: s }, { data: b }, { data: a }, { count }] = await Promise.all([
      supabase.from('scores').select('*').eq('user_id', uid).order('date', { ascending: false }).limit(5),
      supabase.from('badges').select('*').eq('user_id', uid),
      supabase.from('assignments').select('*').eq('assigned_to', uid).eq('completed', false),
      supabase.from('attempts').select('*', { count: 'exact', head: true }).eq('user_id', uid)
    ])
    setScores(s || []); setBadges(b || []); setAssignments(a || []); setTotalAttempts(count || 0); setLoading(false)
  }

  if (!user) return null

  if (loading) return (
    <div style={{ minHeight: '100dvh' }}>
      <Particles />
      <div className="navbar">
        <img src="/lapizblue-logo.png" alt="LapizBlue" style={{ height: 26, filter: 'brightness(1.8)' }} />
        <div style={{ fontFamily: 'Rajdhani', fontSize: 18, fontWeight: 700 }}>Dashboard</div>
        <div style={{ width: 60 }} />
      </div>
      <div className="loading-screen"><div className="spinner" /><span>Loading your dashboard...</span></div>
    </div>
  )

  const bestScore = scores.length ? Math.max(...scores.map(s => s.score)) : 0
  const currentLevel = scores.length ? scores[0].level : 'Foundation'

  return (
    <div style={{ minHeight: '100dvh', position: 'relative' }}>
      <Particles />
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Navbar */}
        <div className="navbar">
          <img src="/lapizblue-logo.png" alt="LapizBlue" style={{ height: 26, filter: 'brightness(1.8)' }} />
          <div style={{ fontFamily: 'Rajdhani', fontSize: 18, fontWeight: 700 }}>Dashboard</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--red)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>
              {user.username.charAt(0).toUpperCase()}
            </div>
            <button className="btn btn-ghost btn-sm" style={{ width: 'auto' }} onClick={() => { localStorage.removeItem('user'); router.push('/') }}>Logout</button>
          </div>
        </div>

        <div className="page">
          {/* Welcome */}
          <div className="welcome-banner animate-fade">
            <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 4 }}>{getGreeting()},</div>
            <div style={{ fontSize: 28, fontFamily: 'Rajdhani', fontWeight: 800, marginBottom: 4 }}>{user.username}</div>
            <span className={`badge ${LEVEL_CLASS[currentLevel] || ''}`} style={{ marginTop: 4 }}>{currentLevel}</span>
          </div>

          {/* Assignments */}
          {assignments.length > 0 && (
            <div className="card animate-fade stagger-1" style={{ marginBottom: 16, borderColor: 'rgba(227,6,19,0.4)', borderWidth: 2 }}>
              <div style={{ color: '#ff6b6b', fontWeight: 700, marginBottom: 12, fontFamily: 'Rajdhani', fontSize: 18 }}>Mandatory Quiz Pending</div>
              {assignments.map(a => (
                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                  <div>
                    <span className={`badge ${LEVEL_CLASS[a.quiz_level] || ''}`}>{a.quiz_level}</span>
                    {a.due_date && <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 8 }}>Due {a.due_date}</span>}
                  </div>
                  <button className="btn btn-primary btn-sm" style={{ width: 'auto' }} onClick={() => router.push(`/quiz?level=${a.quiz_level}&assignment=${a.id}`)}>Start</button>
                </div>
              ))}
            </div>
          )}

          {/* Stats */}
          <div className="animate-fade stagger-2" style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
            <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 18 }}>
              <ProgressRing percent={bestScore} size={80} color={bestScore >= 80 ? '#4ade80' : bestScore >= 50 ? '#fbbf24' : '#ff6b6b'} />
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8, fontWeight: 500 }}>Best Score</div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="stat-card" style={{ flex: 1 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: LEVEL_COLOR[currentLevel] || '#4ade80', fontFamily: 'Rajdhani' }}>{currentLevel}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Current Level</div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div className="stat-card" style={{ flex: 1 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#60a5fa', fontFamily: 'Rajdhani' }}>{totalAttempts}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Questions</div>
                </div>
                <div className="stat-card" style={{ flex: 1 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#fbbf24', fontFamily: 'Rajdhani' }}>{badges.length}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Badges</div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="action-grid animate-fade stagger-3" style={{ marginBottom: 20 }}>
            {[
              { icon: '🎮', label: 'Start Quiz', sub: currentLevel, action: () => router.push('/quiz') },
              { icon: '🏆', label: 'Leaderboard', sub: 'Top scores', action: () => router.push('/leaderboard') },
              { icon: '🎖️', label: 'My Badges', sub: `${badges.length} earned`, action: () => router.push('/badges') },
            ].map(item => (
              <div key={item.label} className="action-card card-hover" onClick={item.action}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>{item.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 15, fontFamily: 'Rajdhani' }}>{item.label}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{item.sub}</div>
              </div>
            ))}
          </div>

          {/* Recent scores */}
          {scores.length > 0 && (
            <div className="card animate-fade stagger-4" style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: 'Rajdhani', fontSize: 18, fontWeight: 700, marginBottom: 14 }}>Recent Scores</div>
              {scores.map((s, i) => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: i < scores.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{s.category || 'General'}</div>
                    <span className={`badge ${LEVEL_CLASS[s.level] || ''}`} style={{ marginTop: 4 }}>{s.level}</span>
                  </div>
                  <div style={{ fontFamily: 'Rajdhani', fontSize: 22, fontWeight: 800, color: s.score >= 80 ? '#4ade80' : s.score >= 50 ? '#fbbf24' : '#ff6b6b' }}>
                    {s.score}%
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Badges */}
          {badges.length > 0 && (
            <div className="card animate-fade stagger-5">
              <div style={{ fontFamily: 'Rajdhani', fontSize: 18, fontWeight: 700, marginBottom: 14 }}>My Badges</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {badges.map(b => (
                  <div key={b.id} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 500, border: '1px solid rgba(255,255,255,0.08)' }}>
                    {BADGE_ICONS[b.badge_name] || '🏅'} {b.badge_name}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="app-footer">Made by Adil Mohamed&nbsp;&nbsp;|&nbsp;&nbsp;LapizBlue &copy; 2026</div>
        </div>
      </div>
    </div>
  )
}
