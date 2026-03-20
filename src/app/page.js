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
      setError('Account created successfully! Please login.')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'var(--dark)' }}>
      {/* Logos */}
      <div className="animate-fade" style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 12 }}>
          <img src="/lapizblue-logo.png" alt="Lapiz Blue General Trading" style={{ height: 100, objectFit: 'contain', marginTop: 20 }} />
          <img src="/mapei-logo.png" alt="Mapei" style={{ height: 180, objectFit: 'contain', marginTop: -20 }} />
        </div>
        <div style={{ fontSize: 14, color: '#000000', fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase' }}>Staff Training Quiz</div>
      </div>

      <div className="card animate-fade-up" style={{ width: '100%', maxWidth: 420 }}>
        <h2 style={{ marginBottom: 24, fontSize: 24, fontFamily: 'Rajdhani', fontWeight: 700 }}>
          {mode === 'login' ? 'Sign In' : 'Create Account'}
        </h2>

        {error && (
          <div className="animate-scale" style={{
            background: error.includes('successfully') ? 'rgba(34,197,94,0.08)' : 'rgba(227,6,19,0.08)',
            border: `1px solid ${error.includes('successfully') ? 'var(--green)' : 'var(--red)'}`,
            borderRadius: 12, padding: '12px 16px', marginBottom: 16,
            color: error.includes('successfully') ? 'var(--green)' : 'var(--red)', fontSize: 14, fontWeight: 500
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
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
          {loading ? <><div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> Please wait...</> : (mode === 'login' ? 'Login' : 'Create Account')}
        </button>

        <button className="btn btn-secondary" style={{ marginTop: 12 }}
          onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}>
          {mode === 'login' ? 'Create New Account' : 'Back to Login'}
        </button>
      </div>

      <div style={{ marginTop: 32, textAlign: 'center', fontSize: 11, color: 'var(--muted)', letterSpacing: 1 }}>
        Made by Adil Mohamed
      </div>
    </div>
  )
}
