'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function Admin() {
  const [user, setUser] = useState(null)
  const [tab, setTab] = useState('pending')
  const [pending, setPending] = useState([])
  const [reviewIndex, setReviewIndex] = useState(0)
  const [users, setUsers] = useState([])
  const [scores, setScores] = useState([])
  const [scrapeUrl, setScrapeUrl] = useState('https://www.mapei.com/ae/en/products-and-solutions')
  const [scrapeStatus, setScrapeStatus] = useState('')
  const [newQ, setNewQ] = useState({ question: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'a', difficulty: 'Beginner', category: 'General Products', explanation: '' })
  const [assignTo, setAssignTo] = useState('')
  const [assignLevel, setAssignLevel] = useState('Beginner')
  const [assignDue, setAssignDue] = useState('')
  const router = useRouter()

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('user') || 'null')
    if (!u || u.role !== 'admin') { router.push('/'); return }
    setUser(u)
    loadAll()
  }, [])

  async function loadAll() {
    const [{ data: p }, { data: u }, { data: s }] = await Promise.all([
      supabase.from('questions').select('*').eq('approved', false).order('created_at', { ascending: false }),
      supabase.from('users').select('*').order('created_at', { ascending: false }),
      supabase.from('scores').select('*, users(username)').order('date', { ascending: false }).limit(50)
    ])
    setPending(p || []); setUsers(u || []); setScores(s || [])
    setReviewIndex(0)
  }

  async function approveQ(id) {
    await supabase.from('questions').update({ approved: true }).eq('id', id)
    const updated = pending.filter(q => q.id !== id)
    setPending(updated)
    if (reviewIndex >= updated.length) setReviewIndex(Math.max(0, updated.length - 1))
  }

  async function deleteQ(id) {
    await supabase.from('questions').delete().eq('id', id)
    const updated = pending.filter(q => q.id !== id)
    setPending(updated)
    if (reviewIndex >= updated.length) setReviewIndex(Math.max(0, updated.length - 1))
  }

  async function approveAll() {
    await supabase.from('questions').update({ approved: true }).eq('approved', false)
    setPending([])
  }

  async function addManualQ() {
    if (!newQ.question) { alert('Please enter a question'); return }
    await supabase.from('questions').insert([{ ...newQ, approved: true }])
    setNewQ({ question: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'a', difficulty: 'Beginner', category: 'General Products', explanation: '' })
    alert('✅ Question added!')
  }

  async function scrapeAndGenerate() {
    setScrapeStatus('🔄 Generating questions...')
    try {
      const res = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: scrapeUrl }) })
      const data = await res.json()
      setScrapeStatus(data.message || 'Done!')
      loadAll()
    } catch (e) { setScrapeStatus('❌ Error: ' + e.message) }
  }

  async function assignQuiz() {
    const { data: u } = await supabase.from('users').select('id').eq('username', assignTo).single()
    if (!u) { alert('User not found'); return }
    await supabase.from('assignments').insert([{ assigned_by: user?.id, assigned_to: u.id, quiz_level: assignLevel, due_date: assignDue || null, completed: false }])
    alert(`✅ Quiz assigned to ${assignTo}!`)
    setAssignTo('')
  }

  if (!user) return null

  const TABS = [
    { key: 'pending', label: `⏳ Pending (${pending.length})` },
    { key: 'add', label: '➕ Add' },
    { key: 'scrape', label: '🤖 AI' },
    { key: 'users', label: `👥 Users` },
    { key: 'scores', label: '📊 Scores' },
    { key: 'assign', label: '📋 Assign' },
  ]

  const currentQ = pending[reviewIndex]

  return (
    <div style={{ background: 'var(--dark)', minHeight: '100dvh' }}>
      {/* Navbar */}
      <div className="navbar">
        <div>
          <div style={{ fontFamily: 'Rajdhani', fontSize: 18, fontWeight: 700, color: 'var(--red)' }}>Admin Panel</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{user.username}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" style={{ width: 'auto' }} onClick={() => router.push('/leaderboard')}>Board</button>
          <button className="btn btn-secondary btn-sm" style={{ width: 'auto' }} onClick={() => { localStorage.removeItem('user'); router.push('/') }}>Out</button>
        </div>
      </div>

      <div className="page-wide">
        {/* Tabs */}
        <div className="tabs" style={{ marginBottom: 16, marginTop: 12 }}>
          {TABS.map(t => (
            <button key={t.key} className={`tab ${tab === t.key ? 'tab-active' : 'tab-inactive'}`} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* PENDING - one by one review */}
        {tab === 'pending' && (
          <div>
            {pending.length === 0 ? (
              <div className="empty">✅ No pending questions</div>
            ) : (
              <div>
                {/* Navigation */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <span style={{ color: 'var(--muted)', fontSize: 14 }}>Question {reviewIndex + 1} of {pending.length}</span>
                  <button className="btn btn-secondary btn-sm" style={{ width: 'auto', color: 'var(--green)', borderColor: 'var(--green)' }} onClick={approveAll}>
                    ✅ Approve All
                  </button>
                </div>

                {/* Progress */}
                <div className="progress-bar" style={{ marginBottom: 14 }}>
                  <div className="progress-fill" style={{ width: `${((reviewIndex + 1) / pending.length) * 100}%` }} />
                </div>

                {currentQ && (
                  <div className="card">
                    {/* Tags */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                      <span className="badge badge-red">{currentQ.difficulty}</span>
                      <span className="badge badge-blue">{currentQ.category}</span>
                    </div>

                    {/* Question */}
                    <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.5, marginBottom: 16 }}>{currentQ.question}</div>

                    {/* Options */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                      {['a', 'b', 'c', 'd'].map(k => (
                        <div key={k} style={{
                          padding: '10px 14px', borderRadius: 10, fontSize: 14,
                          background: k === currentQ.correct_answer ? 'rgba(34,197,94,0.1)' : 'var(--card2)',
                          border: `1px solid ${k === currentQ.correct_answer ? 'var(--green)' : 'var(--border)'}`,
                          display: 'flex', gap: 10, alignItems: 'center'
                        }}>
                          <span style={{ fontWeight: 700, color: k === currentQ.correct_answer ? 'var(--green)' : 'var(--muted)', fontSize: 13, minWidth: 16 }}>{k.toUpperCase()}</span>
                          {currentQ[`option_${k}`]}
                          {k === currentQ.correct_answer && <span style={{ marginLeft: 'auto', fontSize: 16 }}>✅</span>}
                        </div>
                      ))}
                    </div>

                    {/* Explanation */}
                    {currentQ.explanation && (
                      <div className="explanation" style={{ marginBottom: 14 }}>
                        💡 {currentQ.explanation}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => approveQ(currentQ.id)}>✅ Approve</button>
                      <button className="btn" style={{ flex: 1, background: 'rgba(227,6,19,0.15)', color: 'var(--red)', border: '1px solid var(--red)' }} onClick={() => deleteQ(currentQ.id)}>🗑️ Delete</button>
                    </div>
                  </div>
                )}

                {/* Prev/Next navigation */}
                <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                  <button className="btn btn-secondary" disabled={reviewIndex === 0} onClick={() => setReviewIndex(i => i - 1)}>← Prev</button>
                  <button className="btn btn-secondary" disabled={reviewIndex >= pending.length - 1} onClick={() => setReviewIndex(i => i + 1)}>Next →</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ADD QUESTION */}
        {tab === 'add' && (
          <div className="card">
            <div style={{ fontFamily: 'Rajdhani', fontSize: 18, fontWeight: 700, marginBottom: 14 }}>Add Question</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <textarea placeholder="Question text" value={newQ.question} onChange={e => setNewQ({ ...newQ, question: e.target.value })} rows={3} />
              {['a', 'b', 'c', 'd'].map(k => (
                <input key={k} placeholder={`Option ${k.toUpperCase()}`} value={newQ[`option_${k}`]} onChange={e => setNewQ({ ...newQ, [`option_${k}`]: e.target.value })} />
              ))}
              <select value={newQ.correct_answer} onChange={e => setNewQ({ ...newQ, correct_answer: e.target.value })}>
                <option value="a">Correct Answer: A</option>
                <option value="b">Correct Answer: B</option>
                <option value="c">Correct Answer: C</option>
                <option value="d">Correct Answer: D</option>
              </select>
              <select value={newQ.difficulty} onChange={e => setNewQ({ ...newQ, difficulty: e.target.value })}>
                <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
              </select>
              <select value={newQ.category} onChange={e => setNewQ({ ...newQ, category: e.target.value })}>
                {['Adhesives', 'Waterproofing', 'Flooring', 'Grouts and Mortars', 'Concrete Repair', 'General Products'].map(c => <option key={c}>{c}</option>)}
              </select>
              <input placeholder="Explanation (optional)" value={newQ.explanation} onChange={e => setNewQ({ ...newQ, explanation: e.target.value })} />
              <button className="btn btn-primary" onClick={addManualQ}>Add Question</button>
            </div>
          </div>
        )}

        {/* AI GENERATE */}
        {tab === 'scrape' && (
          <div className="card">
            <div style={{ fontFamily: 'Rajdhani', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>🤖 AI Generator</div>
            <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 14 }}>Scrape Mapei website and generate questions for all levels.</p>
            <input value={scrapeUrl} onChange={e => setScrapeUrl(e.target.value)} style={{ marginBottom: 12 }} />
            <button className="btn btn-primary" style={{ marginBottom: 12 }} onClick={scrapeAndGenerate}>Generate Questions</button>
            {scrapeStatus && <div style={{ background: 'var(--card2)', borderRadius: 8, padding: '12px', color: 'var(--muted)', fontSize: 14 }}>{scrapeStatus}</div>}
          </div>
        )}

        {/* USERS */}
        {tab === 'users' && (
          <div>
            <div style={{ fontFamily: 'Rajdhani', fontSize: 18, fontWeight: 700, marginBottom: 14 }}>Users ({users.length})</div>
            {users.map(u => (
              <div key={u.id} className="card" style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{u.username}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{new Date(u.created_at).toLocaleDateString()}</div>
                </div>
                <span className={`badge ${u.role === 'admin' ? 'badge-red' : 'badge-blue'}`}>{u.role}</span>
              </div>
            ))}
          </div>
        )}

        {/* SCORES */}
        {tab === 'scores' && (
          <div>
            <div style={{ fontFamily: 'Rajdhani', fontSize: 18, fontWeight: 700, marginBottom: 14 }}>All Scores</div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>User</th><th>Score</th><th>Level</th><th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {scores.map(s => (
                    <tr key={s.id}>
                      <td>{s.users?.username}</td>
                      <td style={{ color: s.score >= 70 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>{s.score}%</td>
                      <td><span className="badge badge-blue">{s.level}</span></td>
                      <td style={{ color: 'var(--muted)', fontSize: 12 }}>{new Date(s.date).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ASSIGN */}
        {tab === 'assign' && (
          <div className="card">
            <div style={{ fontFamily: 'Rajdhani', fontSize: 18, fontWeight: 700, marginBottom: 14 }}>Assign Quiz</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input placeholder="Username" value={assignTo} onChange={e => setAssignTo(e.target.value)} />
              <select value={assignLevel} onChange={e => setAssignLevel(e.target.value)}>
                <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
              </select>
              <input type="date" value={assignDue} onChange={e => setAssignDue(e.target.value)} style={{ colorScheme: 'dark' }} />
              <button className="btn btn-primary" onClick={assignQuiz}>Assign Quiz</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
