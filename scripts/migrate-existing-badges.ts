/**
 * One-off backfill per CLAUDE_CODE_PROMPT.md §6 (post-migration step 3).
 *
 * Loops every user who has at least one completed leaderboard attempt
 * (`is_leaderboard_attempt = true`, `deleted_at IS NULL`) and runs the
 * achievement evaluator against their current facts. Inserts any missing
 * `user_achievements` rows. Idempotent — `grantAchievements` skips
 * achievements the user already has.
 *
 * Run with:
 *   npx tsx scripts/migrate-existing-badges.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in env.
 *
 * Practice-count achievements use the user's most recently-touched
 * `practice_counters` quiz_id as the "current quiz" context — the per-
 * quiz Trainee/Practitioner/Master tiles still evaluate correctly
 * because the evaluator considers all of the user's practice rows.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { config as dotenvConfig } from 'dotenv'
import { gatherFacts, grantAchievements } from '../src/lib/achievements/grant'

dotenvConfig({ path: '.env.local' })
dotenvConfig()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env')
  process.exit(1)
}

const supabase: SupabaseClient = createClient(SUPABASE_URL, SERVICE_KEY)

async function backfillUser(userId: string) {
  // Walk every leaderboard attempt for this user. Compute scorePercent per
  // attempt and grant per-quiz + global tiers as appropriate.
  const { data: attempts } = await supabase
    .from('attempts')
    .select('quiz_id, final_score, max_score: final_score, is_complete')
    .eq('user_id', userId)
    .eq('is_leaderboard_attempt', true)
    .is('deleted_at', null)
    .eq('is_complete', true)

  if (!attempts || attempts.length === 0) {
    // Still consider practice-only users — they may qualify for daily-driver
    // / repeat-offender. Pick any practice_counters quiz_id as context.
    const { data: pc } = await supabase
      .from('practice_counters')
      .select('quiz_id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle()
    if (!pc) return { granted: 0 }
    const facts = await gatherFacts(supabase, userId, pc.quiz_id, {
      isLeaderboardAttempt: false,
      scorePercent: null,
    })
    const newly = await grantAchievements(supabase, userId, facts)
    return { granted: newly.length }
  }

  // Look up max_score per distinct quiz once
  const quizIds = Array.from(new Set(attempts.map(a => a.quiz_id)))
  const quizMaxes = new Map<string, number>()
  if (quizIds.length > 0) {
    const { data: quizRows } = await supabase
      .from('quizzes')
      .select('id, max_score')
      .in('id', quizIds)
    for (const q of quizRows ?? []) quizMaxes.set(q.id, q.max_score ?? 0)
  }

  let granted = 0
  for (const a of attempts) {
    const max = quizMaxes.get(a.quiz_id) ?? 0
    const pct = max > 0 ? ((a.final_score ?? 0) / max) * 100 : null
    const facts = await gatherFacts(supabase, userId, a.quiz_id, {
      isLeaderboardAttempt: true,
      scorePercent: pct,
    })
    const newly = await grantAchievements(supabase, userId, facts)
    granted += newly.length
  }
  return { granted }
}

async function main() {
  console.log('Backfilling achievements for all users with prior activity…')

  const { data: users } = await supabase
    .from('users')
    .select('id, username')
    .eq('status', 'approved')

  if (!users || users.length === 0) {
    console.log('No approved users found.')
    return
  }

  let totalGranted = 0
  for (const u of users) {
    try {
      const { granted } = await backfillUser(u.id)
      if (granted > 0) {
        console.log(`✓ @${u.username}: +${granted} achievement(s)`)
        totalGranted += granted
      }
    } catch (e) {
      console.error(`✗ @${u.username}: ${(e as Error).message}`)
    }
  }

  console.log(`\nDone. Granted ${totalGranted} new achievement row(s) across ${users.length} users.`)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
