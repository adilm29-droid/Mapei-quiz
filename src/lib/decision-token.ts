import crypto from 'node:crypto'

/**
 * Server-only HMAC sign/verify for one-click email approve/deny links.
 * Signing secret is the Supabase service-role key — already required on the
 * server, never exposed publicly, so we don't need a separate env var.
 */
function getSecret(): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) {
    throw new Error(
      'Server misconfigured: SUPABASE_SERVICE_ROLE_KEY is not set (needed for decision token signing)',
    )
  }
  return secret
}

export type DecisionAction = 'approve' | 'reject'

export function signDecision(userId: string, action: DecisionAction): string {
  return crypto
    .createHmac('sha256', getSecret())
    .update(`${userId}:${action}`)
    .digest('hex')
}

export function verifyDecision(
  userId: string,
  action: DecisionAction,
  signature: string,
): boolean {
  if (!userId || !action || !signature) return false
  const expected = signDecision(userId, action)
  // Constant-time compare to avoid timing attacks
  if (expected.length !== signature.length) return false
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(signature, 'hex'),
    )
  } catch {
    return false
  }
}

export function buildDecisionUrl(
  baseUrl: string,
  userId: string,
  action: DecisionAction,
): string {
  const sig = signDecision(userId, action)
  return `${baseUrl}/api/auth/decision?id=${encodeURIComponent(userId)}&action=${action}&sig=${sig}`
}
