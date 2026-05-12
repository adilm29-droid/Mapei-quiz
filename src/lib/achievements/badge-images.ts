/**
 * Maps achievement (scope, code) → public badge artwork path.
 *
 * The artwork lives under /public/badges/ and is referenced by URL.
 * When a code has no artwork the consumer falls back to the Lucide icon.
 */

export type AchievementScope = 'global' | 'per_quiz'

const PER_QUIZ_IMAGES: Record<string, string> = {
  bronze: '/badges/bronze.webp',
  silver: '/badges/silver.webp',
  gold: '/badges/gold.webp',
}

const GLOBAL_IMAGES: Record<string, string> = {
  leaderboard_topper: '/badges/leaderboard-topper.webp',
}

export function getBadgeImage(scope: AchievementScope, code: string): string | null {
  if (scope === 'per_quiz') return PER_QUIZ_IMAGES[code] ?? null
  if (scope === 'global') return GLOBAL_IMAGES[code] ?? null
  return null
}

export const LEADERBOARD_TOPPER_IMAGE = '/badges/leaderboard-topper.webp'
