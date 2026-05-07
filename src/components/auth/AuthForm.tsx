'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowRight, Check, Eye, EyeOff } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Mode = 'login' | 'register'
type ToastKind = 'error' | 'success'

interface ToastMsg {
  message: string
  type: ToastKind
}

const inputClass = cn(
  'w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4',
  'text-[15px] font-medium text-white placeholder:text-white/35',
  'backdrop-blur-md outline-none transition-all',
  'focus:border-white/40 focus:bg-white/10 focus:ring-2 focus:ring-white/15',
)

const pwdInputClass = cn(inputClass, 'pr-12')

interface PasswordFieldProps {
  value: string
  onChange: (v: string) => void
  placeholder: string
  onEnter?: () => void
}

function PasswordField({ value, onChange, placeholder, onEnter }: PasswordFieldProps) {
  const [shown, setShown] = useState(false)
  return (
    <div className="relative">
      <input
        type={shown ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => onEnter && e.key === 'Enter' && onEnter()}
        className={pwdInputClass}
        autoComplete="current-password"
      />
      <button
        type="button"
        onClick={() => setShown(s => !s)}
        aria-label={shown ? 'Hide password' : 'Show password'}
        className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-white/35 transition-colors hover:bg-white/5 hover:text-white/85"
      >
        {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}

interface AuthFormProps {
  className?: string
  /** Called after successful login (before router push) — return false to skip default navigation. */
  onAuthSuccess?: (user: any) => boolean | void
}

export function AuthForm({ className, onAuthSuccess }: AuthFormProps) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [regSuccess, setRegSuccess] = useState(false)
  const [regEmail, setRegEmail] = useState('')
  const [toast, setToast] = useState<ToastMsg | null>(null)
  const [forgotMode, setForgotMode] = useState(false)
  const [forgotIdent, setForgotIdent] = useState('')
  const [forgotSent, setForgotSent] = useState(false)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  function showToast(message: string, type: ToastKind = 'error') {
    setToast({ message, type })
  }

  async function handleLogin() {
    if (!username || !password) {
      setLoginError('Please enter username and password')
      showToast('Please enter username and password')
      return
    }
    setLoginError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        const message = body?.error || 'Sign-in failed. Please try again.'
        setLoginError(message)
        showToast(message)
      } else {
        const user = body.user
        localStorage.setItem('user', JSON.stringify(user))
        const skipDefault = onAuthSuccess?.(user) === false
        if (!skipDefault) {
          if (user.role === 'admin') router.push('/admin')
          else if (!user.avatar || user.avatar === 0) router.push('/avatar')
          else router.push('/dashboard')
        }
      }
    } catch (e) {
      console.error('[auth] login network error:', e)
      setLoginError('Network error. Please try again.')
      showToast('Network error. Please try again.')
    }
    setLoading(false)
  }

  async function handleRegister() {
    if (!firstName || !lastName || !email || !username || !password || !confirmPassword) {
      showToast('Please fill in all fields')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast('Please enter a valid email address')
      return
    }
    if (password.length < 6) {
      showToast('Password must be at least 6 characters')
      return
    }
    if (password !== confirmPassword) {
      showToast('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, username, password }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        showToast(body?.error || 'Registration failed. Try again.')
      } else {
        setRegEmail(body?.email || email.trim().toLowerCase())
        setRegSuccess(true)
      }
    } catch (e) {
      console.error('[auth] register network error:', e)
      showToast('Network error. Please try again.')
    }
    setLoading(false)
  }

  function resetToLogin() {
    setRegSuccess(false)
    setMode('login')
    setUsername('')
    setPassword('')
    setFirstName('')
    setLastName('')
    setEmail('')
    setConfirmPassword('')
  }

  async function handleForgotSubmit() {
    const ident = forgotIdent.trim()
    if (!ident) {
      showToast('Please enter your username or email')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'password_reset_request',
          data: { identifier: ident },
        }),
      })
      if (res.ok) {
        setForgotSent(true)
      } else {
        const body = await res.json().catch(() => ({}))
        showToast(body?.error || 'Could not send reset request. Try again.')
      }
    } catch {
      showToast('Network error. Please try again.')
    }
    setLoading(false)
  }

  function exitForgot() {
    setForgotMode(false)
    setForgotIdent('')
    setForgotSent(false)
  }

  return (
    <div className={cn('relative w-full max-w-md', className)}>
      <AnimatePresence mode="wait">
        {forgotMode ? (
          <motion.div
            key="forgot"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3 }}
            className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur-2xl sm:p-10"
          >
            {forgotSent ? (
              <div className="text-center">
                <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full border border-emerald-300/40 bg-emerald-300/10">
                  <Check className="h-5 w-5 text-emerald-300" />
                </div>
                <h2 className="font-sans text-lg font-semibold tracking-wide text-white">
                  Reset Request Sent
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-white/55">
                  Tarun has been notified and will reach out to you with a new password.
                </p>
                <Button
                  onClick={exitForgot}
                  className="mt-7 h-12 w-full rounded-full bg-white text-[#040a1c] hover:bg-white/90"
                >
                  Back to Sign In
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-7 text-center">
                  <h1 className="font-sans text-[26px] font-semibold tracking-tight text-white">
                    Reset password
                  </h1>
                  <p className="mt-2 text-xs uppercase tracking-[0.35em] text-white/40">
                    Notify the admin
                  </p>
                </div>
                <p className="mb-5 text-[13px] leading-relaxed text-white/55">
                  Enter your username or email and we will let Tarun know to reset your
                  password. He will contact you with the new credentials.
                </p>
                <input
                  type="text"
                  placeholder="Username or email"
                  value={forgotIdent}
                  autoCapitalize="none"
                  autoCorrect="off"
                  onChange={e => setForgotIdent(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleForgotSubmit()}
                  className={inputClass}
                />
                <Button
                  onClick={handleForgotSubmit}
                  disabled={loading}
                  className="mt-5 h-12 w-full rounded-full bg-white text-[#040a1c] hover:bg-white/90 disabled:opacity-60"
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border border-[#040a1c]/30 border-t-[#040a1c]" />
                      Sending request
                    </span>
                  ) : (
                    'Send reset request'
                  )}
                </Button>
                <div className="my-6 h-px w-full bg-white/8" />
                <div className="text-center">
                  <button
                    onClick={exitForgot}
                    className="text-xs font-semibold uppercase tracking-[0.25em] text-white/70 transition-colors hover:text-white"
                  >
                    Back to sign in
                  </button>
                </div>
              </>
            )}
          </motion.div>
        ) : regSuccess ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35 }}
            className="rounded-3xl border border-white/10 bg-white/[0.04] p-10 text-center backdrop-blur-2xl"
          >
            <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full border border-emerald-300/40 bg-emerald-300/10">
              <Check className="h-5 w-5 text-emerald-300" />
            </div>
            <h2 className="font-sans text-lg font-semibold tracking-wide text-white">
              Request Submitted
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-white/55">
              You will receive an email at <span className="text-white">{regEmail}</span> once your
              account is approved.
            </p>
            <Button
              onClick={resetToLogin}
              className="mt-7 h-12 w-full rounded-full bg-white text-[#040a1c] hover:bg-white/90"
            >
              Back to Sign In
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3 }}
            className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur-2xl sm:p-10"
          >
            <div className="mb-7 text-center">
              <h1 className="font-sans text-[26px] font-semibold tracking-tight text-white">
                {mode === 'login' ? 'Sign in' : 'Create account'}
              </h1>
              <p className="mt-2 text-xs uppercase tracking-[0.35em] text-white/40">
                {mode === 'login' ? 'Welcome back' : 'Request access'}
              </p>
            </div>

            {mode === 'login' ? (
              <>
                <div className="flex flex-col gap-3.5">
                  <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    autoCapitalize="none"
                    autoCorrect="off"
                    onChange={e => setUsername(e.target.value)}
                    className={inputClass}
                  />
                  <PasswordField
                    placeholder="Password"
                    value={password}
                    onChange={setPassword}
                    onEnter={handleLogin}
                  />
                </div>

                {loginError && (
                  <div className="mt-4 rounded-xl border-l-2 border-red-400/70 bg-red-400/5 px-4 py-2.5 text-[13px] text-red-200/90">
                    {loginError}
                  </div>
                )}

                <Button
                  onClick={handleLogin}
                  disabled={loading}
                  className="mt-6 h-12 w-full rounded-full bg-white text-[#040a1c] hover:bg-white/90 disabled:opacity-60"
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border border-[#040a1c]/30 border-t-[#040a1c]" />
                      Signing in
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      Sign in <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>

                <div className="mt-5 text-center">
                  <button
                    onClick={() => {
                      setForgotMode(true)
                      setForgotIdent(username)
                      setToast(null)
                    }}
                    className="text-xs font-medium tracking-wide text-white/45 transition-colors hover:text-white/85"
                  >
                    Forgot password?
                  </button>
                </div>

                <div className="my-6 h-px w-full bg-white/8" />

                <div className="text-center">
                  <button
                    onClick={() => {
                      setMode('register')
                      setToast(null)
                    }}
                    className="text-xs font-semibold uppercase tracking-[0.25em] text-white/70 transition-colors hover:text-white"
                  >
                    Create new account
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-3">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="First name"
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      className={inputClass}
                    />
                    <input
                      type="text"
                      placeholder="Last name"
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className={inputClass}
                  />
                  <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    autoCapitalize="none"
                    autoCorrect="off"
                    onChange={e => setUsername(e.target.value)}
                    className={inputClass}
                  />
                  <PasswordField
                    placeholder="Password (min 6 chars)"
                    value={password}
                    onChange={setPassword}
                  />
                  <PasswordField
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    onEnter={handleRegister}
                  />
                </div>

                <Button
                  onClick={handleRegister}
                  disabled={loading}
                  className="mt-6 h-12 w-full rounded-full bg-white text-[#040a1c] hover:bg-white/90 disabled:opacity-60"
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border border-[#040a1c]/30 border-t-[#040a1c]" />
                      Submitting
                    </span>
                  ) : (
                    'Request access'
                  )}
                </Button>

                <div className="my-6 h-px w-full bg-white/8" />
                <div className="text-center">
                  <button
                    onClick={() => {
                      setMode('login')
                      setToast(null)
                    }}
                    className="text-xs font-semibold uppercase tracking-[0.25em] text-white/70 transition-colors hover:text-white"
                  >
                    Back to sign in
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
            className="fixed left-1/2 top-6 z-[100] -translate-x-1/2"
          >
            <div
              className={cn(
                'flex items-center gap-3 rounded-2xl border px-5 py-3 text-[13px] font-medium text-white backdrop-blur-xl',
                toast.type === 'success'
                  ? 'border-emerald-300/40 bg-emerald-500/15'
                  : 'border-red-400/40 bg-red-500/15',
              )}
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  toast.type === 'success' ? 'bg-emerald-300' : 'bg-red-300',
                )}
              />
              {toast.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
