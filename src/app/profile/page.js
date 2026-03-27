'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import { AVATARS, getAvatar, getRank, getNextRank } from '../../lib/helpers'

function Particles({ count = 20 }) {
  const ref = useRef(null)
  useEffect(() => {
    const c = ref.current; if (!c) return; const ctx = c.getContext('2d'); let id
    const p = []; const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight }
    resize(); window.addEventListener('resize', resize)
    for (let i = 0; i < count; i++) p.push({ x: Math.random()*c.width, y: Math.random()*c.height, r: Math.random()*1.5+0.5, dx: (Math.random()-0.5)*0.2, dy: (Math.random()-0.5)*0.2, o: Math.random()*0.12+0.04 })
    function draw() { ctx.clearRect(0,0,c.width,c.height); for(const d of p){d.x+=d.dx;d.y+=d.dy;if(d.x<0)d.x=c.width;if(d.x>c.width)d.x=0;if(d.y<0)d.y=c.height;if(d.y>c.height)d.y=0;ctx.beginPath();ctx.arc(d.x,d.y,d.r,0,Math.PI*2);ctx.fillStyle=`rgba(255,255,255,${d.o})`;ctx.fill()}id=requestAnimationFrame(draw)}
    draw(); return () => { cancelAnimationFrame(id); window.removeEventListener('resize', resize) }
  }, [count])
  return <canvas ref={ref} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} />
}

