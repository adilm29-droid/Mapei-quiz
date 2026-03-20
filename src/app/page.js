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
    if (!username || !password) { setError('Please enter username and password'); return }
    setLoading(true); setError('')
    const { data, error } = await supabase
      .from('users').select('*')
      .eq('username', username).eq('password', password).single()
    if (error || !data) {
      setError('Invalid username or password')
    } else {
      localStorage.setItem('user', JSON.stringify(data))
      router.push(data.role === 'admin' ? '/admin' : '/dashboard')
    }
    setLoading(false)
  }

  async function handleRegister() {
    if (!username || !password) { setError('Please fill in all fields'); return }
    if (password.length < 4) { setError('Password must be at least 4 characters'); return }
    setLoading(true); setError('')
    const { error } = await supabase.from('users').insert([{ username, password, role: 'user' }])
    if (error) {
      setError('Username already exists')
    } else {
      setMode('login')
      setError('✅ Account created! Please login.')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'var(--dark)' }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 52, fontWeight: 900, color: 'var(--red)', fontFamily: 'Rajdhani', letterSpacing: 4, lineHeight: 1 }}>MAPEI</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6, letterSpacing: 2, textTransform: 'uppercase' }}>Staff Training Quiz</div>
      </div>

      <div className="card" style={{ width: '100%', maxWidth: 400 }}>
        <h2 style={{ marginBottom: 20, fontSize: 22, fontFamily: 'Rajdhani' }}>
          {mode === 'login' ? 'Sign In' : 'Create Account'}
        </h2>

        {error && (
          <div style={{
            background: error.startsWith('✅') ? 'rgba(34,197,94,0.1)' : 'rgba(227,6,19,0.1)',
            border: `1px solid ${error.startsWith('✅') ? 'var(--green)' : 'var(--red)'}`,
            borderRadius: 10, padding: '10px 14px', marginBottom: 16,
            color: error.startsWith('✅') ? 'var(--green)' : '#ff8888', fontSize: 14
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
          <input
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
          />
          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (mode === 'login' ? handleLogin() : handleRegister())}
          />
        </div>

        <button className="btn btn-primary" onClick={mode === 'login' ? handleLogin : handleRegister} disabled={loading}>
          {loading ? '⏳ Please wait...' : (mode === 'login' ? 'Login' : 'Create Account')}
        </button>

        <button className="btn btn-secondary" style={{ marginTop: 10 }}
          onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}>
          {mode === 'login' ? '+ Create New Account' : '← Back to Login'}
        </button>

        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>
          Admin: admin / admin123
        </div>
      </div>
    </div>
  )
}
