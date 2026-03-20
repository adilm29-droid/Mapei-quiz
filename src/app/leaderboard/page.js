'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

const MEDALS = ['🥇', '🥈', '🥉']
const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32']
const LEVEL_CLASS = { Foundation: 'level-foundation', Practitioner: 'level-practitioner', Advanced: 'level-advanced', Expert: 'level-expert' }

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

export default function Leaderboard() {
  const [data, setData] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('user') || 'null')
    if (!u) { router.push('/'); return }
    setUser(u); loadLeaderboard()
  }, [])

  async function loadLeaderboard() {
    setLoading(true)
    const { data } = await supabase.from('scores').select('user_id, score, level, users(username)').order('score', { ascending: false }).limit(50)
    const map = {}
    for (const row of data || []) { if (!map[row.user_id] || row.score > map[row.user_id].score) map[row.user_id] = row }
    setData(Object.values(map).sort((a, b) => b.score - a.score).slice(0, 10)); setLoading(false)
  }

  return (
    <div style={{ minHeight: '100dvh', position: 'relative' }}>
      <Particles />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="navbar">
          <img src="/lapizblue-logo.png" alt="LapizBlue" style={{ height: 26, filter: 'brightness(1.8)' }} />
          <div style={{ fontFamily: 'Rajdhani', fontSize: 18, fontWeight: 700 }}>Leaderboard</div>
          <button className="btn btn-ghost btn-sm" style={{ width: 'auto' }} onClick={() => router.push(user?.role === 'admin' ? '/admin' : '/dashboard')}>Back</button>
        </div>
        <div className="page">
          {loading ? (
            <div className="loading-screen"><div className="spinner" /><span>Loading leaderboard...</span></div>
          ) : data.length === 0 ? (
            <div className="card empty animate-fade"><div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div><div style={{ fontSize: 16, fontWeight: 600 }}>No scores yet</div><div style={{ color: 'var(--muted)', marginTop: 4 }}>Be the first to take a quiz!</div></div>
          ) : (
            <div>
              {data.length >= 3 && (
                <div className="animate-fade" style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 10, marginBottom: 24, paddingTop: 16 }}>
                  {[1, 0, 2].map(i => {
                    const row = data[i]; if (!row) return null; const isFirst = i === 0
                    return (
                      <div key={i} style={{ textAlign: 'center', flex: 1 }}>
                        <div className="animate-scale" style={{ fontSize: isFirst ? 40 : 30, marginBottom: 6, animationDelay: `${i * 0.1}s` }}>{MEDALS[i]}</div>
                        <div className="card" style={{
                          padding: isFirst ? '24px 12px' : '18px 10px',
                          borderColor: MEDAL_COLORS[i], borderWidth: 2,
                          background: isFirst ? `linear-gradient(135deg, rgba(255,215,0,0.06), var(--glass))` : 'var(--glass)',
                          boxShadow: isFirst ? `0 0 30px rgba(255,215,0,0.1)` : 'var(--shadow)'
                        }}>
                          <div style={{ width: isFirst ? 48 : 38, height: isFirst ? 48 : 38, borderRadius: '50%', background: 'var(--red)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: isFirst ? 18 : 14, margin: '0 auto 8px' }}>
                            {row.users?.username?.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ fontWeight: 700, fontSize: isFirst ? 15 : 13, fontFamily: 'Rajdhani' }}>{row.users?.username}</div>
                          <div style={{ fontFamily: 'Rajdhani', fontSize: isFirst ? 28 : 22, fontWeight: 900, color: MEDAL_COLORS[i], marginTop: 4 }}>{row.score}%</div>
                          <span className={`badge ${LEVEL_CLASS[row.level] || ''}`} style={{ marginTop: 6 }}>{row.level}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {data.slice(3).map((row, i) => (
                <div key={row.user_id} className="card animate-fade" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14, animationDelay: `${(i + 1) * 0.05}s` }}>
                  <div className="animate-scale" style={{ fontFamily: 'Rajdhani', fontSize: 22, fontWeight: 800, color: 'var(--muted)', width: 36, textAlign: 'center', animationDelay: `${(i + 2) * 0.1}s` }}>#{i + 4}</div>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(59,130,246,0.15)', color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>
                    {row.users?.username?.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, fontFamily: 'Rajdhani' }}>{row.users?.username}</div>
                    <span className={`badge ${LEVEL_CLASS[row.level] || ''}`}>{row.level}</span>
                  </div>
                  <div style={{ fontFamily: 'Rajdhani', fontSize: 24, fontWeight: 800 }}>{row.score}%</div>
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
