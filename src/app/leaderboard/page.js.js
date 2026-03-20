'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

const MEDALS = ['🥇', '🥈', '🥉']
const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32']

export default function Leaderboard() {
  const [data, setData] = useState([])
  const [user, setUser] = useState(null)
  const router = useRouter()

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('user') || 'null')
    if (!u) { router.push('/'); return }
    setUser(u)
    loadLeaderboard()
  }, [])

  async function loadLeaderboard() {
    const { data } = await supabase.from('scores').select('user_id, score, level, users(username)').order('score', { ascending: false }).limit(50)
    const map = {}
    for (const row of data || []) {
      if (!map[row.user_id] || row.score > map[row.user_id].score) map[row.user_id] = row
    }
    setData(Object.values(map).sort((a, b) => b.score - a.score).slice(0, 10))
  }

  return (
    <div style={{ background: 'var(--dark)', minHeight: '100dvh' }}>
      <div className="navbar">
        <button onClick={() => router.push(user?.role === 'admin' ? '/admin' : '/dashboard')}
          style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 20 }}>←</button>
        <div style={{ fontFamily: 'Rajdhani', fontSize: 20, fontWeight: 700 }}>🏆 Leaderboard</div>
        <div style={{ width: 30 }} />
      </div>
      <div className="page">
        {data.length === 0 ? (
          <div className="empty">No scores yet. Be the first!</div>
        ) : data.map((row, i) => (
          <div key={row.user_id} className="card" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14, borderColor: i < 3 ? MEDAL_COLORS[i] : 'var(--border)' }}>
            <div style={{ fontSize: 32, width: 44, textAlign: 'center' }}>{MEDALS[i] || `#${i + 1}`}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 16, fontFamily: 'Rajdhani' }}>{row.users?.username}</div>
              <span className="badge badge-blue" style={{ marginTop: 4 }}>{row.level}</span>
            </div>
            <div style={{ fontFamily: 'Rajdhani', fontSize: 28, fontWeight: 900, color: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : 'var(--text)' }}>
              {row.score}%
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
