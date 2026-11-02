import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

/**
 * Server-only. The HR survey has no user accounts: staff enter name + email +
 * the shared 6-digit passcode at /survey, and get a short-lived signed cookie.
 * /api/survey/* reads the respondent from this cookie, never from the body.
 */

const COOKIE_NAME = 'hr_gate'
const MAX_AGE = 60 * 60 * 8 // 8 hours

export type HrRespondent = { name: string; email: string }

function secret(): string {
  const s = process.env.SESSION_SECRET
  if (!s || s.length < 32) throw new Error('Server misconfigured: SESSION_SECRET is not set')
  return s
}

export function signHrGate(r: HrRespondent): string {
  return jwt.sign({ ...r, kind: 'hr' }, secret(), { algorithm: 'HS256', expiresIn: MAX_AGE })
}

export async function getHrRespondent(): Promise<HrRespondent | null> {
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  if (!token) return null
  try {
    const d = jwt.verify(token, secret(), { algorithms: ['HS256'] }) as any
    if (d?.kind !== 'hr' || typeof d.name !== 'string' || typeof d.email !== 'string') return null
    return { name: d.name, email: d.email }
  } catch {
    return null
  }
}

export function hrGateCookieOptions(secure: boolean) {
  return { name: COOKIE_NAME, httpOnly: true, secure, sameSite: 'lax' as const, path: '/', maxAge: MAX_AGE }
}
