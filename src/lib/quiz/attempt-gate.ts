import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Single source of truth for "is this user about to take an Attempt 1
 * (the one that counts) or a practice attempt of an actual quiz?"
 *
 * Per CLAUDE_CODE_PROMPT.md §4 — every other piece of the codebase
 * (PDF generation, leaderboard, XP, badges, email, attempt history)
 * must consult this function. Do not duplicate the rule.
 *
 * Returns true if the user has NO existing leaderboard attempt for
 * this quiz (i.e. their next attempt will be the leaderboard one).
 */
export async function isLeaderboardAttempt(
  supabase: SupabaseClient,
  userId: string,
  quizId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('attempts')
    .select('id')
    .eq('user_id', userId)
    .eq('quiz_id', quizId)
    .eq('is_leaderboard_attempt', true)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    console.error('[attempt-gate] lookup error:', error)
    // Fail closed: if we can't tell, assume Attempt 1 already done so
    // we don't accidentally let someone re-take the counted attempt.
    return false
  }
  return !data
}

/**
 * Returns the user's existing leaderboard attempt for this quiz, or null
 * if they haven't taken Attempt 1 yet.
 */
export async function getLeaderboardAttempt(
  supabase: SupabaseClient,
  userId: string,
  quizId: string,
) {
  const { data } = await supabase
    .from('attempts')
    .select('*')
    .eq('user_id', userId)
    .eq('quiz_id', quizId)
    .eq('is_leaderboard_attempt', true)
    .is('deleted_at', null)
    .maybeSingle()
  return data ?? null
}
