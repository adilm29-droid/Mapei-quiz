import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

/**
 * Server-only session helpers.
 *
 * Sessions live in an HTTP-only signed JWT cookie named `lpz_session`.
 * The cookie payload is intentionally tiny: { userId, role } — anything
 * else (xp, name, etc.) is fetched from the DB by the routes that need it.
 */

const COOKIE_NAME = 'lpz_session'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days
const ALG = 'HS256' as const

export type SessionPayload = {
  userId: string
  role: 'admin' | 'staff'
}

function getSecret(): string {
  const s = process.env.SESSION_SECRET
  if (!s) {
    throw new Error(
      'Server misconfigured: SESSION_SECRET is not set. ' +
        'Add it to .env.local and to Vercel Project Settings → Environment Variables.',
    )
  }
  if (s.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters')
  }
  return s
}

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, getSecret(), {
    algorithm: ALG,
    expiresIn: COOKIE_MAX_AGE,
  })
}

export function verifySession(token: string): SessionPayload | null {
  try {
    const decoded = jwt.verify(token, getSecret(), { algorithms: [ALG] })
    if (typeof decoded !== 'object' || !decoded) return null
    const { userId, role } = decoded as any
    if (typeof userId !== 'string' || (role !== 'admin' && role !== 'staff')) return null
    return { userId, role }
  } catch {
    return null
  }
}

/** Read + verify the session cookie from the current request (App Router). */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifySession(token)
}

export const SESSION_COOKIE = {
  name: COOKIE_NAME,
  maxAge: COOKIE_MAX_AGE,
}

/** Build cookie options used in NextResponse.cookies.set() / .delete() */
export function sessionCookieOptions(secure: boolean) {
  return {
    name: COOKIE_NAME,
    httpOnly: true,
    secure,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  }
}
