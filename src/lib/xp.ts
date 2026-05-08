/**
 * XP rules, level + title roll-up.
 * Per QUIZ_ARCHITECTURE.md §7. Single source of truth — every XP-awarding
 * code path goes through computeXpAward().
 */

const TITLE_TABLE: { minLevel: number; title: string }[] = [
  { minLevel: 50, title: 'Lapiz Legend ✦' },
  { minLevel: 35, title: 'Lapiz Legend' },
  { minLevel: 25, title: 'Lapiz Champion' },
  { minLevel: 18, title: 'Mapei Maestro' },
  { minLevel: 12, title: 'Sales Sensei' },
  { minLevel: 8,  title: 'Lead Specialist' },
  { minLevel: 5,  title: 'Showroom Specialist' },
  { minLevel: 3,  title: 'Product Scout' },
  { minLevel: 2,  title: 'Trainee' },
  { minLevel: 1,  title: 'Apprentice' },
]

const XP_PER_LEVEL = 1000

export function levelFromXp(xp: number): number {
  return Math.max(1, Math.floor(xp / XP_PER_LEVEL) + 1)
}

export function xpToNextLevel(xp: number): { current: number; needed: number; nextLevel: number } {
  const lvl = levelFromXp(xp)
  const into = xp - (lvl - 1) * XP_PER_LEVEL
  return { current: into, needed: XP_PER_LEVEL, nextLevel: lvl + 1 }
}

export function titleForLevel(level: number): string {
  for (const row of TITLE_TABLE) if (level >= row.minLevel) return row.title
  return 'Apprentice'
}

export interface XpInputs {
  oldXp: number
  correctCount: number
  totalQuestions: number
  /** Was this user the first to complete this quiz? +25 XP if so. */
  isFirstMover: boolean
  /** Did the streak update applied alongside this submission cross 7 / 30? */
  hitStreakMilestone: 7 | 30 | 100 | 365 | null
}

export interface XpBreakdown {
  base: number
  perCorrect: number
  perfectBonus: number
  firstMoverBonus: number
  streakBonus7: number
  streakBonus30: number
  delta: number
  oldXp: number
  newXp: number
  oldLevel: number
  newLevel: number
  leveledUp: boolean
  newTitle: string
}

/**
 * Pure function — given the user's prior XP and the just-finished attempt's
 * correctness count + flags, returns the full breakdown of the XP award.
 * Caller is responsible for persisting newXp / newLevel / newTitle to DB.
 */
export function computeXpAward(inputs: XpInputs): XpBreakdown {
  const base = 50
  const perCorrect = 5 * inputs.correctCount
  const perfectBonus =
    inputs.correctCount > 0 && inputs.correctCount === inputs.totalQuestions ? 100 : 0
  const firstMoverBonus = inputs.isFirstMover ? 25 : 0
  const streakBonus7 = inputs.hitStreakMilestone === 7 ? 50 : 0
  const streakBonus30 = inputs.hitStreakMilestone === 30 ? 200 : 0

  const delta = base + perCorrect + perfectBonus + firstMoverBonus + streakBonus7 + streakBonus30
  const oldLevel = levelFromXp(inputs.oldXp)
  const newXp = inputs.oldXp + delta
  const newLevel = levelFromXp(newXp)

  return {
    base,
    perCorrect,
    perfectBonus,
    firstMoverBonus,
    streakBonus7,
    streakBonus30,
    delta,
    oldXp: inputs.oldXp,
    newXp,
    oldLevel,
    newLevel,
    leveledUp: newLevel > oldLevel,
    newTitle: titleForLevel(newLevel),
  }
}
