'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RotateCcw, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

/**
 * Admin-only button + confirm modal for resetting a user's leaderboard
 * attempt on a quiz. Per CLAUDE_CODE_PROMPT.md §11: requires a non-empty
 * reason. Soft-deletes the attempt, decrements XP / count, revokes
 * stale achievements, writes an audit row.
 */
export function ResetAttemptButton({
  userId,
  quizId,
  isLeaderboard,
  alreadyDeleted,
}: {
  userId: string
  quizId: string
  isLeaderboard: boolean
  alreadyDeleted: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  if (!isLeaderboard || alreadyDeleted) return null

  async function submit() {
    if (reason.trim().length < 3) {
      toast.error('Please enter a reason (at least 3 characters)')
      return
    }
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-attempt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizId, reason: reason.trim() }),
      })
      const json = (await res.json()) as { data?: any; error?: string | null }
      if (!res.ok || json.error) {
        toast.error(json.error || 'Reset failed')
        setBusy(false)
        return
      }
      toast.success(
        `Attempt reset · -${json.data.prev_xp} XP · ${json.data.revoked_count} achievement(s) revoked`,
      )
      setOpen(false)
      setReason('')
      router.refresh()
    } catch (e: any) {
      toast.error(e?.message || 'Reset failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-caption font-semibold text-rose-200 hover:bg-rose-500/20"
      >
        <RotateCcw className="h-3.5 w-3.5" /> Reset attempt
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-midnight-line bg-midnight-elevated p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start gap-3">
              <div className="rounded-full bg-rose-500/15 p-2 ring-1 ring-rose-400/40">
                <AlertTriangle className="h-4 w-4 text-rose-300" />
              </div>
              <div>
                <h2 className="text-h3 font-semibold text-white">Reset leaderboard attempt</h2>
                <p className="mt-1 text-caption text-whitex-muted">
                  This soft-deletes the attempt, decrements the user&apos;s XP, and revokes any
                  score-tier achievements that no longer qualify. The audit log records your
                  reason. The user can take Attempt 1 again afterward.
                </p>
              </div>
            </div>

            <label className="mb-2 block text-micro uppercase tracking-[0.18em] text-whitex-faint">
              Reason
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. requested by user — connection dropped mid-quiz"
              rows={3}
              disabled={busy}
              className="w-full rounded-lg border border-midnight-line bg-midnight-base px-3 py-2 text-caption text-white placeholder:text-whitex-faint focus:border-aurora-from focus:outline-none"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={busy}
                className="rounded-lg border border-midnight-line bg-midnight-base px-4 py-2 text-caption text-whitex-soft hover:bg-midnight-line"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={busy}
                className="rounded-lg bg-rose-500 px-4 py-2 text-caption font-semibold text-white hover:bg-rose-600 disabled:opacity-50"
              >
                {busy ? 'Resetting…' : 'Confirm reset'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
