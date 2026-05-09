/**
 * Format a UTC timestamp into the UAE-displayed string used in PDFs and emails.
 * UAE = UTC+4, no DST. Output: "08 May 2026 · 14:32 GST"
 */
export function formatUaeDateTime(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  const uae = new Date(d.getTime() + 4 * 60 * 60 * 1000)
  const day = uae.getUTCDate().toString().padStart(2, '0')
  const month = uae.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' })
  const year = uae.getUTCFullYear()
  const h = uae.getUTCHours().toString().padStart(2, '0')
  const m = uae.getUTCMinutes().toString().padStart(2, '0')
  return `${day} ${month} ${year} · ${h}:${m} GST`
}

/** Format a duration in seconds as MM:SS */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
