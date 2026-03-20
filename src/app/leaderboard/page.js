'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

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
    const { data } = await supabase
      .from('scores')
      .select('user_id, score, level, users(username)')
      .order('score', { ascending: false })
      .limit(20)

    // Aggregate best score per user
    const map = {}
    for (const row of data || []) {
      const uid = row.user_id
      if (!map[uid] || row.score > map[uid].score) map[uid] = row
    }
    setData(Object.values(map).sort((a, b) => b.score - a.score).slice(0, 10))
  }

  const MEDALS = ['🥇', '🥈', '🥉']

  return (
    <div style={{ maxWidth: 700, margin: '40px auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 26, fontWeight: 800 }}>🏆 Leaderboard</h2>
        <button className="btn-secondary" onClick={() => router.push(user?.role === 'admin' ? '/admin' : '/dashboard')}>Back</button>
      </div>

      {data.map((row, i) => (
        <div key={row.user_id} className="card" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 16,
          borderColor: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : undefined }}>
          <div style={{ fontSize: 28, width: 40, textAlign: 'center' }}>{MEDALS[i] || `#${i + 1}`}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 17 }}>{row.users?.username}</div>
            <div style={{ color: '#aaa', fontSize: 13 }}>{row.level} Level</div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#E30613' }}>{row.score}%</div>
        </div>
      ))}

      {data.length === 0 && (
        <div className="card" style={{ textAlign: 'center', color: '#aaa' }}>No scores yet. Be the first!</div>
      )}
    </div>
  )
}
