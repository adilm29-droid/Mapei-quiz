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
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      background: 'linear-gradient(160deg, #0a1628 0%, #1a2f4e 50%, #0f1f38 100%)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Geometric pattern overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px),
          linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px, 60px 60px, 20px 20px, 20px 20px',
        animation: 'patternDrift 20s linear infinite',
        pointerEvents: 'none',
      }} />

      {/* Subtle glow behind logos */}
      <div style={{
        position: 'absolute',
        top: '15%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 400,
        height: 400,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(227,6,19,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Logos */}
      <div className="animate-fade" style={{ textAlign: 'center', marginBottom: 28, position: 'relative', zIndex: 1 }}>
        <img src="/lapizblue-logo.png" alt="Lapiz Blue General Trading"
          style={{ height: 90, objectFit: 'contain', filter: 'brightness(1.8) contrast(0.9)', marginBottom: 0 }} />

        {/* Divider line */}
        <div style={{ width: 60, height: 1, background: 'rgba(255,255,255,0.2)', margin: '10px auto' }} />

        <img src="/mapei-logo.png" alt="Mapei"
          style={{ height: 140, objectFit: 'contain', marginTop: 0 }} />
      </div>

      {/* Title */}
      <div className="animate-fade" style={{ textAlign: 'center', marginBottom: 8, position: 'relative', zIndex: 1 }}>
        <div style={{
          fontSize: 18,
          fontWeight: 800,
          color: '#ffffff',
          letterSpacing: 6,
          textTransform: 'uppercase',
          fontFamily: 'Rajdhani, sans-serif',
        }}>
          Staff Training Quiz
        </div>
        <div style={{
          fontSize: 13,
          color: 'rgba(255,255,255,0.5)',
          marginTop: 6,
          fontWeight: 400,
          letterSpacing: 1,
        }}>
          Mapei Product Knowledge Assessment
        </div>
      </div>

      {/* Stats chips */}
      <div className="animate-fade" style={{
        display: 'flex',
        gap: 10,
        marginTop: 20,
        marginBottom: 28,
        flexWrap: 'wrap',
        justifyContent: 'center',
        position: 'relative',
        zIndex: 1,
      }}>
        {['100+ Questions', '3 Levels', '6 Categories'].map(chip => (
          <div key={chip} style={{
            padding: '6px 16px',
            borderRadius: 20,
            border: '1px solid rgba(255,255,255,0.15)',
            color: 'rgba(255,255,255,0.75)',
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: 0.5,
            backdropFilter: 'blur(4px)',
            background: 'rgba(255,255,255,0.04)',
          }}>
            {chip}
          </div>
        ))}
      </div>

      {/* Login card - frosted glass */}
      <div className="animate-fade-up" style={{
        width: '100%',
        maxWidth: 400,
        background: 'rgba(255,255,255,0.07)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: 20,
        padding: 28,
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        position: 'relative',
        zIndex: 1,
      }}>
        <h2 style={{
          marginBottom: 22,
          fontSize: 22,
          fontFamily: 'Rajdhani',
          fontWeight: 700,
          color: '#ffffff',
          textAlign: 'center',
        }}>
          {mode === 'login' ? 'Sign In' : 'Create Account'}
        </h2>

        {error && (
          <div className="animate-scale" style={{
            background: error.includes('successfully') ? 'rgba(34,197,94,0.15)' : 'rgba(227,6,19,0.15)',
            border: `1px solid ${error.includes('successfully') ? 'rgba(34,197,94,0.4)' : 'rgba(227,6,19,0.4)'}`,
            borderRadius: 12, padding: '10px 14px', marginBottom: 16,
            color: error.includes('successfully') ? '#4ade80' : '#ff6b6b', fontSize: 13, fontWeight: 500,
            textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.35)', fontSize: 16, pointerEvents: 'none' }}>
              👤
            </div>
            <input
              placeholder="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              style={{
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#ffffff',
                padding: '14px 16px 14px 42px',
                borderRadius: 12,
                fontSize: 15,
                width: '100%',
              }}
            />
          </div>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.35)', fontSize: 16, pointerEvents: 'none' }}>
              🔒
            </div>
            <input
              placeholder="Password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (mode === 'login' ? handleLogin() : handleRegister())}
              style={{
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#ffffff',
                padding: '14px 16px 14px 42px',
                borderRadius: 12,
                fontSize: 15,
                width: '100%',
              }}
            />
          </div>
        </div>

        <button onClick={mode === 'login' ? handleLogin : handleRegister} disabled={loading}
          style={{
            width: '100%',
            padding: '14px 24px',
            borderRadius: 12,
            border: 'none',
            background: '#E30613',
            color: 'white',
            fontSize: 16,
            fontWeight: 700,
            fontFamily: 'Inter, sans-serif',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            transition: 'all 0.25s',
            boxShadow: '0 4px 20px rgba(227,6,19,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            minHeight: 52,
          }}>
          {loading ? <><div className="spinner" style={{ width: 20, height: 20, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} /> Please wait...</> : (mode === 'login' ? 'Login' : 'Create Account')}
        </button>

        {/* Toggle mode link */}
        <div style={{ textAlign: 'center', marginTop: 18 }}>
          <button
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.55)',
              fontSize: 14,
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.9)'}
            onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.55)'}
          >
            {mode === 'login' ? 'Create New Account' : '← Back to Login'}
          </button>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        marginTop: 40,
        textAlign: 'center',
        fontSize: 11,
        color: 'rgba(255,255,255,0.3)',
        letterSpacing: 0.5,
        position: 'relative',
        zIndex: 1,
      }}>
        Made by Adil Mohamed&nbsp;&nbsp;|&nbsp;&nbsp;LapizBlue &times; Mapei &copy; 2026
      </div>

      {/* CSS animation for pattern */}
      <style jsx>{`
        @keyframes patternDrift {
          0% { transform: translate(0, 0); }
          100% { transform: translate(60px, 60px); }
        }
        input::placeholder {
          color: rgba(255,255,255,0.3) !important;
        }
        input:focus {
          border-color: rgba(227,6,19,0.5) !important;
          box-shadow: 0 0 0 3px rgba(227,6,19,0.1) !important;
          outline: none !important;
        }
      `}</style>
    </div>
  )
}
