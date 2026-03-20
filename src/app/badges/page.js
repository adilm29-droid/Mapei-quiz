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
  { name: 'Master', icon: '👑', desc: 'Pass Advanced level' },
]

export default function Badges() {
  const [earned, setEarned] = useState([])
  const [user, setUser] = useState(null)
  const router = useRouter()

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('user') || 'null')
    if (!u) { router.push('/'); return }
    setUser(u)
    supabase.from('badges').select('badge_name').eq('user_id', u.id).then(({ data }) => {
      setEarned((data || []).map(b => b.badge_name))
    })
  }, [])

  return (
    <div style={{ maxWidth: 700, margin: '40px auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 26, fontWeight: 800 }}>🎖️ Badges</h2>
        <button className="btn-secondary" onClick={() => router.push('/dashboard')}>Back</button>
      </div>
      <div style={{ marginBottom: 16, color: '#aaa' }}>{earned.length} of {ALL_BADGES.length} badges earned</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        {ALL_BADGES.map(b => {
          const have = earned.includes(b.name)
          return (
            <div key={b.name} className="card" style={{ textAlign: 'center', opacity: have ? 1 : 0.4, borderColor: have ? '#E30613' : undefined }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>{b.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{b.name}</div>
              <div style={{ color: '#aaa', fontSize: 13, marginTop: 4 }}>{b.desc}</div>
              {have && <div style={{ color: '#4CAF50', fontSize: 12, marginTop: 8 }}>✅ Earned</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
