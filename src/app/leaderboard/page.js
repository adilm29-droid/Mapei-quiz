'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

const MEDALS = ['🥇', '🥈', '🥉']
const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32']
const LEVEL_CLASS = { Foundation: 'level-foundation', Practitioner: 'level-practitioner', Advanced: 'level-advanced', Expert: 'level-expert' }

export default function Leaderboard() {
  const [data, setData] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('user') || 'null')
    if (!u) { router.push('/'); return }
    setUser(u)
    loadLeaderboard()
  }, [])

  async function loadLeaderboard() {
    setLoading(true)
    const { data } = await supabase.from('scores').select('user_id, score, level, users(username)').order('score', { ascending: false }).limit(50)
    const map = {}
    for (const row of data || []) {
      if (!map[row.user_id] || row.score > map[row.user_id].score) map[row.user_id] = row
    }
    setData(Object.values(map).sort((a, b) => b.score - a.score).slice(0, 10))
    setLoading(false)
  }

  return (
    <div style={{ background: 'var(--dark)', minHeight: '100dvh' }}>
      <div className="navbar">
        <button onClick={() => router.push(user?.role === 'admin' ? '/admin' : '/dashboard')}
          style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 22, fontWeight: 600 }}>←</button>
        <div style={{ fontFamily: 'Rajdhani', fontSize: 22, fontWeight: 700 }}>Leaderboard</div>
        <div style={{ width: 30 }} />
      </div>
      <div className="page">
        {loading ? (
          <div className="loading-screen">
            <div className="spinner" />
            <span>Loading leaderboard...</span>
          </div>
        ) : data.length === 0 ? (
          <div className="card empty animate-fade">
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>No scores yet</div>
            <div style={{ color: 'var(--muted)', marginTop: 4 }}>Be the first to take a quiz!</div>
          </div>
        ) : (
          <div>
            {/* Top 3 podium */}
            {data.length >= 3 && (
              <div className="animate-fade" style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 10, marginBottom: 24, paddingTop: 16 }}>
                {[1, 0, 2].map(i => {
                  const row = data[i]
                  if (!row) return null
                  const isFirst = i === 0
                  return (
                    <div key={i} style={{ textAlign: 'center', flex: 1 }}>
                      <div style={{ fontSize: isFirst ? 40 : 30, marginBottom: 6 }}>{MEDALS[i]}</div>
                      <div className="card" style={{
                        padding: isFirst ? '24px 12px' : '18px 10px',
                        borderColor: MEDAL_COLORS[i],
                        borderWidth: 2,
                        background: isFirst ? 'linear-gradient(135deg, rgba(255,215,0,0.05), var(--card))' : 'var(--card)'
                      }}>
                        <div style={{ width: isFirst ? 48 : 38, height: isFirst ? 48 : 38, borderRadius: '50%', background: 'var(--red)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: isFirst ? 18 : 14, margin: '0 auto 8px' }}>
                          {row.users?.username?.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ fontWeight: 700, fontSize: isFirst ? 15 : 13, fontFamily: 'Rajdhani' }}>{row.users?.username}</div>
                        <div style={{ fontFamily: 'Rajdhani', fontSize: isFirst ? 28 : 22, fontWeight: 900, color: MEDAL_COLORS[i], marginTop: 4 }}>
                          {row.score}%
                        </div>
                        <span className={`badge ${LEVEL_CLASS[row.level]}`} style={{ marginTop: 6 }}>{row.level}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Rest of leaderboard */}
            {data.slice(3).map((row, i) => (
              <div key={row.user_id} className="card animate-fade" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14, animationDelay: `${(i + 1) * 0.05}s` }}>
                <div style={{ fontFamily: 'Rajdhani', fontSize: 22, fontWeight: 800, color: 'var(--muted)', width: 36, textAlign: 'center' }}>
                  #{i + 4}
                </div>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(59,130,246,0.1)', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>
                  {row.users?.username?.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, fontFamily: 'Rajdhani' }}>{row.users?.username}</div>
                  <span className={`badge ${LEVEL_CLASS[row.level]}`}>{row.level}</span>
                </div>
                <div style={{ fontFamily: 'Rajdhani', fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>
                  {row.score}%
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
