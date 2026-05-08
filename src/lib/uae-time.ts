/**
 * UAE time helpers. UAE is fixed UTC+4 (no DST). All "quiz day" / streak
 * comparisons run in UAE time so a user who submits at 23:30 local-UAE on
 * Monday and 00:30 local-UAE on Tuesday is correctly counted as two days.
 */

const UAE_OFFSET_MS = 4 * 60 * 60 * 1000

/** Today's UAE date as YYYY-MM-DD. */
export function uaeToday(): string {
  return uaeDate(new Date())
}

/** UAE date (YYYY-MM-DD) for a given Date or ISO timestamp. */
export function uaeDate(input: Date | string): string {
  const d = typeof input === 'string' ? new Date(input) : input
  return new Date(d.getTime() + UAE_OFFSET_MS).toISOString().slice(0, 10)
}

/** UAE hour (0-23) for a given timestamp. */
export function uaeHour(input: Date | string): number {
  const d = typeof input === 'string' ? new Date(input) : input
  return new Date(d.getTime() + UAE_OFFSET_MS).getUTCHours()
}

/** UAE day of week (0=Sunday … 6=Saturday). */
export function uaeDayOfWeek(input: Date | string): number {
  const d = typeof input === 'string' ? new Date(input) : input
  return new Date(d.getTime() + UAE_OFFSET_MS).getUTCDay()
}

/** Difference in whole days between two YYYY-MM-DD strings (b - a). */
export function dateDiffDays(a: string, b: string): number {
  return Math.round(
    (new Date(b + 'T00:00:00Z').getTime() - new Date(a + 'T00:00:00Z').getTime()) / 86400000,
  )
}

/** Add `n` days to a YYYY-MM-DD string (returns YYYY-MM-DD). */
export function addDays(date: string, n: number): string {
  const d = new Date(date + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