export default function Profile() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedAvatar, setSelectedAvatar] = useState(null)
  const [quizCount, setQuizCount] = useState(0)
  const [badges, setBadges] = useState([])
  const router = useRouter()

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('user') || 'null')
    if (!u) { router.push('/'); return }
    setUser(u)
    setSelectedAvatar(u.avatar || 1)
    loadProfile(u.id)
  }, [])

  async function loadProfile(uid) {
    setLoading(true)
    const [{ data: freshUser }, { count }, { data: b }] = await Promise.all([
      supabase.from('users').select('*').eq('id', uid).single(),
      supabase.from('scores').select('*', { count: 'exact', head: true }).eq('user_id', uid),
      supabase.from('badges').select('*').eq('user_id', uid),
    ])
    if (freshUser) {
      const stored = JSON.parse(localStorage.getItem('user') || '{}')
      const updated = { ...stored, ...freshUser }
      localStorage.setItem('user', JSON.stringify(updated))
      setUser(updated)
      setSelectedAvatar(updated.avatar || 1)
    }
    setQuizCount(count || 0)
    setBadges(b || [])
    setLoading(false)
  }

  async function saveAvatar() {
    if (!user || selectedAvatar === user.avatar) return
    setSaving(true)
    await supabase.from('users').update({ avatar: selectedAvatar }).eq('id', user.id)
    const updated = { ...user, avatar: selectedAvatar }
    localStorage.setItem('user', JSON.stringify(updated))
    setUser(updated)
    setSaving(false)
  }

  if (!user) return null

  const xp = user.xp || 0
  const rank = getRank(xp)
  const nextRank = getNextRank(xp)
  const avatar = getAvatar(selectedAvatar)
  const currentAvatar = getAvatar(user.avatar)

  return (
    <div style={{ minHeight: '100dvh', position: 'relative' }}>
      <Particles />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="navbar">
          <img src="/lapizblue-logo.png" alt="LapizBlue" style={{ height: 26, filter: 'brightness(1.8)' }} />
          <div style={{ fontFamily: 'Rajdhani', fontSize: 18, fontWeight: 700 }}>Profile</div>
          <button className="btn btn-ghost btn-sm" style={{ width: 'auto' }} onClick={() => router.push('/dashboard')}>Back</button>
        </div>

        <div className="page">
          {loading ? (
            <div className="loading-screen"><div className="spinner" /><span>Loading profile...</span></div>
          ) : (
            <>
              {/* Profile Card */}
              <div className="card animate-fade" style={{ marginBottom: 20, textAlign: 'center', padding: 30 }}>
                <div style={{ width: 90, height: 90, borderRadius: '50%', background: currentAvatar.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, margin: '0 auto 16px', border: '3px solid rgba(255,255,255,0.15)', boxShadow: `0 0 24px ${currentAvatar.color}30` }}>
                  {currentAvatar.emoji}
                </div>
                <div style={{ fontFamily: 'Rajdhani', fontSize: 26, fontWeight: 800 }}>{user.username}</div>
                {(user.first_name || user.last_name) && (
                  <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 4 }}>{user.first_name} {user.last_name}</div>
                )}
                {user.email && (
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{user.email}</div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 }}>
                  <span style={{ background: `${rank.color}20`, color: rank.color, border: `1px solid ${rank.color}40`, padding: '4px 14px', borderRadius: 12, fontSize: 13, fontWeight: 700 }}>
                    {rank.icon} {rank.name}
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="animate-fade stagger-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
                {[
                  { val: xp, label: 'Total XP', color: '#ff6b6b' },
                  { val: quizCount, label: 'Quizzes', color: '#60a5fa' },
                  { val: badges.length, label: 'Badges', color: '#fbbf24' },
                ].map(s => (
                  <div key={s.label} className="stat-card">
                    <div style={{ fontFamily: 'Rajdhani', fontSize: 22, fontWeight: 800, color: s.color }}>{s.val}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* XP Progress */}
              {nextRank && (
                <div className="card animate-fade stagger-2" style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Rank Progress</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
                    <span>{rank.icon} {rank.name} ({xp} XP)</span>
                    <span>{nextRank.icon} {nextRank.name} ({nextRank.minXp} XP)</span>
                  </div>
                  <div style={{ height: 10, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, ((xp - rank.minXp) / (nextRank.minXp - rank.minXp)) * 100)}%`, background: `linear-gradient(90deg, ${rank.color}, ${nextRank.color})`, borderRadius: 99, transition: 'width 0.8s ease' }} />
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8, textAlign: 'center' }}>{nextRank.minXp - xp} XP to next rank</div>
                </div>
              )}

              {/* Change Avatar */}
              <div className="card animate-fade stagger-3" style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>Change Avatar</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
                  {AVATARS.map(a => (
                    <div key={a.id} onClick={() => setSelectedAvatar(a.id)}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        padding: '12px 8px', borderRadius: 14, cursor: 'pointer', transition: 'all 0.2s',
                        background: selectedAvatar === a.id ? `${a.color}20` : 'rgba(255,255,255,0.03)',
                        border: `2px solid ${selectedAvatar === a.id ? a.color : 'rgba(255,255,255,0.06)'}`,
                        boxShadow: selectedAvatar === a.id ? `0 0 16px ${a.color}25` : 'none',
                      }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: a.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{a.emoji}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: selectedAvatar === a.id ? 'white' : 'var(--muted)' }}>{a.name}</div>
                    </div>
                  ))}
                </div>
                {selectedAvatar !== user.avatar && (
                  <button className="btn btn-primary" onClick={saveAvatar} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Avatar'}
                  </button>
                )}
              </div>

              {/* Account Info */}
              <div className="card animate-fade stagger-4" style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>Account Info</div>
                {[
                  { label: 'Username', val: user.username },
                  { label: 'Name', val: [user.first_name, user.last_name].filter(Boolean).join(' ') || '—' },
                  { label: 'Email', val: user.email || '—' },
                  { label: 'Role', val: user.role || 'user' },
                  { label: 'Joined', val: user.created_at ? new Date(user.created_at).toLocaleDateString() : '—' },
                ].map((item, i, arr) => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>{item.label}</span>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{item.val}</span>
                  </div>
                ))}
              </div>

              <div className="app-footer">Made by Adil Mohamed&nbsp;&nbsp;|&nbsp;&nbsp;LapizBlue &copy; 2026</div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
