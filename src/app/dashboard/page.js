'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import { AVATARS, getAvatar, getRank, getNextRank, LEVELS, LEVEL_CLASS } from '../../lib/helpers'

const BADGE_ICONS = { 'First Quiz': '🎯', 'Perfect Score': '💯', 'Level Up': '⬆️', 'On Fire': '🔥', 'Weekly Champion': '🏆', 'Master': '👑' }

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

function getGreeting() { const h = new Date().getHours(); return h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening' }

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [scores, setScores] = useState([])
  const [badges, setBadges] = useState([])
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [quizCount, setQuizCount] = useState(0)
  const [topUsers, setTopUsers] = useState([])
  const [myRank, setMyRank] = useState(0)
  const router = useRouter()

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('user') || 'null')
    if (!u) { router.push('/'); return }
    if (!u.avatar || u.avatar === 0) { router.push('/avatar'); return }
    setUser(u); loadData(u.id)
  }, [])

  async function loadData(uid) {
    setLoading(true)
    const [{ data: s }, { data: b }, { data: a }, { count }, { data: allUsers }, { data: freshUser }] = await Promise.all([
      supabase.from('scores').select('*').eq('user_id', uid).order('date', { ascending: false }).limit(5),
      supabase.from('badges').select('*').eq('user_id', uid),
      supabase.from('assignments').select('*').eq('assigned_to', uid).eq('completed', false),
      supabase.from('scores').select('*', { count: 'exact', head: true }).eq('user_id', uid),
      supabase.from('users').select('id, username, xp, rank, avatar').neq('role', 'admin').order('xp', { ascending: false }).limit(10),
      supabase.from('users').select('*').eq('id', uid).single()
    ])
    setScores(s || []); setBadges(b || []); setAssignments(a || []); setQuizCount(count || 0)
    const sorted = (allUsers || []).sort((a, b) => b.xp - a.xp)
    setTopUsers(sorted.slice(0, 3))
    const pos = sorted.findIndex(u => u.id === uid)
    setMyRank(pos >= 0 ? pos + 1 : 0)
    // Sync fresh user data to localStorage
    if (freshUser) {
      const stored = JSON.parse(localStorage.getItem('user') || '{}')
      const updated = { ...stored, xp: freshUser.xp || 0, rank: freshUser.rank || 'Apprentice', avatar: freshUser.avatar || 1 }
      localStorage.setItem('user', JSON.stringify(updated))
      setUser(updated)
    }
    setLoading(false)
  }

  if (!user) return null
  const xp = user.xp || 0
  const rank = getRank(xp)
  const nextRank = getNextRank(xp)
  const avatar = getAvatar(user.avatar)
  const bestScore = scores.length ? Math.max(...scores.map(s => s.score)) : 0
  const passedLevels = [...new Set(scores.filter(s => s.score >= 70).map(s => s.level))]

  if (loading) return (
    <div style={{ minHeight: '100dvh' }}>
      <Particles />
      <div className="navbar">
        <img src="/lapizblue-logo.png" alt="LapizBlue" style={{ height: 26, filter: 'brightness(1.8)' }} />
        <div style={{ fontFamily: 'Rajdhani', fontSize: 18, fontWeight: 700 }}>Dashboard</div>
        <div style={{ width: 60 }} />
      </div>
      <div className="page">
        {/* Skeleton hero card */}
        <div className="card animate-fade" style={{ marginBottom: 20, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div className="skeleton-pulse" style={{ width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton-pulse" style={{ height: 12, width: '40%', background: 'rgba(255,255,255,0.06)', borderRadius: 6, marginBottom: 10 }} />
              <div className="skeleton-pulse" style={{ height: 20, width: '60%', background: 'rgba(255,255,255,0.06)', borderRadius: 6, marginBottom: 10 }} />
              <div className="skeleton-pulse" style={{ height: 14, width: '35%', background: 'rgba(255,255,255,0.06)', borderRadius: 10 }} />
            </div>
          </div>
          <div className="skeleton-pulse" style={{ height: 8, width: '100%', background: 'rgba(255,255,255,0.06)', borderRadius: 99, marginTop: 16 }} />
        </div>
        {/* Skeleton stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
          {[0,1,2,3].map(i => (
            <div key={i} className="stat-card" style={{ padding: 18 }}>
              <div className="skeleton-pulse" style={{ height: 22, width: '60%', background: 'rgba(255,255,255,0.06)', borderRadius: 6, margin: '0 auto 8px' }} />
              <div className="skeleton-pulse" style={{ height: 10, width: '80%', background: 'rgba(255,255,255,0.06)', borderRadius: 6, margin: '0 auto' }} />
            </div>
          ))}
        </div>
        {/* Skeleton action cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          {[0,1,2,3].map(i => (
            <div key={i} className="card" style={{ padding: 22, textAlign: 'center' }}>
              <div className="skeleton-pulse" style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', margin: '0 auto 10px' }} />
              <div className="skeleton-pulse" style={{ height: 14, width: '70%', background: 'rgba(255,255,255,0.06)', borderRadius: 6, margin: '0 auto' }} />
            </div>
          ))}
        </div>
      </div>
      <style jsx>{`
        @keyframes skeletonShimmer { 0% { opacity: 0.4; } 50% { opacity: 0.8; } 100% { opacity: 0.4; } }
        .skeleton-pulse { animation: skeletonShimmer 1.5s ease-in-out infinite; }
      `}</style>
    </div>
  )

  return (
    <div style={{ minHeight: '100dvh', position: 'relative' }}>
      <Particles />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="navbar">
          <img src="/lapizblue-logo.png" alt="LapizBlue" style={{ height: 26, filter: 'brightness(1.8)' }} />
          <div style={{ fontFamily: 'Rajdhani', fontSize: 18, fontWeight: 700 }}>Dashboard</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: avatar.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{avatar.emoji}</div>
            <button className="btn btn-ghost btn-sm" style={{ width: 'auto' }} onClick={() => { localStorage.removeItem('user'); router.push('/') }}>Logout</button>
          </div>
        </div>

        <div className="page">
          {/* Hero card */}
          <div className="card animate-fade" style={{ marginBottom: 20, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <div onClick={() => router.push('/avatar')} style={{ width: 70, height: 70, borderRadius: '50%', background: avatar.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, cursor: 'pointer', border: '3px solid rgba(255,255,255,0.15)', boxShadow: `0 0 20px ${avatar.color}30`, flexShrink: 0 }}>
                {avatar.emoji}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>{getGreeting()}</div>
                <div style={{ fontSize: 22, fontFamily: 'Rajdhani', fontWeight: 800, marginTop: 2 }}>{user.username}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                  <span style={{ background: `${rank.color}20`, color: rank.color, border: `1px solid ${rank.color}40`, padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
                    {rank.icon} {rank.name}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>{xp} XP</span>
                </div>
              </div>
            </div>
            {/* XP bar */}
            {nextRank && (
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>
                  <span>{xp} XP</span>
                  <span>{nextRank.minXp} XP to {nextRank.name}</span>
                </div>
                <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, ((xp - rank.minXp) / (nextRank.minXp - rank.minXp)) * 100)}%`, background: `linear-gradient(90deg, ${rank.color}, ${nextRank.color})`, borderRadius: 99, transition: 'width 0.8s ease' }} />
                </div>
              </div>
            )}
          </div>

          {/* Start Quiz CTA */}
          <button className="btn btn-primary animate-fade stagger-1" onClick={() => router.push('/quiz')}
            style={{ marginBottom: 20, fontSize: 18, padding: '16px 28px', minHeight: 58, boxShadow: '0 6px 28px rgba(227,6,19,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            🚀 Start Quiz
          </button>

          {/* Assignments */}
          {assignments.length > 0 && (
            <div className="card animate-fade stagger-1" style={{ marginBottom: 16, borderColor: 'rgba(227,6,19,0.4)', borderWidth: 2 }}>
              <div style={{ color: '#ff6b6b', fontWeight: 700, marginBottom: 12, fontFamily: 'Rajdhani', fontSize: 18 }}>Mandatory Quiz Pending</div>
              {assignments.map(a => (
                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                  <span className={`badge ${LEVEL_CLASS[a.quiz_level] || ''}`}>{a.quiz_level}</span>
                  <button className="btn btn-primary btn-sm" style={{ width: 'auto' }} onClick={() => router.push(`/quiz?level=${a.quiz_level}&assignment=${a.id}`)}>Start</button>
                </div>
              ))}
            </div>
          )}

          {/* Progress Map */}
          <div className="card animate-fade stagger-2" style={{ marginBottom: 20, padding: 20, overflowX: 'auto' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Progress Journey</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', minWidth: 300 }}>
              {/* Line */}
              <div style={{ position: 'absolute', top: 20, left: 25, right: 25, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }} />
              <div style={{ position: 'absolute', top: 20, left: 25, height: 3, background: 'linear-gradient(90deg, #4ade80, #fbbf24)', borderRadius: 2, width: `${Math.min(100, (passedLevels.length / LEVELS.length) * 100)}%`, transition: 'width 1s ease' }} />
              {LEVELS.map((l, i) => {
                const passed = passedLevels.includes(l)
                const current = !passed && (i === 0 || passedLevels.includes(LEVELS[i - 1]))
                return (
                  <div key={l} style={{ textAlign: 'center', position: 'relative', zIndex: 1, flex: 1 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%', margin: '0 auto 8px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: passed ? 18 : 14, fontWeight: 700,
                      background: passed ? '#4ade80' : current ? 'var(--red)' : 'rgba(255,255,255,0.06)',
                      color: passed || current ? 'white' : 'rgba(255,255,255,0.3)',
                      border: current ? '2px solid var(--red)' : 'none',
                      boxShadow: current ? '0 0 15px rgba(227,6,19,0.3)' : passed ? '0 0 10px rgba(74,222,128,0.2)' : 'none',
                      animation: current ? 'pulse 1.5s ease infinite' : 'none',
                    }}>
                      {passed ? '✓' : current ? (i + 1) : '🔒'}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: passed ? '#4ade80' : current ? 'white' : 'rgba(255,255,255,0.25)' }}>{l}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Stats row */}
          <div className="animate-fade stagger-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
            {[
              { val: `${bestScore}%`, label: 'Best Score', color: '#4ade80' },
              { val: quizCount, label: 'Quizzes', color: '#60a5fa' },
              { val: badges.length, label: 'Badges', color: '#fbbf24' },
              { val: rank.name, label: 'Rank', color: rank.color },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div style={{ fontFamily: 'Rajdhani', fontSize: 20, fontWeight: 800, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Team Competition */}
          {topUsers.length > 0 && (
            <div className="card animate-fade stagger-4" style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: 'Rajdhani', fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Team Competition</div>
              {topUsers.slice(0, 3).map((u, i) => {
                const av = getAvatar(u.avatar)
                return (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <span style={{ fontFamily: 'Rajdhani', fontSize: 16, fontWeight: 800, color: ['#FFD700', '#C0C0C0', '#CD7F32'][i], width: 20 }}>#{i + 1}</span>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: av.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{av.emoji}</div>
                    <div style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{u.username} {u.id === user.id ? <span style={{ color: '#60a5fa', fontSize: 11 }}>(You)</span> : ''}</div>
                    <span style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 14 }}>{u.xp || 0} XP</span>
                  </div>
                )
              })}
              {myRank > 3 && <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 10, textAlign: 'center' }}>You are #{myRank} on the team</div>}
            </div>
          )}

          {/* Quick Actions */}
          <div className="animate-fade stagger-5" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
            {[
              { icon: '🚀', label: 'Start Quiz', action: () => router.push('/quiz') },
              { icon: '🏆', label: 'Leaderboard', action: () => router.push('/leaderboard') },
              { icon: '📊', label: 'My Reports', action: () => router.push('/reports') },
              { icon: '🎖️', label: 'Badges', action: () => router.push('/badges') },
            ].map(item => (
              <div key={item.label} className="action-card card-hover" onClick={item.action}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>{item.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 14, fontFamily: 'Rajdhani' }}>{item.label}</div>
              </div>
            ))}
          </div>

          {/* Recent scores */}
          {scores.length > 0 && (
            <div className="card animate-fade" style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: 'Rajdhani', fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Recent Scores</div>
              {scores.map((s, i) => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < scores.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <div>
                    <span className={`badge ${LEVEL_CLASS[s.level] || ''}`}>{s.level}</span>
                    <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 8 }}>{s.category || 'General'}</span>
                  </div>
                  <div style={{ fontFamily: 'Rajdhani', fontSize: 20, fontWeight: 800, color: s.score >= 80 ? '#4ade80' : s.score >= 50 ? '#fbbf24' : '#ff6b6b' }}>{s.score}%</div>
                </div>
              ))}
            </div>
          )}

          <div className="app-footer">Made by Adil Mohamed&nbsp;&nbsp;|&nbsp;&nbsp;LapizBlue &copy; 2026</div>
        </div>
      </div>
    </div>
  )
}
