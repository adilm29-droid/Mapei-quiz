/**
 * Achievement catalog — TS source of truth.
 * Mirrors supabase/migrations/005_quiz_features.sql §11–§12.
 *
 * Per CLAUDE_CODE_PROMPT.md §7. Two scopes:
 *   - global   — 7 fixed entries, lifetime stats across all quizzes
 *   - per_quiz — 7 entries auto-seeded for every actual quiz
 *
 * Threshold types (consumed by lib/achievements/evaluate.ts):
 *   first_completion           — user just completed their first leaderboard attempt
 *   distinct_completions       — number of distinct quizzes with leaderboard attempts
 *   gold_count                 — number of distinct quizzes scored 100% on
 *   silver_or_better_count     — number of distinct quizzes scored >= 90% on
 *   distinct_practice_days     — distinct dates with at least one practice attempt
 *   total_practice             — total practice attempts across all quizzes
 *   attempt_1_done             — leaderboard attempt completed for THIS quiz
 *   score_pct                  — leaderboard attempt percent >= value for THIS quiz
 *   practice_count             — practice count for THIS quiz >= value
 */

export type AchievementScope = 'global' | 'per_quiz'

export type AchievementTier =
  | 'slate' | 'bronze' | 'silver' | 'champion'
  | 'spring' | 'aurora' | 'plasma' | 'sunset' | 'ember'

export type Threshold =
  | { type: 'first_completion' }
  | { type: 'distinct_completions'; value: number }
  | { type: 'gold_count'; value: number }
  | { type: 'silver_or_better_count'; value: number }
  | { type: 'distinct_practice_days'; value: number }
  | { type: 'total_practice'; value: number }
  | { type: 'attempt_1_done' }
  | { type: 'score_pct'; value: number }
  | { type: 'practice_count'; value: number }

export interface CatalogEntry {
  code: string
  name: string
  description: string
  icon: string             // Lucide icon name
  tier: AchievementTier
  threshold: Threshold
  display_order: number
}

export const GLOBAL_CATALOG: readonly CatalogEntry[] = [
  { code: 'first_steps',     name: 'First Steps',     description: 'Complete your first quiz',                     icon: 'Footprints',    tier: 'spring',   threshold: { type: 'first_completion' },                  display_order: 10 },
  { code: 'quiz_explorer',   name: 'Quiz Explorer',   description: 'Complete Attempt 1 on 5 different quizzes',    icon: 'Compass',       tier: 'aurora',   threshold: { type: 'distinct_completions', value: 5 },    display_order: 20 },
  { code: 'quiz_veteran',    name: 'Quiz Veteran',    description: 'Complete Attempt 1 on 10 different quizzes',   icon: 'Medal',         tier: 'plasma',   threshold: { type: 'distinct_completions', value: 10 },   display_order: 30 },
  { code: 'perfectionist',   name: 'Perfectionist',   description: 'Score 100% on 3 different quizzes',            icon: 'Crown',         tier: 'champion', threshold: { type: 'gold_count', value: 3 },              display_order: 40 },
  { code: 'mapei_scholar',   name: 'Mapei Scholar',   description: 'Score >= 90% on 5 different quizzes',          icon: 'GraduationCap', tier: 'champion', threshold: { type: 'silver_or_better_count', value: 5 },  display_order: 50 },
  { code: 'daily_driver',    name: 'Daily Driver',    description: 'Practice on 7 different days',                 icon: 'CalendarCheck', tier: 'spring',   threshold: { type: 'distinct_practice_days', value: 7 },  display_order: 60 },
  { code: 'repeat_offender', name: 'Repeat Offender', description: '50 total practice attempts',                   icon: 'Repeat',        tier: 'ember',    threshold: { type: 'total_practice', value: 50 },         display_order: 70 },
]

/** Per-quiz template — code repeated for each quiz, ID is `<quiz_id>:<code>` */
export const PER_QUIZ_CATALOG: readonly CatalogEntry[] = [
  { code: 'completed',    name: 'Completed',    description: 'Finish Attempt 1',     icon: 'CheckCircle', tier: 'slate',    threshold: { type: 'attempt_1_done' },                display_order: 5 },
  { code: 'bronze',       name: 'Bronze',       description: 'Score 80% or higher',  icon: 'Award',       tier: 'bronze',   threshold: { type: 'score_pct', value: 80 },          display_order: 10 },
  { code: 'silver',       name: 'Silver',       description: 'Score 90% or higher',  icon: 'Award',       tier: 'silver',   threshold: { type: 'score_pct', value: 90 },          display_order: 20 },
  { code: 'gold',         name: 'Gold',         description: 'Perfect score (100%)', icon: 'Trophy',      tier: 'champion', threshold: { type: 'score_pct', value: 100 },         display_order: 30 },
  { code: 'trainee',      name: 'Trainee',      description: 'Practice 5 times',     icon: 'BookOpen',    tier: 'spring',   threshold: { type: 'practice_count', value: 5 },      display_order: 40 },
  { code: 'practitioner', name: 'Practitioner', description: 'Practice 15 times',    icon: 'BookOpen',    tier: 'aurora',   threshold: { type: 'practice_count', value: 15 },     display_order: 50 },
  { code: 'master',       name: 'Master',       description: 'Practice 30 times',    icon: 'BookMarked',  tier: 'plasma',   threshold: { type: 'practice_count', value: 30 },     display_order: 60 },
]

/** ID for a global achievement, e.g. "global:first_steps" */
export function globalId(code: string): string {
  return `global:${code}`
}

/** ID for a per-quiz achievement, e.g. "<quiz_id>:bronze" */
export function perQuizId(quizId: string, code: string): string {
  return `${quizId}:${code}`
}
