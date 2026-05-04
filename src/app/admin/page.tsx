// @ts-nocheck
'use client'
import { LogoFull } from '@/components/brand/LogoFull'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

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

export default function Admin() {
  const [user, setUser] = useState(null)
  const [tab, setTab] = useState('approvals')
  const [pending, setPending] = useState([])
  const [reviewIndex, setReviewIndex] = useState(0)
  const [users, setUsers] = useState([])
  const [scores, setScores] = useState([])
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [totalAttempts, setTotalAttempts] = useState(0)
  const [scrapeUrl, setScrapeUrl] = useState('https://www.mapei.com/ae/en/products-and-solutions')
  const [scrapeStatus, setScrapeStatus] = useState('')
  const [newQ, setNewQ] = useState({ question: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'a', difficulty: 'Foundation', category: 'General Products', explanation: '' })
  const [assignTo, setAssignTo] = useState('')
  const [assignLevel, setAssignLevel] = useState('Foundation')
  const [assignDue, setAssignDue] = useState('')
  const [loading, setLoading] = useState(true)
  const [pendingUsers, setPendingUsers] = useState([])
  const [csvStatus, setCsvStatus] = useState('')
  const [csvCount, setCsvCount] = useState(0)
  const csvRef = useRef(null)
  const router = useRouter()

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('user') || 'null')
    if (!u || u.role !== 'admin') { router.push('/'); return }
    setUser(u); loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    const [{ data: p }, { data: u }, { data: s }, { count: qCount }, { count: aCount }, { data: pu }] = await Promise.all([
      supabase.from('questions').select('*').eq('approved', false).order('created_at', { ascending: false }),
      supabase.from('users').select('*').order('created_at', { ascending: false }),
      supabase.from('scores').select('*, users(username)').order('date', { ascending: false }).limit(50),
      supabase.from('questions').select('*', { count: 'exact', head: true }).eq('approved', true),
      supabase.from('scores').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*').eq('status', 'pending').order('created_at', { ascending: false })
    ])
    setPending(p || []); setUsers(u || []); setScores(s || [])
    setTotalQuestions(qCount || 0); setTotalAttempts(aCount || 0)
    setPendingUsers(pu || [])
    setReviewIndex(0); setLoading(false)
  }

  async function approveQ(id) { await supabase.from('questions').update({ approved: true }).eq('id', id); const u = pending.filter(q => q.id !== id); setPending(u); setTotalQuestions(t => t + 1); if (reviewIndex >= u.length) setReviewIndex(Math.max(0, u.length - 1)) }
  async function deleteQ(id) { await supabase.from('questions').delete().eq('id', id); const u = pending.filter(q => q.id !== id); setPending(u); if (reviewIndex >= u.length) setReviewIndex(Math.max(0, u.length - 1)) }
  async function approveAll() { const c = pending.length; await supabase.from('questions').update({ approved: true }).eq('approved', false); setPending([]); setTotalQuestions(t => t + c) }
  async function addManualQ() { if (!newQ.question) { alert('Please enter a question'); return }; await supabase.from('questions').insert([{ ...newQ, approved: true }]); setNewQ({ question: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'a', difficulty: 'Foundation', category: 'General Products', explanation: '' }); setTotalQuestions(t => t + 1); alert('Question added!') }
  async function scrapeAndGenerate() { setScrapeStatus('Generating questions...'); try { const res = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: scrapeUrl }) }); const data = await res.json(); setScrapeStatus(data.message || 'Done!'); loadAll() } catch (e) { setScrapeStatus('Error: ' + e.message) } }
  async function assignQuiz() { const { data: u } = await supabase.from('users').select('id').eq('username', assignTo).single(); if (!u) { alert('User not found'); return }; await supabase.from('assignments').insert([{ assigned_by: user?.id, assigned_to: u.id, quiz_level: assignLevel, due_date: assignDue || null, completed: false }]); alert(`Quiz assigned to ${assignTo}!`); setAssignTo('') }

  async function approveUser(u) {
    await supabase.from('users').update({ status: 'approved' }).eq('id', u.id)
    try { await fetch('/api/send-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'approved', data: { first_name: u.first_name, email: u.email, username: u.username } }) }) } catch (e) {}
    setPendingUsers(prev => prev.filter(p => p.id !== u.id))
    alert(`${u.first_name} ${u.last_name} approved! Welcome email sent.`)
  }

  async function handleCsvImport(e) {
    const file = e.target.files?.[0]; if (!file) return
    setCsvStatus('Parsing CSV...'); setCsvCount(0)
    const text = await file.text()
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length < 2) { setCsvStatus('Error: CSV file is empty or has no data rows'); return }
    const header = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''))
    const requiredCols = ['question', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer', 'difficulty', 'category']
    const missing = requiredCols.filter(c => !header.includes(c))
    if (missing.length > 0) { setCsvStatus(`Error: Missing columns: ${missing.join(', ')}`); return }
    const rows = []
    for (let i = 1; i < lines.length; i++) {
      const vals = []; let inQuote = false; let cur = ''
      for (const ch of lines[i]) {
        if (ch === '"') { inQuote = !inQuote } else if (ch === ',' && !inQuote) { vals.push(cur.trim()); cur = '' } else { cur += ch }
      }
      vals.push(cur.trim())
      if (vals.length < header.length) continue
      const obj = {}; header.forEach((h, idx) => { obj[h] = vals[idx]?.replace(/^"|"$/g, '') || '' })
      if (!obj.question) continue
      rows.push({
        question: obj.question, option_a: obj.option_a, option_b: obj.option_b,
        option_c: obj.option_c, option_d: obj.option_d,
        correct_answer: (obj.correct_answer || 'a').toLowerCase(),
        difficulty: obj.difficulty || 'Foundation', category: obj.category || 'General Products',
        explanation: obj.explanation || '', approved: true,
      })
    }
    if (rows.length === 0) { setCsvStatus('Error: No valid question rows found'); return }
    setCsvStatus(`Importing ${rows.length} questions...`)
    const batchSize = 50; let inserted = 0
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize)
      const { error } = await supabase.from('questions').insert(batch)
      if (error) { setCsvStatus(`Error at row ${i + 1}: ${error.message}`); return }
      inserted += batch.length; setCsvCount(inserted)
    }
    setCsvStatus(`Successfully imported ${inserted} questions!`)
    setCsvCount(inserted); setTotalQuestions(t => t + inserted)
    if (csvRef.current) csvRef.current.value = ''
  }

  async function rejectUser(u) {
    await supabase.from('users').delete().eq('id', u.id)
    setPendingUsers(prev => prev.filter(p => p.id !== u.id))
    alert(`${u.username} rejected and removed.`)
  }

  if (!user) return null
  if (loading) return (
    <div style={{ minHeight: '100dvh' }}>
      <Particles />
      <div className="navbar"><div style={{ fontFamily: 'Rajdhani', fontSize: 20, fontWeight: 700 }}>Admin Panel</div><div /></div>
      <div className="loading-screen"><div className="spinner" /><span>Loading admin dashboard...</span></div>
    </div>
  )

  const TABS = [
    { key: 'approvals', label: `Approvals (${pendingUsers.length})` },
    { key: 'pending', label: `Questions (${pending.length})` },
    { key: 'add', label: 'Add Question' },
    { key: 'scrape', label: 'AI Generate' },
    { key: 'users', label: 'Users' },
    { key: 'scores', label: 'Scores' },
    { key: 'assign', label: 'Assign' },
    { key: 'csv', label: 'CSV Import' },
  ]
  const currentQ = pending[reviewIndex]
  const avgScore = scores.length ? Math.round(scores.reduce((a, s) => a + s.score, 0) / scores.length) : 0

  return (
    <div style={{ minHeight: '100dvh', position: 'relative' }}>
      <Particles />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="navbar">
          <LogoFull markClassName="h-6 w-6" wordmarkClassName="h-4" />
          <div style={{ fontFamily: 'Rajdhani', fontSize: 18, fontWeight: 700 }}>Admin Panel</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{user.username}</span>
            <button className="btn btn-ghost btn-sm" style={{ width: 'auto' }} onClick={() => router.push('/reports')}>Reports</button>
            <button className="btn btn-ghost btn-sm" style={{ width: 'auto' }} onClick={() => router.push('/leaderboard')}>Leaderboard</button>
            <button className="btn btn-ghost btn-sm" style={{ width: 'auto' }} onClick={() => { localStorage.removeItem('user'); router.push('/') }}>Logout</button>
          </div>
        </div>

        <div className="page-wide">
          <div className="admin-stats animate-fade" style={{ marginTop: 16 }}>
            {[
              { icon: '👥', label: 'Total Users', value: users.filter(u => u.role !== 'admin').length, bg: 'rgba(59,130,246,0.12)' },
              { icon: '📝', label: 'Total Questions', value: totalQuestions, bg: 'rgba(34,197,94,0.12)' },
              { icon: '🎮', label: 'Quizzes Taken', value: totalAttempts, bg: 'rgba(245,158,11,0.12)' },
              { icon: '📊', label: 'Avg Score', value: `${avgScore}%`, bg: 'rgba(227,6,19,0.12)' },
              { icon: '⏳', label: 'Pending', value: pending.length, bg: 'rgba(139,92,246,0.12)' },
            ].map(s => (
              <div key={s.label} className="admin-stat-card">
                <div className="admin-stat-icon" style={{ background: s.bg }}>{s.icon}</div>
                <div>
                  <div style={{ fontFamily: 'Rajdhani', fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="tabs animate-fade stagger-1" style={{ marginBottom: 18 }}>
            {TABS.map(t => (<button key={t.key} className={`tab ${tab === t.key ? 'tab-active' : 'tab-inactive'}`} onClick={() => setTab(t.key)}>{t.label}</button>))}
          </div>

          {tab === 'approvals' && (
            <div className="animate-fade">
              {pendingUsers.length === 0 ? (
                <div className="card empty"><div style={{ fontSize: 48, marginBottom: 12 }}>✅</div><div style={{ fontSize: 16, fontWeight: 600 }}>No pending registrations</div><div style={{ color: 'var(--muted)', marginTop: 4 }}>All caught up!</div></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {pendingUsers.map(u => (
                    <div key={u.id} className="card" style={{ padding: 18 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{u.first_name} {u.last_name}</div>
                          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 2 }}>{u.email}</div>
                          <div style={{ fontSize: 12, color: 'var(--muted)' }}>@{u.username} &middot; {new Date(u.created_at).toLocaleDateString()}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn-sm" style={{ width: 'auto', background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' }} onClick={() => approveUser(u)}>Approve</button>
                          <button className="btn btn-sm" style={{ width: 'auto', background: 'rgba(227,6,19,0.15)', color: '#ff6b6b', border: '1px solid rgba(227,6,19,0.3)' }} onClick={() => rejectUser(u)}>Reject</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'pending' && (
            <div className="animate-fade">
              {pending.length === 0 ? (
                <div className="card empty"><div style={{ fontSize: 48, marginBottom: 12 }}>✅</div><div style={{ fontSize: 16, fontWeight: 600 }}>All caught up!</div><div style={{ color: 'var(--muted)', marginTop: 4 }}>No pending questions to review</div></div>
              ) : (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <span style={{ color: 'var(--muted)', fontSize: 14 }}>Question {reviewIndex + 1} of {pending.length}</span>
                    <button className="btn btn-sm" style={{ width: 'auto', background: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' }} onClick={approveAll}>Approve All</button>
                  </div>
                  <div className="progress-bar" style={{ marginBottom: 16 }}><div className="progress-fill" style={{ width: `${((reviewIndex + 1) / pending.length) * 100}%` }} /></div>
                  {currentQ && (
                    <div className="card">
                      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                        <span className={`badge ${LEVEL_CLASS[currentQ.difficulty] || ''}`}>{currentQ.difficulty}</span>
                        <span className="badge badge-blue">{currentQ.category}</span>
                      </div>
                      <div style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.6, marginBottom: 18 }}>{currentQ.question}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                        {['a','b','c','d'].map(k => (
                          <div key={k} style={{ padding: '12px 16px', borderRadius: 12, fontSize: 14, background: k === currentQ.correct_answer ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.03)', border: `1.5px solid ${k === currentQ.correct_answer ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.06)'}`, display: 'flex', gap: 12, alignItems: 'center' }}>
                            <span style={{ fontWeight: 700, color: k === currentQ.correct_answer ? '#4ade80' : 'var(--muted)', fontSize: 13, minWidth: 18 }}>{k.toUpperCase()}</span>
                            <span style={{ flex: 1 }}>{currentQ[`option_${k}`]}</span>
                            {k === currentQ.correct_answer && <span style={{ color: '#4ade80', fontWeight: 600, fontSize: 12 }}>CORRECT</span>}
                          </div>
                        ))}
                      </div>
                      {currentQ.explanation && <div className="explanation" style={{ marginBottom: 16 }}>{currentQ.explanation}</div>}
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => approveQ(currentQ.id)}>Approve</button>
                        <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => deleteQ(currentQ.id)}>Delete</button>
                      </div>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                    <button className="btn btn-ghost" disabled={reviewIndex === 0} onClick={() => setReviewIndex(i => i - 1)}>Previous</button>
                    <button className="btn btn-ghost" disabled={reviewIndex >= pending.length - 1} onClick={() => setReviewIndex(i => i + 1)}>Next</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'add' && (
            <div className="card animate-fade">
              <div style={{ fontFamily: 'Rajdhani', fontSize: 20, fontWeight: 700, marginBottom: 18 }}>Add New Question</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div><label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, display: 'block' }}>Question</label><textarea placeholder="Enter the question text..." value={newQ.question} onChange={e => setNewQ({ ...newQ, question: e.target.value })} rows={3} /></div>
                {['a','b','c','d'].map(k => (<input key={k} placeholder={`Option ${k.toUpperCase()}`} value={newQ[`option_${k}`]} onChange={e => setNewQ({ ...newQ, [`option_${k}`]: e.target.value })} />))}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <div><label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 6, display: 'block' }}>Answer</label><select value={newQ.correct_answer} onChange={e => setNewQ({ ...newQ, correct_answer: e.target.value })}><option value="a">A</option><option value="b">B</option><option value="c">C</option><option value="d">D</option></select></div>
                  <div><label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 6, display: 'block' }}>Difficulty</label><select value={newQ.difficulty} onChange={e => setNewQ({ ...newQ, difficulty: e.target.value })}><option>Foundation</option><option>Practitioner</option><option>Advanced</option><option>Expert</option></select></div>
                  <div><label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 6, display: 'block' }}>Category</label><select value={newQ.category} onChange={e => setNewQ({ ...newQ, category: e.target.value })}>{['Adhesives','Waterproofing','Flooring','Grouts and Mortars','Concrete Repair','General Products'].map(c => <option key={c}>{c}</option>)}</select></div>
                </div>
                <input placeholder="Explanation (optional)" value={newQ.explanation} onChange={e => setNewQ({ ...newQ, explanation: e.target.value })} />
                <button className="btn btn-primary" onClick={addManualQ}>Add Question</button>
              </div>
            </div>
          )}

          {tab === 'scrape' && (
            <div className="card animate-fade">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ fontSize: 28 }}>🤖</div>
                <div><div style={{ fontFamily: 'Rajdhani', fontSize: 20, fontWeight: 700 }}>AI Question Generator</div><div style={{ color: 'var(--muted)', fontSize: 13 }}>Scrape Mapei website and auto-generate questions</div></div>
              </div>
              <input value={scrapeUrl} onChange={e => setScrapeUrl(e.target.value)} style={{ marginBottom: 14 }} />
              <button className="btn btn-primary" style={{ marginBottom: 14 }} onClick={scrapeAndGenerate}>{scrapeStatus.includes('Generating') ? <><div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> Generating...</> : 'Generate Questions'}</button>
              {scrapeStatus && <div className="animate-fade" style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 16, fontSize: 14, border: '1px solid rgba(255,255,255,0.06)' }}>{scrapeStatus}</div>}
            </div>
          )}

          {tab === 'users' && (
            <div className="animate-fade">
              <div style={{ fontFamily: 'Rajdhani', fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Users ({users.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {users.map(u => (
                  <div key={u.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 38, height: 38, borderRadius: '50%', background: u.role === 'admin' ? 'rgba(227,6,19,0.15)' : 'rgba(59,130,246,0.15)', color: u.role === 'admin' ? '#ff6b6b' : '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15 }}>{u.username.charAt(0).toUpperCase()}</div>
                      <div><div style={{ fontWeight: 600, fontSize: 15 }}>{u.username}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>Joined {new Date(u.created_at).toLocaleDateString()}</div></div>
                    </div>
                    <span className={`badge ${u.role === 'admin' ? 'badge-red' : 'badge-blue'}`}>{u.role}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'scores' && (
            <div className="animate-fade">
              <div style={{ fontFamily: 'Rajdhani', fontSize: 20, fontWeight: 700, marginBottom: 16 }}>All Scores</div>
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-scroll">
                  <table><thead><tr><th>User</th><th>Score</th><th>Level</th><th>Date</th></tr></thead>
                    <tbody>{scores.map(s => (
                      <tr key={s.id}>
                        <td style={{ fontWeight: 500 }}>{s.users?.username}</td>
                        <td><span style={{ fontFamily: 'Rajdhani', fontWeight: 800, fontSize: 18, color: s.score >= 70 ? '#4ade80' : s.score >= 50 ? '#fbbf24' : '#ff6b6b' }}>{s.score}%</span></td>
                        <td><span className={`badge ${LEVEL_CLASS[s.level] || ''}`}>{s.level}</span></td>
                        <td style={{ color: 'var(--muted)', fontSize: 13 }}>{new Date(s.date).toLocaleDateString()}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tab === 'assign' && (
            <div className="card animate-fade">
              <div style={{ fontFamily: 'Rajdhani', fontSize: 20, fontWeight: 700, marginBottom: 18 }}>Assign Quiz</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div><label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, display: 'block' }}>Username</label><input placeholder="Enter username" value={assignTo} onChange={e => setAssignTo(e.target.value)} /></div>
                <div><label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, display: 'block' }}>Difficulty Level</label><select value={assignLevel} onChange={e => setAssignLevel(e.target.value)}><option>Foundation</option><option>Practitioner</option><option>Advanced</option><option>Expert</option></select></div>
                <div><label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, display: 'block' }}>Due Date</label><input type="date" value={assignDue} onChange={e => setAssignDue(e.target.value)} /></div>
                <button className="btn btn-primary" onClick={assignQuiz}>Assign Quiz</button>
              </div>
            </div>
          )}

          {tab === 'csv' && (
            <div className="card animate-fade">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ fontSize: 28 }}>📁</div>
                <div><div style={{ fontFamily: 'Rajdhani', fontSize: 20, fontWeight: 700 }}>Bulk CSV Import</div><div style={{ color: 'var(--muted)', fontSize: 13 }}>Upload a CSV file to import questions in bulk</div></div>
              </div>
              <div className="explanation" style={{ marginBottom: 16, fontSize: 12, lineHeight: 1.8 }}>
                <strong>Required CSV columns:</strong><br />
                question, option_a, option_b, option_c, option_d, correct_answer, difficulty, category, explanation
                <br /><strong>correct_answer:</strong> a, b, c, or d
                <br /><strong>difficulty:</strong> Foundation, Practitioner, Advanced, or Expert
              </div>
              <input ref={csvRef} type="file" accept=".csv" onChange={handleCsvImport}
                style={{ marginBottom: 14, background: 'rgba(0,0,0,0.3)', border: '1.5px solid rgba(255,255,255,0.08)', color: 'var(--text)', padding: '14px 16px', borderRadius: 12, width: '100%', fontSize: 14 }} />
              {csvStatus && (
                <div className="animate-fade" style={{ background: csvStatus.startsWith('Error') ? 'rgba(227,6,19,0.1)' : csvStatus.startsWith('Success') ? 'rgba(34,197,94,0.1)' : 'rgba(59,130,246,0.08)', border: `1px solid ${csvStatus.startsWith('Error') ? 'rgba(227,6,19,0.3)' : csvStatus.startsWith('Success') ? 'rgba(34,197,94,0.3)' : 'rgba(59,130,246,0.2)'}`, borderRadius: 12, padding: 16, fontSize: 14 }}>
                  <div style={{ fontWeight: 700, color: csvStatus.startsWith('Error') ? '#ff6b6b' : csvStatus.startsWith('Success') ? '#4ade80' : '#60a5fa', marginBottom: csvCount > 0 ? 6 : 0 }}>{csvStatus}</div>
                  {csvCount > 0 && <div style={{ color: 'var(--muted)', fontSize: 13 }}>{csvCount} questions imported</div>}
                </div>
              )}
            </div>
          )}

          <div className="app-footer">Made by Adil Mohamed&nbsp;&nbsp;|&nbsp;&nbsp;LapizBlue &copy; 2026</div>
        </div>
      </div>
    </div>
  )
}