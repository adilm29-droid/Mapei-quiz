'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Polls the server every 30s and re-fetches the page's server-component
 * data via `router.refresh()`. Per CLAUDE_CODE_PROMPT.md §12 — "Refresh
 * on page load + 30s poll. No Realtime in v1."
 *
 * TODO: realtime — swap to Supabase channel once we add a client.
 */
export function LeaderboardAutoRefresh({ intervalMs = 30_000 }: { intervalMs?: number }) {
  const router = useRouter()
  useEffect(() => {
    const id = setInterval(() => {
      router.refresh()
    }, intervalMs)
    return () => clearInterval(id)
  }, [router, intervalMs])
  return null
}
