'use client'
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin() {
    setLoading(true); setError('')
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .single()
    if (error || !data) {
      setError('Invalid username or password')
    } else {
      localStorage.setItem('user', JSON.stringify(data))
      router.push(data.role === 'admin' ? '/admin' : '/dashboard')
    }
    setLoading(false)
  }

  async function handleRegister() {
    setLoading(true); setError('')
    const { error } = await supabase
      .from('users')
      .insert([{ username, password, role: 'user' }])
    if (error) {
      setError('Username already exists')
    } else {
      setMode('login')
      setError('Account created! Please login.')
    }
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="card" style={{ width: 380, textAlign: 'center' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 42, fontWeight: 900, color: '#E30613', letterSpacing: 2 }}>MAPEI</div>
          <div style={{ fontSize: 18, color: '#aaa', marginTop: 4 }}>Staff Training Quiz</div>
        </div>

        <h2 style={{ marginBottom: 20, fontSize: 22 }}>{mode === 'login' ? 'Login' : 'Register'}</h2>

        {error && (
          <div style={{ background: '#2a1a1a', border: '1px solid #E30613', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#ff8888', fontSize: 14 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
          <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (mode === 'login' ? handleLogin() : handleRegister())} />
        </div>

        <button className="btn-primary" style={{ width: '100%', marginBottom: 10 }}
          onClick={mode === 'login' ? handleLogin : handleRegister} disabled={loading}>
          {loading ? 'Please wait...' : (mode === 'login' ? 'Login' : 'Create Account')}
        </button>

        <button className="btn-secondary" style={{ width: '100%' }}
          onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}>
          {mode === 'login' ? 'Create New Account' : 'Back to Login'}
        </button>

        <div style={{ marginTop: 20, fontSize: 12, color: '#666' }}>
          Admin: admin / admin123
        </div>
      </div>
    </div>
  )
}
