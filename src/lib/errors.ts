/**
 * Typed errors per CLAUDE_CODE_PROMPT.md §5.6.
 *
 * Throw the right class from a route handler and let the catch-all
 * mapper return the appropriate HTTP status. Use `toErrorResponse(e)`
 * inside `catch` blocks to coerce any thrown value into the
 * `{ data: null, error: ... }` envelope spec'd in §5.4.
 */

import { NextResponse } from 'next/server'

export class AppError extends Error {
  readonly status: number
  readonly code: string
  constructor(message: string, code: string, status: number) {
    super(message)
    this.name = this.constructor.name
    this.code = code
    this.status = status
  }
}

export class AuthError extends AppError {
  constructor(message = 'Not authenticated') {
    super(message, 'auth_required', 401)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 'forbidden', 403)
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(message, 'not_found', 404)
  }
}

export class ValidationError extends AppError {
  readonly details?: unknown
  constructor(message = 'Invalid input', details?: unknown) {
    super(message, 'validation_failed', 400)
    this.details = details
  }
}

export class DomainError extends AppError {
  constructor(message: string, status = 409, code = 'domain_error') {
    super(message, code, status)
  }
}

/**
 * Coerce any thrown value into a JSON error response matching the
 * `{ data: null, error }` envelope. Unknown errors collapse to 500.
 */
export function toErrorResponse(err: unknown): NextResponse {
  if (err instanceof AppError) {
    const body: Record<string, unknown> = { code: err.code, message: err.message }
    if (err instanceof ValidationError && err.details !== undefined) {
      body.details = err.details
    }
    return NextResponse.json({ data: null, error: body }, { status: err.status })
  }
  const message = err instanceof Error ? err.message : 'Internal server error'
  return NextResponse.json(
    { data: null, error: { code: 'internal', message } },
    { status: 500 },
  )
}
