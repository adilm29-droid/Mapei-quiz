// @ts-nocheck
'use client'
import { LogoFull } from '@/components/brand/LogoFull'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import { getAvatar, getRank, CATEGORIES } from '../../lib/helpers'
import { LineChart, Line, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

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

const chartStyle = { fontSize: 11, fill: 'rgba(255,255,255,0.4)' }

export default function Reports() {
  const [user, setUser] = useState(null)
  const [scores, setScores] = useState([])
  const [attempts, setAttempts] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [allScores, setAllScores] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('user') || 'null')
    if (!u) { router.push('/'); return }
    setUser(u); loadData(u)
  }, [])

  async function loadData(u) {
    setLoading(true)
    if (u.role === 'admin') {
      const [{ data: users }, { data: sc }] = await Promise.all([
        supabase.from('users').select('*').order('xp', { ascending: false }),
        supabase.from('scores').select('*, users(username)').order('date', { ascending: false })
      ])
      setAllUsers(users || []); setAllScores(sc || [])
    } else {
      const [{ data: sc }, { data: att }] = await Promise.all([
        supabase.from('scores').select('*').eq('user_id', u.id).order('date', { ascending: true }),
        supabase.from('attempts').select('*').eq('user_id', u.id)
      ])
      setScores(sc || []); setAttempts(att || [])
    }
    setLoading(false)
  }

  async function exportPDF() {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF()
    const xp = user.xp || 0; const rank = getRank(xp); const av = getAvatar(user.avatar)
    const avg = scores.length ? Math.round(scores.reduce((a, s) => a + s.score, 0) / scores.length) : 0
    const best = scores.length ? Math.max(...scores.map(s => s.score)) : 0
    const passRate = scores.length ? Math.round(scores.filter(s => s.score >= 70).length / scores.length * 100) : 0

    doc.setFontSize(22); doc.setTextColor(227, 6, 19)
    doc.text('LapizBlue General Trading', 105, 20, { align: 'center' })
    doc.setFontSize(12); doc.setTextColor(100)
    doc.text('Sales Training Platform - Performance Report', 105, 30, { align: 'center' })
    doc.setDrawColor(227, 6, 19); doc.line(20, 35, 190, 35)

    doc.setFontSize(16); doc.setTextColor(0)
    doc.text(`${av.emoji} ${user.username}`, 20, 50)
    doc.setFontSize(11); doc.setTextColor(80)
    doc.text(`Rank: ${rank.name} | XP: ${xp} | Generated: ${new Date().toLocaleDateString()}`, 20, 58)

    doc.setFontSize(13); doc.setTextColor(0); doc.text('Performance Summary', 20, 75)
    doc.setFontSize(11); doc.setTextColor(60)
    doc.text(`Average Score: ${avg}%`, 20, 85)
    doc.text(`Best Score: ${best}%`, 20, 92)
    doc.text(`Pass Rate: ${passRate}%`, 20, 99)
    doc.text(`Total Quizzes: ${scores.length}`, 20, 106)
    doc.text(`Total XP: ${xp}`, 20, 113)

    if (scores.length > 0) {
      doc.setFontSize(13); doc.setTextColor(0); doc.text('Recent Scores', 20, 130)
      doc.setFontSize(10); doc.setTextColor(60)
      scores.slice(-10).forEach((s, i) => {
        doc.text(`${new Date(s.date).toLocaleDateString()} - ${s.level} - ${s.category || 'General'} - ${s.score}%`, 20, 140 + i * 7)
      })
    }

    doc.setFontSize(9); doc.setTextColor(150)
    doc.text('LapizBlue General Trading | Sales Training Platform', 105, 285, { align: 'center' })
    doc.save(`${user.username}_report.pdf`)
  }

  if (!user) return null

  if (loading) return (
    <div style={{ minHeight: '100dvh' }}>
      <Particles />
      <div className="navbar">
        <LogoFull markClassName="h-6 w-6" wordmarkClassName="h-4" />
        <div style={{ fontFamily: 'Rajdhani', fontSize: 18, fontWeight: 700 }}>Reports</div>
        <div style={{ width: 60 }} />
      </div>
      <div className="loading-screen"><div className="spinner" /><span>Loading reports...</span></div>
    </div>
  )

  const isAdmin = user.role === 'admin'

  // ── ADMIN VIEW ──
  if (isAdmin) {
    const staff = allUsers.filter(u => u.role !== 'admin')
    const activeUsers = staff.filter(u => allScores.some(s => s.user_id === u.id))
    const companyAvg = allScores.length ? Math.round(allScores.reduce((a, s) => a + s.score, 0) / allScores.length) : 0
    const passRate = allScores.length ? Math.round(allScores.filter(s => s.score >= 70).length / allScores.length * 100) : 0

    return (
      <div style={{ minHeight: '100dvh', position: 'relative' }}>
        <Particles />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="navbar">
            <LogoFull markClassName="h-6 w-6" wordmarkClassName="h-4" />
            <div style={{ fontFamily: 'Rajdhani', fontSize: 18, fontWeight: 700 }}>Company Reports</div>
            <button className="btn btn-ghost btn-sm" style={{ width: 'auto' }} onClick={() => router.push('/admin')}>Back</button>
          </div>
          <div className="page-wide">
            {/* Company stats */}
            <div className="admin-stats animate-fade" style={{ marginTop: 16 }}>
              {[
                { icon: '👥', label: 'Total Staff', value: staff.length, bg: 'rgba(59,130,246,0.12)' },
                { icon: '✅', label: 'Active Users', value: activeUsers.length, bg: 'rgba(34,197,94,0.12)' },
                { icon: '📊', label: 'Company Avg', value: `${companyAvg}%`, bg: 'rgba(245,158,11,0.12)' },
                { icon: '🎯', label: 'Pass Rate', value: `${passRate}%`, bg: 'rgba(227,6,19,0.12)' },
              ].map(s => (
                <div key={s.label} className="admin-stat-card">
                  <div className="admin-stat-icon" style={{ background: s.bg }}>{s.icon}</div>
                  <div><div style={{ fontFamily: 'Rajdhani', fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{s.value}</div><div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{s.label}</div></div>
                </div>
              ))}
            </div>

            {/* Staff table */}
            <div className="card animate-fade stagger-1" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', fontFamily: 'Rajdhani', fontSize: 18, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Staff Performance</div>
              <div className="table-scroll">
                <table>
                  <thead><tr><th>User</th><th>Rank</th><th>XP</th><th>Avg Score</th><th>Quizzes</th><th>Status</th></tr></thead>
                  <tbody>
                    {staff.map(u => {
                      const uScores = allScores.filter(s => s.user_id === u.id)
                      const avg = uScores.length ? Math.round(uScores.reduce((a, s) => a + s.score, 0) / uScores.length) : 0
                      const av = getAvatar(u.avatar); const rk = getRank(u.xp || 0)
                      const statusColor = uScores.length === 0 ? 'rgba(255,255,255,0.1)' : avg >= 70 ? 'rgba(34,197,94,0.1)' : avg >= 50 ? 'rgba(245,158,11,0.1)' : 'rgba(227,6,19,0.1)'
                      return (
                        <tr key={u.id} style={{ background: statusColor }}>
                          <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: av.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{av.emoji}</div>
                            <span style={{ fontWeight: 600 }}>{u.username}</span>
                          </div></td>
                          <td><span style={{ fontSize: 11, color: rk.color, fontWeight: 600 }}>{rk.icon} {rk.name}</span></td>
                          <td style={{ fontFamily: 'Rajdhani', fontWeight: 700 }}>{u.xp || 0}</td>
                          <td><span style={{ fontFamily: 'Rajdhani', fontWeight: 800, color: avg >= 70 ? '#4ade80' : avg >= 50 ? '#fbbf24' : '#ff6b6b' }}>{avg}%</span></td>
                          <td>{uScores.length}</td>
                          <td><span className={`badge ${uScores.length === 0 ? '' : avg >= 70 ? 'badge-green' : avg >= 50 ? 'badge-yellow' : 'badge-red'}`}>
                            {uScores.length === 0 ? 'Never' : avg >= 70 ? 'Strong' : avg >= 50 ? 'Average' : 'Needs Work'}
                          </span></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="app-footer">Made by Adil Mohamed&nbsp;&nbsp;|&nbsp;&nbsp;LapizBlue &copy; 2026</div>
          </div>
        </div>
      </div>
    )
  }

  // ── USER VIEW ──
  const xp = user.xp || 0
  const rank = getRank(xp)
  const avatar = getAvatar(user.avatar)
  const avg = scores.length ? Math.round(scores.reduce((a, s) => a + s.score, 0) / scores.length) : 0
  const best = scores.length ? Math.max(...scores.map(s => s.score)) : 0
  const passRate = scores.length ? Math.round(scores.filter(s => s.score >= 70).length / scores.length * 100) : 0

  // Score trend data
  const trendData = scores.slice(-15).map(s => ({
    date: new Date(s.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    score: s.score
  }))

  // Category radar data
  const cats = CATEGORIES.filter(c => c !== 'All')
  const radarData = cats.map(cat => {
    const catScores = scores.filter(s => s.category === cat)
    return { category: cat.split(' ')[0], score: catScores.length ? Math.round(catScores.reduce((a, s) => a + s.score, 0) / catScores.length) : 0 }
  })

  // Weekly XP (bar chart) - approximate from scores
  const weeklyData = []
  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - i * 7)
    const weekEnd = new Date(); weekEnd.setDate(weekEnd.getDate() - (i - 1) * 7)
    const weekScores = scores.filter(s => new Date(s.date) >= weekStart && new Date(s.date) < weekEnd)
    const weekXp = weekScores.reduce((a, s) => a + 10 + (s.score >= 90 ? 50 : s.score >= 70 ? 25 : 0), 0)
    weeklyData.push({ week: `W${8 - i}`, xp: weekXp })
  }

  // Strongest / Weakest
  const catAvgs = radarData.filter(r => r.score > 0).sort((a, b) => b.score - a.score)
  const strongest = catAvgs[0]
  const weakest = catAvgs[catAvgs.length - 1]

  return (
    <div style={{ minHeight: '100dvh', position: 'relative' }}>
      <Particles />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="navbar">
          <LogoFull markClassName="h-6 w-6" wordmarkClassName="h-4" />
          <div style={{ fontFamily: 'Rajdhani', fontSize: 18, fontWeight: 700 }}>My Reports</div>
          <button className="btn btn-ghost btn-sm" style={{ width: 'auto' }} onClick={() => router.push('/dashboard')}>Back</button>
        </div>
        <div className="page" style={{ maxWidth: 600 }}>
          {/* Top stats */}
          <div className="animate-fade" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
            {[
              { val: xp, label: 'Total XP', color: '#ff6b6b' },
              { val: `${avg}%`, label: 'Avg Score', color: '#60a5fa' },
              { val: `${best}%`, label: 'Best', color: '#4ade80' },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div style={{ fontFamily: 'Rajdhani', fontSize: 22, fontWeight: 800, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div className="animate-fade stagger-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
            <div className="stat-card">
              <div style={{ fontFamily: 'Rajdhani', fontSize: 22, fontWeight: 800, color: '#fbbf24' }}>{passRate}%</div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>Pass Rate</div>
            </div>
            <div className="stat-card">
              <div style={{ fontFamily: 'Rajdhani', fontSize: 22, fontWeight: 800, color: '#a78bfa' }}>{scores.length}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>Quizzes Done</div>
            </div>
          </div>

          {/* Score trend */}
          {trendData.length > 1 && (
            <div className="card animate-fade stagger-2" style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: 'Rajdhani', fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Your Score Journey</div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendData}>
                  <XAxis dataKey="date" tick={chartStyle} />
                  <YAxis domain={[0, 100]} tick={chartStyle} />
                  <Tooltip contentStyle={{ background: '#162640', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', fontSize: 12 }} />
                  <ReferenceLine y={70} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" label={{ value: 'Pass', fill: 'rgba(255,255,255,0.25)', fontSize: 10 }} />
                  <Line type="monotone" dataKey="score" stroke="#E30613" strokeWidth={2} dot={{ fill: '#E30613', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Category radar */}
          {radarData.some(r => r.score > 0) && (
            <div className="card animate-fade stagger-3" style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: 'Rajdhani', fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Category Mastery</div>
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.08)" />
                  <PolarAngleAxis dataKey="category" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} />
                  <Radar dataKey="score" stroke="#E30613" fill="#E30613" fillOpacity={0.15} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Weekly XP */}
          {weeklyData.some(w => w.xp > 0) && (
            <div className="card animate-fade stagger-4" style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: 'Rajdhani', fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Weekly XP Earned</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={weeklyData}>
                  <XAxis dataKey="week" tick={chartStyle} />
                  <YAxis tick={chartStyle} />
                  <Tooltip contentStyle={{ background: '#162640', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', fontSize: 12 }} />
                  <Bar dataKey="xp" fill="#E30613" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Strongest / Weakest */}
          {catAvgs.length >= 2 && (
            <div className="animate-fade stagger-5" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              <div className="card" style={{ textAlign: 'center', borderColor: 'rgba(34,197,94,0.3)' }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>🏆</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Strongest</div>
                <div style={{ fontFamily: 'Rajdhani', fontSize: 16, fontWeight: 700, color: '#4ade80', marginTop: 4 }}>{strongest.category}</div>
                <div style={{ fontFamily: 'Rajdhani', fontSize: 20, fontWeight: 800 }}>{strongest.score}%</div>
              </div>
              <div className="card" style={{ textAlign: 'center', borderColor: 'rgba(245,158,11,0.3)' }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>🎯</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Needs Work</div>
                <div style={{ fontFamily: 'Rajdhani', fontSize: 16, fontWeight: 700, color: '#fbbf24', marginTop: 4 }}>{weakest.category}</div>
                <div style={{ fontFamily: 'Rajdhani', fontSize: 20, fontWeight: 800 }}>{weakest.score}%</div>
              </div>
            </div>
          )}

          <button className="btn btn-primary animate-fade" onClick={exportPDF} style={{ marginBottom: 16 }}>
            Export My Report (PDF)
          </button>

          <div className="app-footer">Made by Adil Mohamed&nbsp;&nbsp;|&nbsp;&nbsp;LapizBlue &copy; 2026</div>
        </div>
      </div>
    </div>
  )
}