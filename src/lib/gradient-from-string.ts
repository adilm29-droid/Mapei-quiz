/**
 * Pick a deterministic gradient name from any string (typically a username).
 * Used by the placeholder avatar so a user's avatar color stays stable across
 * sessions, but every user gets a different color.
 */

const GRADIENTS = [
  'aurora',
  'sunset',
  'champion',
  'spring',
  'ember',
  'plasma',
] as const

export type AvatarGradient = (typeof GRADIENTS)[number]

export function gradientFromString(seed: string): AvatarGradient {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0
  }
  return GRADIENTS[h % GRADIENTS.length]
}

/** Pull initials from first/last name, falling back to the first 2 chars of username. */
export function initialsFor(opts: {
  first_name?: string | null
  last_name?: string | null
  username?: string | null
}): string {
  const f = (opts.first_name || '').trim()
  const l = (opts.last_name || '').trim()
  if (f && l) return (f[0] + l[0]).toUpperCase()
  if (f) return f.slice(0, 2).toUpperCase()
  if (l) return l.slice(0, 2).toUpperCase()
  const u = (opts.username || '').trim()
  return u.slice(0, 2).toUpperCase() || '??'
}
