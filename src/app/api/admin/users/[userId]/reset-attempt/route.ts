import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guard'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { revokeAchievementsAfterReset } from '@/lib/achievements/revoke'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/users/[userId]/reset-attempt
 * Body: { quizId: string, reason: string }
 *
 * Per CLAUDE_CODE_PROMPT.md §11. Resets the user's leaderboard attempt
 * for the given quiz so they can take it again as Attempt 1:
 *   - Soft-deletes the existing leaderboard attempt (deleted_at = now())
 *   - Decrements users.total_xp by attempts.xp_awarded (clamped to 0)
 *   - Decrements users.completed_quizzes_count (clamped to 0)
 *   - Revokes per-quiz score-tier achievements + recomputes globals
 *   - Records an admin_actions row with prev_score / prev_xp + reason
 *
 * The legacy `users.xp` column is also adjusted in lockstep so the home
 * UI (which still reads `xp`) stays consistent until that column is
 * fully retired in a later chunk.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  const guard = await requireAdmin()
  if (guard instanceof NextResponse) return guard
  const adminSession = guard

  const { userId } = await context.params
  let body: { quizId?: string; reason?: string }
  try {
    body = (await request.json()) as { quizId?: string; reason?: string }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const quizId = (body.quizId || '').trim()
  const reason = (body.reason || '').trim()
  if (!quizId) return NextResponse.json({ error: 'quizId is required' }, { status: 400 })
  if (!reason) return NextResponse.json({ error: 'reason is required' }, { status: 400 })

  const supabase = getSupabaseAdmin()

  // Find the user's leaderboard attempt for this quiz
  const { data: rawAttempt, error: aErr } = await supabase
    .from('attempts')
    .select('id, final_score, xp_awarded, is_leaderboard_attempt, deleted_at')
    .eq('user_id', userId)
    .eq('quiz_id', quizId)
    .eq('is_leaderboard_attempt', true)
    .is('deleted_at', null)
    .maybeSingle()
  if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 })
  const attempt = rawAttempt as any
  if (!attempt) {
    return NextResponse.json(
      { error: 'No active leaderboard attempt found for this user + quiz' },
      { status: 404 },
    )
  }

  const prevScore: number = attempt.final_score ?? 0
  const prevXp: number = attempt.xp_awarded ?? 0

  // 1. Soft-delete the attempt
  const { error: delErr } = await supabase
    .from('attempts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', attempt.id)
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

  // 2. Decrement user counters (xp + total_xp + completed_quizzes_count)
  const { data: rawUser, error: uErr } = await supabase
    .from('users')
    .select('xp, total_xp, completed_quizzes_count')
    .eq('id', userId)
    .maybeSingle()
  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 })
  const user = rawUser as any
  if (user) {
    const newXp = Math.max(0, (user.xp ?? 0) - prevXp)
    const newTotalXp = Math.max(0, (user.total_xp ?? 0) - prevXp)
    const newCount = Math.max(0, (user.completed_quizzes_count ?? 0) - 1)
    await supabase
      .from('users')
      .update({
        xp: newXp,
        total_xp: newTotalXp,
        completed_quizzes_count: newCount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
  }

  // 3. Revoke achievements that no longer qualify
  let revokedIds: string[] = []
  try {
    const r = await revokeAchievementsAfterReset(supabase, userId, quizId)
    revokedIds = r.revokedIds
  } catch (e) {
    console.error('[reset-attempt] revoke achievements:', e)
  }

  // 4. Audit row
  await supabase.from('admin_actions').insert({
    admin_user_id: adminSession.userId,
    affected_user_id: userId,
    action_type: 'attempt_reset',
    payload: {
      quiz_id: quizId,
      attempt_id: attempt.id,
      prev_score: prevScore,
      prev_xp: prevXp,
      revoked_achievement_ids: revokedIds,
    },
    reason,
  })

  return NextResponse.json({
    data: {
      attempt_id: attempt.id,
      prev_score: prevScore,
      prev_xp: prevXp,
      revoked_count: revokedIds.length,
    },
    error: null,
  })
}
