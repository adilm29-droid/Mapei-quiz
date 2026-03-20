'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

const ALL_BADGES = [
  { name: 'First Quiz', icon: '🎯', desc: 'Complete your first quiz' },
  { name: 'Perfect Score', icon: '💯', desc: 'Score 100% on any quiz' },
  { name: 'Level Up', icon: '⬆️', desc: 'Advance to next difficulty level' },
  { name: 'On Fire', icon: '🔥', desc: 'Complete 5 quizzes' },
  { name: 'Weekly Champion', icon: '🏆', desc: 'Win the weekly challenge' },
  { name: 'Master', icon: '👑', desc: 'Pass Expert level' },
]

export default function Badges() {
  const [earned, setEarned] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('user') || 'null')
    if (!u) { router.push('/'); return }
    setUser(u)
    supabase.from('badges').select('badge_name').eq('user_id', u.id).then(({ data }) => {
      setEarned((data || []).map(b => b.badge_name))
      setLoading(false)
    })
  }, [])

  return (
    <div style={{ background: 'var(--dark)', minHeight: '100dvh' }}>
      <div className="navbar">
        <button onClick={() => router.push('/dashboard')}
          style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 22, fontWeight: 600 }}>←</button>
        <div style={{ fontFamily: 'Rajdhani', fontSize: 22, fontWeight: 700 }}>My Badges</div>
        <div style={{ width: 30 }} />
      </div>

      <div className="page">
        {loading ? (
          <div className="loading-screen">
            <div className="spinner" />
            <span>Loading badges...</span>
          </div>
        ) : (
          <>
            {/* Progress summary */}
            <div className="card animate-fade" style={{ marginBottom: 20, textAlign: 'center' }}>
              <div style={{ fontFamily: 'Rajdhani', fontSize: 36, fontWeight: 800, color: 'var(--yellow)' }}>
                {earned.length} / {ALL_BADGES.length}
              </div>
              <div style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>Badges Earned</div>
              <div className="progress-bar" style={{ marginTop: 14, height: 8 }}>
                <div className="progress-fill" style={{ width: `${(earned.length / ALL_BADGES.length) * 100}%`, background: 'var(--yellow)' }} />
              </div>
            </div>

            {/* Badge grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
              {ALL_BADGES.map((b, i) => {
                const have = earned.includes(b.name)
                return (
                  <div key={b.name} className={`card animate-fade ${have ? 'card-hover' : ''}`}
                    style={{
                      textAlign: 'center',
                      opacity: have ? 1 : 0.45,
                      borderColor: have ? 'var(--yellow)' : 'var(--border)',
                      borderWidth: have ? 2 : 1,
                      animationDelay: `${i * 0.06}s`,
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                    {have && (
                      <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(34,197,94,0.1)', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
                        ✅
                      </div>
                    )}
                    <div style={{ fontSize: 52, marginBottom: 10 }}>{b.icon}</div>
                    <div style={{ fontWeight: 700, fontSize: 17, fontFamily: 'Rajdhani' }}>{b.name}</div>
                    <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 6, lineHeight: 1.4 }}>{b.desc}</div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        <div style={{ height: 20 }} />
      </div>
    </div>
  )
}
