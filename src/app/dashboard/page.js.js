'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

const BADGE_ICONS = { 'First Quiz': '🎯', 'Perfect Score': '💯', 'Level Up': '⬆️', 'On Fire': '🔥', 'Weekly Champion': '🏆', 'Master': '👑' }
const LEVEL_COLOR = { Beginner: '#22c55e', Intermediate: '#f59e0b', Advanced: '#e30613' }

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

  async function loadData(uid) {
    const [{ data: s }, { data: b }, { data: a }] = await Promise.all([
      supabase.from('scores').select('*').eq('user_id', uid).order('date', { ascending: false }).limit(5),
      supabase.from('badges').select('*').eq('user_id', uid),
      supabase.from('assignments').select('*').eq('assigned_to', uid).eq('completed', false)
    ])
    setScores(s || []); setBadges(b || []); setAssignments(a || [])
  }

  if (!user) return null

  const bestScore = scores.length ? Math.max(...scores.map(s => s.score)) : 0
  const currentLevel = scores.length ? scores[0].level : 'Beginner'

  return (
    <div style={{ background: 'var(--dark)', minHeight: '100dvh' }}>
      {/* Navbar */}
      <div className="navbar">
        <div style={{ fontFamily: 'Rajdhani', fontSize: 22, fontWeight: 700, color: 'var(--red)' }}>MAPEI</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>{user.username}</span>
          <button className="btn btn-secondary btn-sm" style={{ width: 'auto' }}
            onClick={() => { localStorage.removeItem('user'); router.push('/') }}>
            Logout
          </button>
        </div>
      </div>

      <div className="page">
        {/* Mandatory assignments */}
        {assignments.length > 0 && (
          <div className="card" style={{ marginBottom: 16, borderColor: 'var(--red)' }}>
            <div style={{ color: 'var(--red)', fontWeight: 700, marginBottom: 10 }}>⚠️ Mandatory Quiz Pending</div>
            {assignments.map(a => (
              <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 14 }}>{a.quiz_level} Level{a.due_date ? ` — Due ${a.due_date}` : ''}</span>
                <button className="btn btn-primary btn-sm" style={{ width: 'auto' }}
                  onClick={() => router.push(`/quiz?level=${a.quiz_level}&assignment=${a.id}`)}>
                  Start
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="stats-grid" style={{ marginBottom: 16 }}>
          {[
            { label: 'Level', value: currentLevel, color: LEVEL_COLOR[currentLevel] || 'var(--red)' },
            { label: 'Best Score', value: `${bestScore}%`, color: 'var(--green)' },
            { label: 'Badges', value: badges.length, color: 'var(--yellow)' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: 'Rajdhani' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="action-grid" style={{ marginBottom: 16 }}>
          {[
            { icon: '🎮', label: 'Start Quiz', sub: currentLevel, action: () => router.push('/quiz'), highlight: true },
            { icon: '🏆', label: 'Leaderboard', sub: 'Top scores', action: () => router.push('/leaderboard') },
            { icon: '🎖️', label: 'My Badges', sub: `${badges.length} earned`, action: () => router.push('/badges') },
            { icon: '📊', label: 'Reports', sub: 'Export scores', action: () => router.push('/reports') },
          ].map(item => (
            <div key={item.label} className="action-card" onClick={item.action}
              style={{ borderColor: item.highlight ? 'var(--red)' : 'var(--border)' }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>{item.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 15, fontFamily: 'Rajdhani' }}>{item.label}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{item.sub}</div>
            </div>
          ))}
        </div>

        {/* Recent scores */}
        {scores.length > 0 && (
          <div className="card">
            <div style={{ fontFamily: 'Rajdhani', fontSize: 17, fontWeight: 700, marginBottom: 12 }}>Recent Scores</div>
            {scores.map((s, i) => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < scores.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{s.level}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{s.category || 'General'}</div>
                </div>
                <div style={{ fontFamily: 'Rajdhani', fontSize: 20, fontWeight: 700, color: s.score >= 80 ? 'var(--green)' : s.score >= 50 ? 'var(--yellow)' : 'var(--red)' }}>
                  {s.score}%
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Badges preview */}
        {badges.length > 0 && (
          <div className="card" style={{ marginTop: 12 }}>
            <div style={{ fontFamily: 'Rajdhani', fontSize: 17, fontWeight: 700, marginBottom: 12 }}>My Badges</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {badges.map(b => (
                <div key={b.id} style={{ background: 'var(--card2)', borderRadius: 8, padding: '6px 12px', fontSize: 13 }}>
                  {BADGE_ICONS[b.badge_name] || '🏅'} {b.badge_name}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
