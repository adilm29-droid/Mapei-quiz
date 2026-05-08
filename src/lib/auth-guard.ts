import { NextResponse } from 'next/server'
import { getSession, type SessionPayload } from './session'

/**
 * Server-side auth guards used at the top of route handlers.
 *
 * Pattern:
 *   export async function POST(request: Request) {
 *     const guard = await requireAdmin()
 *     if (guard instanceof NextResponse) return guard
 *     const session = guard
 *     // ... use session.userId / session.role
 *   }
 *
 * If the guard fails it returns a NextResponse the caller forwards directly.
 * If it passes it returns the SessionPayload.
 */

export async function requireSession(): Promise<NextResponse | SessionPayload> {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }
  return session
}

export async function requireAdmin(): Promise<NextResponse | SessionPayload> {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }
  return session
}
