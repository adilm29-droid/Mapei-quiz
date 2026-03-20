'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

const LEVEL_CLASS = { Beginner: 'level-beginner', Intermediate: 'level-intermediate', Advanced: 'level-advanced' }

export default function Admin() {
  const [user, setUser] = useState(null)
  const [tab, setTab] = useState('pending')
  const [pending, setPending] = useState([])
  const [reviewIndex, setReviewIndex] = useState(0)
  const [users, setUsers] = useState([])
  const [scores, setScores] = useState([])
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [totalAttempts, setTotalAttempts] = useState(0)
  const [scrapeUrl, setScrapeUrl] = useState('https://www.mapei.com/ae/en/products-and-solutions')
  const [scrapeStatus, setScrapeStatus] = useState('')
  const [newQ, setNewQ] = useState({ question: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'a', difficulty: 'Beginner', category: 'General Products', explanation: '' })
  const [assignTo, setAssignTo] = useState('')
  const [assignLevel, setAssignLevel] = useState('Beginner')
  const [assignDue, setAssignDue] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('user') || 'null')
    if (!u || u.role !== 'admin') { router.push('/'); return }
    setUser(u)
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    const [{ data: p }, { data: u }, { data: s }, { count: qCount }, { count: aCount }] = await Promise.all([
      supabase.from('questions').select('*').eq('approved', false).order('created_at', { ascending: false }),
      supabase.from('users').select('*').order('created_at', { ascending: false }),
      supabase.from('scores').select('*, users(username)').order('date', { ascending: false }).limit(50),
      supabase.from('questions').select('*', { count: 'exact', head: true }).eq('approved', true),
      supabase.from('scores').select('*', { count: 'exact', head: true })
    ])
    setPending(p || []); setUsers(u || []); setScores(s || [])
    setTotalQuestions(qCount || 0); setTotalAttempts(aCount || 0)
    setReviewIndex(0); setLoading(false)
  }

  async function approveQ(id) {
    await supabase.from('questions').update({ approved: true }).eq('id', id)
    const updated = pending.filter(q => q.id !== id)
    setPending(updated); setTotalQuestions(t => t + 1)
    if (reviewIndex >= updated.length) setReviewIndex(Math.max(0, updated.length - 1))
  }

  async function deleteQ(id) {
    await supabase.from('questions').delete().eq('id', id)
    const updated = pending.filter(q => q.id !== id)
    setPending(updated)
    if (reviewIndex >= updated.length) setReviewIndex(Math.max(0, updated.length - 1))
  }

  async function approveAll() {
    const count = pending.length
    await supabase.from('questions').update({ approved: true }).eq('approved', false)
    setPending([]); setTotalQuestions(t => t + count)
  }

  async function addManualQ() {
    if (!newQ.question) { alert('Please enter a question'); return }
    await supabase.from('questions').insert([{ ...newQ, approved: true }])
    setNewQ({ question: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'a', difficulty: 'Beginner', category: 'General Products', explanation: '' })
    setTotalQuestions(t => t + 1)
    alert('Question added!')
  }

  async function scrapeAndGenerate() {
    setScrapeStatus('Generating questions...')
    try {
      const res = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: scrapeUrl }) })
      const data = await res.json()
      setScrapeStatus(data.message || 'Done!')
      loadAll()
    } catch (e) { setScrapeStatus('Error: ' + e.message) }
  }

  async function assignQuiz() {
    const { data: u } = await supabase.from('users').select('id').eq('username', assignTo).single()
    if (!u) { alert('User not found'); return }
    await supabase.from('assignments').insert([{ assigned_by: user?.id, assigned_to: u.id, quiz_level: assignLevel, due_date: assignDue || null, completed: false }])
    alert(`Quiz assigned to ${assignTo}!`)
    setAssignTo('')
  }

  if (!user) return null

  if (loading) return (
    <div style={{ background: 'var(--dark)', minHeight: '100dvh' }}>
      <div className="navbar">
        <div style={{ fontFamily: 'Rajdhani', fontSize: 20, fontWeight: 700 }}>Admin Panel</div>
        <div />
      </div>
      <div className="loading-screen">
        <div className="spinner" />
        <span>Loading admin dashboard...</span>
      </div>
    </div>
  )

  const TABS = [
    { key: 'pending', label: `Pending (${pending.length})` },
    { key: 'add', label: 'Add Question' },
    { key: 'scrape', label: 'AI Generate' },
    { key: 'users', label: 'Users' },
    { key: 'scores', label: 'Scores' },
    { key: 'assign', label: 'Assign' },
  ]

  const currentQ = pending[reviewIndex]
  const avgScore = scores.length ? Math.round(scores.reduce((a, s) => a + s.score, 0) / scores.length) : 0

  return (
    <div style={{ background: 'var(--dark)', minHeight: '100dvh' }}>
      {/* Navbar */}
      <div className="navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/mapei-logo.png" alt="Mapei" style={{ height: 26 }} />
          <div>
            <div style={{ fontFamily: 'Rajdhani', fontSize: 18, fontWeight: 700 }}>Admin Panel</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>{user.username}</span>
          <button className="btn btn-ghost btn-sm" style={{ width: 'auto' }} onClick={() => router.push('/leaderboard')}>Leaderboard</button>
          <button className="btn btn-ghost btn-sm" style={{ width: 'auto' }} onClick={() => { localStorage.removeItem('user'); router.push('/') }}>Logout</button>
        </div>
      </div>

      <div className="page-wide">
        {/* Stats Dashboard */}
        <div className="admin-stats animate-fade" style={{ marginTop: 16 }}>
          {[
            { icon: '👥', label: 'Total Users', value: users.filter(u => u.role !== 'admin').length, color: 'rgba(59,130,246,0.1)', iconBg: 'rgba(59,130,246,0.15)' },
            { icon: '📝', label: 'Total Questions', value: totalQuestions, color: 'rgba(34,197,94,0.1)', iconBg: 'rgba(34,197,94,0.15)' },
            { icon: '🎮', label: 'Quizzes Taken', value: totalAttempts, color: 'rgba(245,158,11,0.1)', iconBg: 'rgba(245,158,11,0.15)' },
            { icon: '📊', label: 'Avg Score', value: `${avgScore}%`, color: 'rgba(227,6,19,0.1)', iconBg: 'rgba(227,6,19,0.15)' },
            { icon: '⏳', label: 'Pending Review', value: pending.length, color: 'rgba(139,92,246,0.1)', iconBg: 'rgba(139,92,246,0.15)' },
          ].map(s => (
            <div key={s.label} className="admin-stat-card">
              <div className="admin-stat-icon" style={{ background: s.iconBg }}>{s.icon}</div>
              <div>
                <div style={{ fontFamily: 'Rajdhani', fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="tabs animate-fade stagger-1" style={{ marginBottom: 18 }}>
          {TABS.map(t => (
            <button key={t.key} className={`tab ${tab === t.key ? 'tab-active' : 'tab-inactive'}`} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* PENDING - one by one review */}
        {tab === 'pending' && (
          <div className="animate-fade">
            {pending.length === 0 ? (
              <div className="card empty">
                <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>All caught up!</div>
                <div style={{ color: 'var(--muted)', marginTop: 4 }}>No pending questions to review</div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <span style={{ color: 'var(--muted)', fontSize: 14, fontWeight: 500 }}>Question {reviewIndex + 1} of {pending.length}</span>
                  <button className="btn btn-sm" style={{ width: 'auto', background: 'rgba(34,197,94,0.1)', color: 'var(--green)', border: '1px solid rgba(34,197,94,0.25)' }} onClick={approveAll}>
                    Approve All
                  </button>
                </div>

                <div className="progress-bar" style={{ marginBottom: 16 }}>
                  <div className="progress-fill" style={{ width: `${((reviewIndex + 1) / pending.length) * 100}%` }} />
                </div>

                {currentQ && (
                  <div className="card">
                    <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                      <span className={`badge ${LEVEL_CLASS[currentQ.difficulty]}`}>{currentQ.difficulty}</span>
                      <span className="badge badge-blue">{currentQ.category}</span>
                    </div>

                    <div style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.6, marginBottom: 18 }}>{currentQ.question}</div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                      {['a', 'b', 'c', 'd'].map(k => (
                        <div key={k} style={{
                          padding: '12px 16px', borderRadius: 12, fontSize: 14,
                          background: k === currentQ.correct_answer ? 'rgba(34,197,94,0.08)' : 'var(--card2)',
                          border: `1.5px solid ${k === currentQ.correct_answer ? 'var(--green)' : 'var(--border)'}`,
                          display: 'flex', gap: 12, alignItems: 'center'
                        }}>
                          <span style={{ fontWeight: 700, color: k === currentQ.correct_answer ? 'var(--green)' : 'var(--muted)', fontSize: 13, minWidth: 18 }}>{k.toUpperCase()}</span>
                          <span style={{ flex: 1 }}>{currentQ[`option_${k}`]}</span>
                          {k === currentQ.correct_answer && <span style={{ color: 'var(--green)', fontWeight: 600, fontSize: 12 }}>CORRECT</span>}
                        </div>
                      ))}
                    </div>

                    {currentQ.explanation && (
                      <div className="explanation" style={{ marginBottom: 16 }}>
                        {currentQ.explanation}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 10 }}>
                      <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => approveQ(currentQ.id)}>Approve</button>
                      <button className="btn btn-secondary" style={{ flex: 1, color: 'var(--red)', borderColor: 'var(--red)' }} onClick={() => deleteQ(currentQ.id)}>Delete</button>
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

        {/* ADD QUESTION */}
        {tab === 'add' && (
          <div className="card animate-fade">
            <div style={{ fontFamily: 'Rajdhani', fontSize: 20, fontWeight: 700, marginBottom: 18 }}>Add New Question</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, display: 'block' }}>Question</label>
                <textarea placeholder="Enter the question text..." value={newQ.question} onChange={e => setNewQ({ ...newQ, question: e.target.value })} rows={3} />
              </div>
              {['a', 'b', 'c', 'd'].map(k => (
                <input key={k} placeholder={`Option ${k.toUpperCase()}`} value={newQ[`option_${k}`]} onChange={e => setNewQ({ ...newQ, [`option_${k}`]: e.target.value })} />
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 6, display: 'block' }}>Answer</label>
                  <select value={newQ.correct_answer} onChange={e => setNewQ({ ...newQ, correct_answer: e.target.value })}>
                    <option value="a">A</option><option value="b">B</option><option value="c">C</option><option value="d">D</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 6, display: 'block' }}>Difficulty</label>
                  <select value={newQ.difficulty} onChange={e => setNewQ({ ...newQ, difficulty: e.target.value })}>
                    <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 6, display: 'block' }}>Category</label>
                  <select value={newQ.category} onChange={e => setNewQ({ ...newQ, category: e.target.value })}>
                    {['Adhesives', 'Waterproofing', 'Flooring', 'Grouts and Mortars', 'Concrete Repair', 'General Products'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <input placeholder="Explanation (optional)" value={newQ.explanation} onChange={e => setNewQ({ ...newQ, explanation: e.target.value })} />
              <button className="btn btn-primary" onClick={addManualQ}>Add Question</button>
            </div>
          </div>
        )}

        {/* AI GENERATE */}
        {tab === 'scrape' && (
          <div className="card animate-fade">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ fontSize: 28 }}>🤖</div>
              <div>
                <div style={{ fontFamily: 'Rajdhani', fontSize: 20, fontWeight: 700 }}>AI Question Generator</div>
                <div style={{ color: 'var(--muted)', fontSize: 13 }}>Scrape Mapei website and auto-generate questions</div>
              </div>
            </div>
            <input value={scrapeUrl} onChange={e => setScrapeUrl(e.target.value)} style={{ marginBottom: 14 }} />
            <button className="btn btn-primary" style={{ marginBottom: 14 }} onClick={scrapeAndGenerate}>
              {scrapeStatus.includes('Generating') ? <><div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> Generating...</> : 'Generate Questions'}
            </button>
            {scrapeStatus && (
              <div className="animate-fade" style={{ background: 'var(--card2)', borderRadius: 12, padding: 16, color: 'var(--text)', fontSize: 14, border: '1px solid var(--border)' }}>
                {scrapeStatus}
              </div>
            )}
          </div>
        )}

        {/* USERS */}
        {tab === 'users' && (
          <div className="animate-fade">
            <div style={{ fontFamily: 'Rajdhani', fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Users ({users.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {users.map(u => (
                <div key={u.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: u.role === 'admin' ? 'rgba(227,6,19,0.1)' : 'rgba(59,130,246,0.1)', color: u.role === 'admin' ? 'var(--red)' : 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15 }}>
                      {u.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{u.username}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>Joined {new Date(u.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <span className={`badge ${u.role === 'admin' ? 'badge-red' : 'badge-blue'}`}>{u.role}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SCORES */}
        {tab === 'scores' && (
          <div className="animate-fade">
            <div style={{ fontFamily: 'Rajdhani', fontSize: 20, fontWeight: 700, marginBottom: 16 }}>All Scores</div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr><th>User</th><th>Score</th><th>Level</th><th>Date</th></tr>
                  </thead>
                  <tbody>
                    {scores.map(s => (
                      <tr key={s.id}>
                        <td style={{ fontWeight: 500 }}>{s.users?.username}</td>
                        <td>
                          <span style={{ fontFamily: 'Rajdhani', fontWeight: 800, fontSize: 18, color: s.score >= 70 ? 'var(--green)' : s.score >= 50 ? 'var(--yellow)' : 'var(--red)' }}>
                            {s.score}%
                          </span>
                        </td>
                        <td><span className={`badge ${LEVEL_CLASS[s.level]}`}>{s.level}</span></td>
                        <td style={{ color: 'var(--muted)', fontSize: 13 }}>{new Date(s.date).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ASSIGN */}
        {tab === 'assign' && (
          <div className="card animate-fade">
            <div style={{ fontFamily: 'Rajdhani', fontSize: 20, fontWeight: 700, marginBottom: 18 }}>Assign Quiz</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, display: 'block' }}>Username</label>
                <input placeholder="Enter username" value={assignTo} onChange={e => setAssignTo(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, display: 'block' }}>Difficulty Level</label>
                <select value={assignLevel} onChange={e => setAssignLevel(e.target.value)}>
                  <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, display: 'block' }}>Due Date</label>
                <input type="date" value={assignDue} onChange={e => setAssignDue(e.target.value)} />
              </div>
              <button className="btn btn-primary" onClick={assignQuiz}>Assign Quiz</button>
            </div>
          </div>
        )}

        <div style={{ height: 24 }} />
      </div>
    </div>
  )
}
