'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [scores, setScores] = useState([])
  const [badges, setBadges] = useState([])
  const [assignments, setAssignments] = useState([])
  const router = useRouter()

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('user') || 'null')
    if (!u) { router.push('/'); return }
    setUser(u)
    loadData(u.id)
  }, [])

  async function loadData(userId) {
    const { data: s } = await supabase.from('scores').select('*').eq('user_id', userId).order('date', { ascending: false }).limit(5)
    const { data: b } = await supabase.from('badges').select('*').eq('user_id', userId)
    const { data: a } = await supabase.from('assignments').select('*').eq('assigned_to', userId).eq('completed', false)
    setScores(s || [])
    setBadges(b || [])
    setAssignments(a || [])
  }

  function logout() { localStorage.removeItem('user'); router.push('/') }

  if (!user) return null

  const bestScore = scores.length ? Math.max(...scores.map(s => s.score)) : 0
  const currentLevel = scores.length ? scores[0].level : 'Beginner'

  const BADGE_ICONS = {
    'First Quiz': '🎯', 'Perfect Score': '💯', 'Level Up': '⬆️',
    'On Fire': '🔥', 'Weekly Champion': '🏆', 'Master': '👑'
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#E30613' }}>MAPEI</div>
          <div style={{ color: '#aaa' }}>Welcome back, <strong style={{ color: 'white' }}>{user.username}</strong></div>
        </div>
        <button className="btn-secondary" onClick={logout}>Logout</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Current Level', value: currentLevel, color: '#E30613' },
          { label: 'Best Score', value: `${bestScore}%`, color: '#4CAF50' },
          { label: 'Badges Earned', value: badges.length, color: '#FF9800' },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ color: '#aaa', fontSize: 14, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Mandatory Assignments */}
      {assignments.length > 0 && (
        <div className="card" style={{ marginBottom: 24, borderColor: '#E30613' }}>
          <h3 style={{ color: '#E30613', marginBottom: 12 }}>⚠️ Mandatory Quizzes Pending</h3>
          {assignments.map(a => (
            <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #2a2a4a' }}>
              <span>{a.quiz_level} Level Quiz — Due: {a.due_date || 'ASAP'}</span>
              <button className="btn-primary" onClick={() => router.push(`/quiz?level=${a.quiz_level}&assignment=${a.id}`)}>Start Now</button>
            </div>
          ))}
        </div>
      )}

      {/* Main Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: '🎮 Start Quiz', desc: `Current level: ${currentLevel}`, action: () => router.push('/quiz'), primary: true },
          { label: '🏆 Leaderboard', desc: 'See top scores', action: () => router.push('/leaderboard'), primary: false },
          { label: '🎖️ My Badges', desc: `${badges.length} badges earned`, action: () => router.push('/badges'), primary: false },
          { label: '📊 My Reports', desc: 'Export your scores', action: () => router.push('/reports'), primary: false },
        ].map(item => (
          <div key={item.label} className="card" style={{ cursor: 'pointer', transition: 'transform 0.2s', borderColor: item.primary ? '#E30613' : undefined }}
            onClick={item.action}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{item.label}</div>
            <div style={{ color: '#aaa', fontSize: 14 }}>{item.desc}</div>
          </div>
        ))}
      </div>

      {/* Recent Scores */}
      {scores.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Recent Scores</h3>
          {scores.map(s => (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #2a2a4a' }}>
              <span>{s.level} — {s.category || 'General'}</span>
              <span style={{ color: s.score >= 80 ? '#4CAF50' : s.score >= 50 ? '#FF9800' : '#E30613', fontWeight: 700 }}>{s.score}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Badges */}
      {badges.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 16 }}>My Badges</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {badges.map(b => (
              <div key={b.id} style={{ background: '#2a2a4a', borderRadius: 8, padding: '8px 16px', fontSize: 14 }}>
                {BADGE_ICONS[b.badge_name] || '🏅'} {b.badge_name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
