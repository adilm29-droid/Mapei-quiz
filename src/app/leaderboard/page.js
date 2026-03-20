'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import { getAvatar, getRank } from '../../lib/helpers'

const MEDALS = ['🥇', '🥈', '🥉']
const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32']

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

export default function Leaderboard() {
  const [allTimeData, setAllTimeData] = useState([])
  const [weekData, setWeekData] = useState([])
  const [tab, setTab] = useState('week')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('user') || 'null')
    if (!u) { router.push('/'); return }
    setUser(u); loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const [{ data: users }, { data: allScores }] = await Promise.all([
      supabase.from('users').select('id, username, xp, rank, avatar').neq('role', 'admin'),
      supabase.from('scores').select('user_id, score, level, date')
    ])
    // All time - by XP
    const allTime = (users || []).sort((a, b) => (b.xp || 0) - (a.xp || 0)).slice(0, 10)
    setAllTimeData(allTime)

    // This week - by XP earned this week (scores this week)
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
    const weekScores = (allScores || []).filter(s => new Date(s.date) >= weekAgo)
    const weekMap = {}
    for (const s of weekScores) {
      if (!weekMap[s.user_id]) weekMap[s.user_id] = { quizzes: 0, bestScore: 0 }
      weekMap[s.user_id].quizzes++
      weekMap[s.user_id].bestScore = Math.max(weekMap[s.user_id].bestScore, s.score)
    }
    const weekList = (users || []).filter(u => weekMap[u.id]).map(u => ({
      ...u, weekQuizzes: weekMap[u.id].quizzes, weekBest: weekMap[u.id].bestScore
    })).sort((a, b) => b.weekBest - a.weekBest).slice(0, 10)
    setWeekData(weekList)
    setLoading(false)
  }

  const data = tab === 'week' ? weekData : allTimeData

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
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {[{ key: 'week', label: 'This Week' }, { key: 'all', label: 'All Time' }].map(t => (
              <button key={t.key} className={`tab ${tab === t.key ? 'tab-active' : 'tab-inactive'}`} style={{ flex: 1 }} onClick={() => setTab(t.key)}>{t.label}</button>
            ))}
          </div>

          {loading ? (
            <div className="loading-screen"><div className="spinner" /><span>Loading...</span></div>
          ) : data.length === 0 ? (
            <div className="card empty animate-fade"><div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div><div style={{ fontSize: 16, fontWeight: 600 }}>No data yet</div></div>
          ) : (
            <div>
              {/* Top 3 podium */}
              {data.length >= 3 && (
                <div className="animate-fade" style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 10, marginBottom: 24, paddingTop: 8 }}>
                  {[1, 0, 2].map(i => {
                    const row = data[i]; if (!row) return null; const isFirst = i === 0
                    const av = getAvatar(row.avatar); const rk = getRank(row.xp || 0)
                    return (
                      <div key={i} style={{ textAlign: 'center', flex: 1 }}>
                        <div className="animate-scale" style={{ fontSize: isFirst ? 36 : 26, marginBottom: 4, animationDelay: `${i * 0.1}s` }}>{MEDALS[i]}</div>
                        <div className="card" style={{ padding: isFirst ? '20px 10px' : '14px 8px', borderColor: MEDAL_COLORS[i], borderWidth: 2, boxShadow: isFirst ? `0 0 24px ${MEDAL_COLORS[0]}20` : 'var(--shadow)' }}>
                          <div style={{ width: isFirst ? 44 : 34, height: isFirst ? 44 : 34, borderRadius: '50%', background: av.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isFirst ? 22 : 16, margin: '0 auto 6px' }}>{av.emoji}</div>
                          <div style={{ fontWeight: 700, fontSize: isFirst ? 14 : 12, fontFamily: 'Rajdhani' }}>{row.username}</div>
                          <div style={{ fontSize: 10, color: rk.color, fontWeight: 600, marginTop: 2 }}>{rk.icon} {rk.name}</div>
                          <div style={{ fontFamily: 'Rajdhani', fontSize: isFirst ? 24 : 18, fontWeight: 900, color: MEDAL_COLORS[i], marginTop: 4 }}>{row.xp || 0} XP</div>
                          {row.id === user?.id && <div style={{ fontSize: 10, color: '#60a5fa', marginTop: 4 }}>You</div>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Rest */}
              {data.slice(3).map((row, i) => {
                const av = getAvatar(row.avatar); const rk = getRank(row.xp || 0)
                const isMe = row.id === user?.id
                return (
                  <div key={row.id} className="card animate-fade" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12, animationDelay: `${(i + 1) * 0.05}s`, borderColor: isMe ? 'rgba(96,165,250,0.3)' : undefined, background: isMe ? 'rgba(96,165,250,0.06)' : undefined }}>
                    <div style={{ fontFamily: 'Rajdhani', fontSize: 20, fontWeight: 800, color: 'var(--muted)', width: 30, textAlign: 'center' }}>#{i + 4}</div>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: av.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{av.emoji}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, fontFamily: 'Rajdhani' }}>{row.username} {isMe ? <span style={{ color: '#60a5fa', fontSize: 11 }}>(You)</span> : ''}</div>
                      <span style={{ fontSize: 10, color: rk.color, fontWeight: 600 }}>{rk.icon} {rk.name}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'Rajdhani', fontSize: 20, fontWeight: 800 }}>{row.xp || 0} XP</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <div className="app-footer">Made by Adil Mohamed&nbsp;&nbsp;|&nbsp;&nbsp;LapizBlue &copy; 2026</div>
        </div>
      </div>
    </div>
  )
}
