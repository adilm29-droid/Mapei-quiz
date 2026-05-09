import {
  GLOBAL_CATALOG,
  PER_QUIZ_CATALOG,
  globalId,
  perQuizId,
  type Threshold,
} from './catalog'

/**
 * Pure achievement evaluator. No I/O.
 *
 * Takes a snapshot of the user's stats + the just-finished attempt
 * (leaderboard or practice) and returns the IDs of every achievement
 * the user now qualifies for. The caller filters out already-unlocked
 * IDs and writes the new ones.
 */

export interface AchievementFacts {
  /** True if the just-finished attempt was the leaderboard attempt for the quiz. */
  isLeaderboardAttempt: boolean
  /** Quiz the attempt belongs to. */
  quizId: string
  /** Attempt's percent score (0–100). Only meaningful when isLeaderboardAttempt. */
  scorePercent: number | null

  /** Lifetime stats AFTER this attempt is applied: */
  distinctLeaderboardQuizzes: number   // count of distinct quizzes with completed leaderboard attempt
  goldCount: number                    // distinct quizzes with leaderboard score = 100
  silverOrBetterCount: number          // distinct quizzes with leaderboard score >= 90

  /** Practice stats AFTER this attempt is applied: */
  totalPracticeCount: number           // sum across all quizzes
  distinctPracticeDays: number         // distinct UAE dates with any practice activity
  practiceCountForQuiz: number         // practice count for THIS quiz only
}

export function evaluateAchievements(facts: AchievementFacts): string[] {
  const earned: string[] = []

  for (const entry of GLOBAL_CATALOG) {
    if (qualifies(entry.threshold, facts)) earned.push(globalId(entry.code))
  }
  for (const entry of PER_QUIZ_CATALOG) {
    if (qualifies(entry.threshold, facts)) earned.push(perQuizId(facts.quizId, entry.code))
  }

  return earned
}

function qualifies(t: Threshold, f: AchievementFacts): boolean {
  switch (t.type) {
    case 'first_completion':
      // Triggered when the user has at least one completed leaderboard attempt
      return f.isLeaderboardAttempt && f.distinctLeaderboardQuizzes >= 1
    case 'distinct_completions':
      return f.distinctLeaderboardQuizzes >= t.value
    case 'gold_count':
      return f.goldCount >= t.value
    case 'silver_or_better_count':
      return f.silverOrBetterCount >= t.value
    case 'distinct_practice_days':
      return f.distinctPracticeDays >= t.value
    case 'total_practice':
      return f.totalPracticeCount >= t.value
    case 'attempt_1_done':
      return f.isLeaderboardAttempt
    case 'score_pct':
      return f.isLeaderboardAttempt && (f.scorePercent ?? 0) >= t.value
    case 'practice_count':
      return f.practiceCountForQuiz >= t.value
  }
}
