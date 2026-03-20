'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function Admin() {
  const [user, setUser] = useState(null)
  const [tab, setTab] = useState('pending')
  const [pending, setPending] = useState([])
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
    const { data: p } = await supabase.from('questions').select('*').eq('approved', false).order('created_at', { ascending: false })
    const { data: u } = await supabase.from('users').select('*').order('created_at', { ascending: false })
    const { data: s } = await supabase.from('scores').select('*, users(username)').order('date', { ascending: false }).limit(50)
    setPending(p || [])
    setUsers(u || [])
    setScores(s || [])
  }

  async function approveQ(id) {
    await supabase.from('questions').update({ approved: true }).eq('id', id)
    loadAll()
  }

  async function deleteQ(id) {
    await supabase.from('questions').delete().eq('id', id)
    loadAll()
  }

  async function addManualQ() {
    await supabase.from('questions').insert([{ ...newQ, approved: true }])
    setNewQ({ question: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'a', difficulty: 'Beginner', category: 'General Products', explanation: '' })
    loadAll()
    alert('Question added!')
  }

  async function scrapeAndGenerate() {
    setScrapeStatus('Scraping Mapei website...')
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: scrapeUrl })
      })
      const data = await res.json()
      setScrapeStatus(data.message || 'Done!')
      loadAll()
    } catch (e) {
      setScrapeStatus('Error: ' + e.message)
    }
  }

  async function assignQuiz() {
    const { data: u } = await supabase.from('users').select('id').eq('username', assignTo).single()
    if (!u) { alert('User not found'); return }
    await supabase.from('assignments').insert([{ assigned_by: user.id, assigned_to: u.id, quiz_level: assignLevel, due_date: assignDue || null, completed: false }])
    alert(`Quiz assigned to ${assignTo}!`)
  }

  function logout() { localStorage.removeItem('user'); router.push('/') }

  if (!user) return null

  const TABS = ['pending', 'add', 'scrape', 'users', 'scores', 'assign']

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#E30613' }}>MAPEI Admin Panel</div>
          <div style={{ color: '#aaa', fontSize: 14 }}>Logged in as {user.username}</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-secondary" onClick={() => router.push('/leaderboard')}>Leaderboard</button>
          <button className="btn-secondary" onClick={logout}>Logout</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { key: 'pending', label: `⏳ Pending (${pending.length})` },
          { key: 'add', label: '➕ Add Question' },
          { key: 'scrape', label: '🤖 AI Generate' },
          { key: 'users', label: `👥 Users (${users.length})` },
          { key: 'scores', label: '📊 All Scores' },
          { key: 'assign', label: '📋 Assign Quiz' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14,
              background: tab === t.key ? '#E30613' : '#2a2a4a', color: 'white' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Pending Questions */}
      {tab === 'pending' && (
        <div>
          <h3 style={{ marginBottom: 16 }}>Pending Questions ({pending.length})</h3>
          {pending.length === 0 && <div className="card" style={{ color: '#aaa', textAlign: 'center' }}>No pending questions</div>}
          {pending.map(q => (
            <div key={q.id} className="card" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ background: '#E30613', borderRadius: 4, padding: '2px 8px', fontSize: 12 }}>{q.difficulty}</span>
                  <span style={{ background: '#2a2a4a', borderRadius: 4, padding: '2px 8px', fontSize: 12 }}>{q.category}</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-primary" style={{ padding: '4px 12px', fontSize: 13 }} onClick={() => approveQ(q.id)}>✅ Approve</button>
                  <button style={{ background: '#3a1a1a', border: '1px solid #E30613', color: '#ff8888', padding: '4px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }} onClick={() => deleteQ(q.id)}>🗑️ Delete</button>
                </div>
              </div>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>{q.question}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 14 }}>
                {['a', 'b', 'c', 'd'].map(k => (
                  <div key={k} style={{ background: k === q.correct_answer ? '#1a3a1a' : '#2a2a4a', padding: '6px 10px', borderRadius: 6, border: k === q.correct_answer ? '1px solid #4CAF50' : 'none' }}>
                    <strong style={{ color: '#E30613' }}>{k.toUpperCase()}.</strong> {q[`option_${k}`]}
                  </div>
                ))}
              </div>
              {q.explanation && <div style={{ marginTop: 8, color: '#aaa', fontSize: 13 }}>💡 {q.explanation}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Add Manual Question */}
      {tab === 'add' && (
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Add Question Manually</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <textarea value={newQ.question} onChange={e => setNewQ({ ...newQ, question: e.target.value })}
              placeholder="Question text" rows={3}
              style={{ background: '#2a2a4a', border: '1px solid #444', color: 'white', padding: '10px 14px', borderRadius: 8, fontSize: 15, resize: 'vertical' }} />
            {['a', 'b', 'c', 'd'].map(k => (
              <input key={k} placeholder={`Option ${k.toUpperCase()}`} value={newQ[`option_${k}`]}
                onChange={e => setNewQ({ ...newQ, [`option_${k}`]: e.target.value })} />
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <select value={newQ.correct_answer} onChange={e => setNewQ({ ...newQ, correct_answer: e.target.value })}>
                <option value="a">Correct: A</option><option value="b">Correct: B</option>
                <option value="c">Correct: C</option><option value="d">Correct: D</option>
              </select>
              <select value={newQ.difficulty} onChange={e => setNewQ({ ...newQ, difficulty: e.target.value })}>
                <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
              </select>
              <select value={newQ.category} onChange={e => setNewQ({ ...newQ, category: e.target.value })}>
                {['Adhesives', 'Waterproofing', 'Flooring', 'Grouts and Mortars', 'Concrete Repair', 'General Products'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <input placeholder="Explanation (optional)" value={newQ.explanation}
              onChange={e => setNewQ({ ...newQ, explanation: e.target.value })} />
            <button className="btn-primary" onClick={addManualQ}>Add Question</button>
          </div>
        </div>
      )}

      {/* AI Scrape & Generate */}
      {tab === 'scrape' && (
        <div className="card">
          <h3 style={{ marginBottom: 8 }}>🤖 AI Question Generator</h3>
          <p style={{ color: '#aaa', fontSize: 14, marginBottom: 16 }}>Scrapes the Mapei website and uses Gemini AI to generate questions for all levels and categories.</p>
          <input value={scrapeUrl} onChange={e => setScrapeUrl(e.target.value)} style={{ marginBottom: 12 }} placeholder="Mapei URL" />
          <button className="btn-primary" onClick={scrapeAndGenerate} style={{ marginBottom: 12 }}>Generate Questions with AI</button>
          {scrapeStatus && <div style={{ background: '#2a2a4a', borderRadius: 8, padding: '12px 16px', color: '#aaa', fontSize: 14 }}>{scrapeStatus}</div>}
          <p style={{ color: '#666', fontSize: 13, marginTop: 12 }}>Generated questions will appear in Pending for your review.</p>
        </div>
      )}

      {/* Users */}
      {tab === 'users' && (
        <div>
          <h3 style={{ marginBottom: 16 }}>All Users ({users.length})</h3>
          {users.map(u => (
            <div key={u.id} className="card" style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{u.username}</strong>
                <span style={{ marginLeft: 12, background: u.role === 'admin' ? '#E30613' : '#2a2a4a', borderRadius: 4, padding: '2px 8px', fontSize: 12 }}>{u.role}</span>
              </div>
              <div style={{ color: '#aaa', fontSize: 13 }}>{new Date(u.created_at).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      )}

      {/* All Scores */}
      {tab === 'scores' && (
        <div>
          <h3 style={{ marginBottom: 16 }}>All Scores</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #2a2a4a' }}>
                  {['User', 'Score', 'Level', 'Category', 'Questions', 'Date'].map(h => (
                    <th key={h} style={{ padding: '10px 8px', textAlign: 'left', color: '#aaa' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scores.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #1a1a2e' }}>
                    <td style={{ padding: '10px 8px' }}>{s.users?.username}</td>
                    <td style={{ padding: '10px 8px', color: s.score >= 70 ? '#4CAF50' : '#E30613', fontWeight: 700 }}>{s.score}%</td>
                    <td style={{ padding: '10px 8px' }}>{s.level}</td>
                    <td style={{ padding: '10px 8px' }}>{s.category}</td>
                    <td style={{ padding: '10px 8px' }}>{s.total_questions}</td>
                    <td style={{ padding: '10px 8px', color: '#aaa' }}>{new Date(s.date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assign Quiz */}
      {tab === 'assign' && (
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Assign Mandatory Quiz</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input placeholder="Username to assign to" value={assignTo} onChange={e => setAssignTo(e.target.value)} />
            <select value={assignLevel} onChange={e => setAssignLevel(e.target.value)}>
              <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
            </select>
            <input type="date" value={assignDue} onChange={e => setAssignDue(e.target.value)}
              style={{ colorScheme: 'dark' }} />
            <button className="btn-primary" onClick={assignQuiz}>Assign Quiz</button>
          </div>
        </div>
      )}
    </div>
  )
}
