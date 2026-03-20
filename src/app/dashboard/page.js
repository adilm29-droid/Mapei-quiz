'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

const BADGE_ICONS = { 'First Quiz': '🎯', 'Perfect Score': '💯', 'Level Up': '⬆️', 'On Fire': '🔥', 'Weekly Champion': '🏆', 'Master': '👑' }
const LEVEL_COLOR = { Foundation: 'var(--green)', Practitioner: 'var(--yellow)', Advanced: 'var(--red)', Expert: '#8b5cf6' }
const LEVEL_CLASS = { Foundation: 'level-foundation', Practitioner: 'level-practitioner', Advanced: 'level-advanced', Expert: 'level-expert' }

function ProgressRing({ percent, size = 100, stroke = 8, color = 'var(--red)' }) {
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
      <div className="progress-ring-text" style={{ fontSize: size * 0.28, color }}>
        {percent}%
      </div>
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good Morning'
  if (h < 17) return 'Good Afternoon'
  return 'Good Evening'
}

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
    setUser(u)
    loadData(u.id)
  }, [])

  async function loadData(uid) {
    setLoading(true)
    const [{ data: s }, { data: b }, { data: a }, { count }] = await Promise.all([
      supabase.from('scores').select('*').eq('user_id', uid).order('date', { ascending: false }).limit(5),
      supabase.from('badges').select('*').eq('user_id', uid),
      supabase.from('assignments').select('*').eq('assigned_to', uid).eq('completed', false),
      supabase.from('attempts').select('*', { count: 'exact', head: true }).eq('user_id', uid)
    ])
    setScores(s || []); setBadges(b || []); setAssignments(a || []); setTotalAttempts(count || 0)
    setLoading(false)
  }

  if (!user) return null

  if (loading) return (
    <div style={{ background: 'var(--dark)', minHeight: '100dvh' }}>
      <div className="navbar">
        <div style={{ fontFamily: 'Rajdhani', fontSize: 22, fontWeight: 700, color: 'var(--red)' }}>Staff Quiz</div>
        <div />
      </div>
      <div className="loading-screen">
        <div className="spinner" />
        <span>Loading your dashboard...</span>
      </div>
    </div>
  )

  const bestScore = scores.length ? Math.max(...scores.map(s => s.score)) : 0
  const currentLevel = scores.length ? scores[0].level : 'Foundation'

  return (
    <div style={{ background: 'var(--dark)', minHeight: '100dvh' }}>
      {/* Navbar */}
      <div className="navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/lapizblue-logo.png" alt="Lapiz Blue" style={{ height: 28 }} />
          <span style={{ fontFamily: 'Rajdhani', fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Staff Quiz</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--red)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>
            {user.username.charAt(0).toUpperCase()}
          </div>
          <button className="btn btn-ghost btn-sm" style={{ width: 'auto' }}
            onClick={() => { localStorage.removeItem('user'); router.push('/') }}>
            Logout
          </button>
        </div>
      </div>

      <div className="page">
        {/* Welcome banner */}
        <div className="welcome-banner animate-fade">
          <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 4 }}>{getGreeting()},</div>
          <div style={{ fontSize: 28, fontFamily: 'Rajdhani', fontWeight: 800, marginBottom: 8 }}>{user.username}</div>
          <div style={{ fontSize: 13, opacity: 0.85 }}>Ready to test your knowledge today?</div>
        </div>

        {/* Mandatory assignments */}
        {assignments.length > 0 && (
          <div className="card animate-fade stagger-1" style={{ marginBottom: 16, borderColor: 'var(--red)', borderWidth: 2 }}>
            <div style={{ color: 'var(--red)', fontWeight: 700, marginBottom: 12, fontFamily: 'Rajdhani', fontSize: 18 }}>Mandatory Quiz Pending</div>
            {assignments.map(a => (
              <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                <div>
                  <span className={`badge ${LEVEL_CLASS[a.quiz_level] || ''}`}>{a.quiz_level}</span>
                  {a.due_date && <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 8 }}>Due {a.due_date}</span>}
                </div>
                <button className="btn btn-primary btn-sm" style={{ width: 'auto' }}
                  onClick={() => router.push(`/quiz?level=${a.quiz_level}&assignment=${a.id}`)}>
                  Start
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Stats with Progress Ring */}
        <div className="animate-fade stagger-2" style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
          <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 18 }}>
            <ProgressRing percent={bestScore} size={80} color={bestScore >= 80 ? 'var(--green)' : bestScore >= 50 ? 'var(--yellow)' : 'var(--red)'} />
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8, fontWeight: 500 }}>Best Score</div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="stat-card" style={{ flex: 1 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: LEVEL_COLOR[currentLevel] || 'var(--green)', fontFamily: 'Rajdhani' }}>{currentLevel}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Current Level</div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div className="stat-card" style={{ flex: 1 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--blue)', fontFamily: 'Rajdhani' }}>{totalAttempts}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Questions</div>
              </div>
              <div className="stat-card" style={{ flex: 1 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--yellow)', fontFamily: 'Rajdhani' }}>{badges.length}</div>
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
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: i < scores.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{s.level}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{s.category || 'General'}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className={`badge ${LEVEL_CLASS[s.level] || ''}`}>{s.level}</span>
                  <div style={{ fontFamily: 'Rajdhani', fontSize: 22, fontWeight: 800, color: s.score >= 80 ? 'var(--green)' : s.score >= 50 ? 'var(--yellow)' : 'var(--red)' }}>
                    {s.score}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Badges preview */}
        {badges.length > 0 && (
          <div className="card animate-fade stagger-5">
            <div style={{ fontFamily: 'Rajdhani', fontSize: 18, fontWeight: 700, marginBottom: 14 }}>My Badges</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {badges.map(b => (
                <div key={b.id} style={{ background: 'var(--card2)', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 500, border: '1px solid var(--border)' }}>
                  {BADGE_ICONS[b.badge_name] || '🏅'} {b.badge_name}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ height: 20 }} />
      </div>
    </div>
  )
}
