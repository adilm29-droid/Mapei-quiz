import type { SupabaseClient } from '@supabase/supabase-js'
import { evaluateAchievements, type AchievementFacts } from './evaluate'
import { uaeDate } from '@/lib/uae-time'

/**
 * Grant any newly-earned achievements for the user. Idempotent — duplicate
 * inserts are silently ignored via the (user_id, achievement_id) PK.
 *
 * Returns the catalog rows for newly-unlocked achievements (for the
 * results screen / toast / completion email).
 */

export interface NewAchievement {
  id: string
  code: string
  scope: 'global' | 'per_quiz'
  name: string
  description: string
  icon: string
  tier_color: string
}

export async function gatherFacts(
  supabase: SupabaseClient,
  userId: string,
  quizId: string,
  opts: { isLeaderboardAttempt: boolean; scorePercent: number | null },
): Promise<AchievementFacts> {
  // Distinct quizzes the user has completed a leaderboard attempt on
  const { data: lbRows } = await supabase
    .from('attempts')
    .select('quiz_id, final_score, max_score: final_score')
    .eq('user_id', userId)
    .eq('is_leaderboard_attempt', true)
    .is('deleted_at', null)
    .eq('is_complete', true)

  // Distinct quizzes the user finished on the leaderboard
  const distinctQuizSet = new Set<string>((lbRows ?? []).map((r: any) => r.quiz_id))

  // Compute Gold (100%) and Silver-or-better (>=90%) counts.
  // Need each quiz's max_score. Pull in one shot.
  const quizIdList = Array.from(distinctQuizSet)
  const quizMax = new Map<string, number>()
  if (quizIdList.length > 0) {
    const { data: quizRows } = await supabase
      .from('quizzes')
      .select('id, max_score')
      .in('id', quizIdList)
    for (const q of quizRows ?? []) {
      quizMax.set(q.id, q.max_score ?? 0)
    }
  }

  let goldCount = 0
  let silverOrBetterCount = 0
  // For each user×quiz, take the LB attempt's percent (one per quiz).
  const bestByQuiz = new Map<string, number>()
  for (const a of lbRows ?? []) {
    const max = quizMax.get(a.quiz_id) ?? 0
    if (max <= 0) continue
    const pct = ((a.final_score ?? 0) / max) * 100
    const prev = bestByQuiz.get(a.quiz_id) ?? -1
    if (pct > prev) bestByQuiz.set(a.quiz_id, pct)
  }
  for (const pct of bestByQuiz.values()) {
    if (pct >= 100) goldCount += 1
    if (pct >= 90) silverOrBetterCount += 1
  }

  // Practice stats
  const { data: pcRows } = await supabase
    .from('practice_counters')
    .select('quiz_id, attempt_count, practice_dates')
    .eq('user_id', userId)

  let totalPracticeCount = 0
  const distinctDays = new Set<string>()
  let practiceCountForQuiz = 0
  for (const r of pcRows ?? []) {
    totalPracticeCount += r.attempt_count ?? 0
    if (r.quiz_id === quizId) practiceCountForQuiz = r.attempt_count ?? 0
    for (const d of (r.practice_dates ?? []) as string[]) distinctDays.add(d)
  }

  return {
    isLeaderboardAttempt: opts.isLeaderboardAttempt,
    quizId,
    scorePercent: opts.scorePercent,
    distinctLeaderboardQuizzes: distinctQuizSet.size,
    goldCount,
    silverOrBetterCount,
    totalPracticeCount,
    distinctPracticeDays: distinctDays.size,
    practiceCountForQuiz,
  }
}

export async function grantAchievements(
  supabase: SupabaseClient,
  userId: string,
  facts: AchievementFacts,
): Promise<NewAchievement[]> {
  const allEarnedIds = evaluateAchievements(facts)
  if (allEarnedIds.length === 0) return []

  // Filter: which of these does the user not yet have?
  const { data: alreadyHave } = await supabase
    .from('user_achievements')
    .select('achievement_id')
    .eq('user_id', userId)
    .in('achievement_id', allEarnedIds)
  const haveSet = new Set<string>((alreadyHave ?? []).map((r: any) => r.achievement_id))

  const newIds = allEarnedIds.filter(id => !haveSet.has(id))
  if (newIds.length === 0) return []

  // Insert. Conflict on (user_id, achievement_id) is silently ignored
  // (idempotent via the composite primary key).
  await supabase.from('user_achievements').insert(
    newIds.map(id => ({ user_id: userId, achievement_id: id, unlocked_at: new Date().toISOString() })),
  )

  // Return the full catalog rows for the results screen / email.
  const { data: catalogRows } = await supabase
    .from('achievements')
    .select('id, code, scope, name, description, icon, tier_color')
    .in('id', newIds)
  return (catalogRows ?? []) as NewAchievement[]
}

/**
 * Increment an "incrementable" achievement (currently only
 * `global:leaderboard_topper`). First grant inserts with unlock_count=1;
 * subsequent grants increment via ON CONFLICT.
 *
 * Returns the new unlock_count after the operation. Idempotent only
 * if called from a context that itself guarantees one-call-per-event
 * (e.g. the reveal-leaderboards cron only fires once per quiz reveal).
 */
export async function incrementAchievement(
  supabase: SupabaseClient,
  userId: string,
  achievementId: string,
): Promise<{ unlock_count: number; wasFirst: boolean }> {
  const { data: existing } = await supabase
    .from('user_achievements')
    .select('unlock_count')
    .eq('user_id', userId)
    .eq('achievement_id', achievementId)
    .maybeSingle()

  if (!existing) {
    await supabase.from('user_achievements').insert({
      user_id: userId,
      achievement_id: achievementId,
      unlocked_at: new Date().toISOString(),
      unlock_count: 1,
    })
    return { unlock_count: 1, wasFirst: true }
  }

  const nextCount = (existing.unlock_count ?? 1) + 1
  await supabase
    .from('user_achievements')
    .update({
      unlock_count: nextCount,
      unlocked_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('achievement_id', achievementId)
  return { unlock_count: nextCount, wasFirst: false }
}

/**
 * Update the `practice_counters` row for a practice attempt: bump the
 * attempt_count, append today's UAE date if not already in the array.
 */
export async function bumpPracticeCounter(
  supabase: SupabaseClient,
  userId: string,
  quizId: string,
): Promise<{ attempt_count: number; practice_dates: string[] }> {
  const today = uaeDate(new Date())
  const { data: existing } = await supabase
    .from('practice_counters')
    .select('attempt_count, practice_dates')
    .eq('user_id', userId)
    .eq('quiz_id', quizId)
    .maybeSingle()

  if (!existing) {
    const { data } = await supabase
      .from('practice_counters')
      .insert({
        user_id: userId,
        quiz_id: quizId,
        attempt_count: 1,
        practice_dates: [today],
        last_practiced_at: new Date().toISOString(),
      })
      .select('attempt_count, practice_dates')
      .maybeSingle()
    return data ?? { attempt_count: 1, practice_dates: [today] }
  }

  const dates = new Set<string>((existing.practice_dates ?? []) as string[])
  dates.add(today)
  const newDates = Array.from(dates).sort()
  const newCount = (existing.attempt_count ?? 0) + 1

  const { data } = await supabase
    .from('practice_counters')
    .update({
      attempt_count: newCount,
      practice_dates: newDates,
      last_practiced_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('quiz_id', quizId)
    .select('attempt_count, practice_dates')
    .maybeSingle()
  return data ?? { attempt_count: newCount, practice_dates: newDates }
}
