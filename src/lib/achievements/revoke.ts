import type { SupabaseClient } from '@supabase/supabase-js'
import { GLOBAL_CATALOG, perQuizId, globalId } from './catalog'
import { qualifies } from './evaluate'
import { gatherFacts } from './grant'

/**
 * Called after an admin resets a user's leaderboard attempt for a quiz.
 *
 * Behavior per CLAUDE_CODE_PROMPT.md §11:
 *   - Per-quiz score-tier achievements for the reset quiz (`completed`,
 *     `bronze`, `silver`, `gold`) are unconditionally revoked — without
 *     a leaderboard attempt for that quiz the user holds none of them.
 *   - Per-quiz practice-count achievements (`trainee`, `practitioner`,
 *     `master`) are NOT revoked — practice counters survive resets.
 *   - Global score-aggregate achievements (`first_steps`, `quiz_explorer`,
 *     `quiz_veteran`, `perfectionist`, `mapei_scholar`) are re-evaluated
 *     against the user's post-reset stats and revoked if no longer met.
 *   - Practice-aggregate globals (`daily_driver`, `repeat_offender`) are
 *     not at risk since practice state is untouched by the reset.
 */
export async function revokeAchievementsAfterReset(
  supabase: SupabaseClient,
  userId: string,
  quizId: string,
): Promise<{ revokedIds: string[] }> {
  const revoked: string[] = []

  // 1. Blanket-revoke per-quiz score-tier rows for this quiz
  const perQuizCodesAtRisk = ['completed', 'bronze', 'silver', 'gold']
  const perQuizIds = perQuizCodesAtRisk.map(c => perQuizId(quizId, c))
  const { data: deletedPerQuiz } = await supabase
    .from('user_achievements')
    .delete()
    .eq('user_id', userId)
    .in('achievement_id', perQuizIds)
    .select('achievement_id')
  for (const r of deletedPerQuiz ?? []) revoked.push((r as any).achievement_id)

  // 2. Re-evaluate at-risk globals against post-reset facts
  const facts = await gatherFacts(supabase, userId, quizId, {
    isLeaderboardAttempt: false,
    scorePercent: null,
  })

  const atRiskGlobals = ['first_steps', 'quiz_explorer', 'quiz_veteran', 'perfectionist', 'mapei_scholar']
  for (const code of atRiskGlobals) {
    const entry = GLOBAL_CATALOG.find(e => e.code === code)
    if (!entry) continue
    if (!qualifies(entry.threshold, facts)) {
      const id = globalId(code)
      const { data: del } = await supabase
        .from('user_achievements')
        .delete()
        .eq('user_id', userId)
        .eq('achievement_id', id)
        .select('achievement_id')
      if ((del ?? []).length > 0) revoked.push(id)
    }
  }

  return { revokedIds: revoked }
}
