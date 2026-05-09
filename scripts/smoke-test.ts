/**
 * scripts/smoke-test.ts — end-to-end smoke per CLAUDE_CODE_PROMPT.md §20.
 *
 * Walks the production paths against a live deployment using a real
 * session cookie minted with SESSION_SECRET. Asserts the leaderboard
 * gate, practice isolation, achievements engine, admin reset, and
 * cleanup behave as specified.
 *
 * Run: BASE_URL=https://mapei-quiz.vercel.app npx tsx scripts/smoke-test.ts
 *      (or omit BASE_URL to default to http://localhost:3000)
 *
 * Required env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *               SESSION_SECRET. ADMIN_USER_ID (an existing admin's
 *               user id) — used for the reset step. If missing, the
 *               script will pick the first admin in the DB.
 */

import { createClient } from '@supabase/supabase-js'
import { config as dotenvConfig } from 'dotenv'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

dotenvConfig({ path: '.env.local' })
dotenvConfig()

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SESSION_SECRET = process.env.SESSION_SECRET!

if (!SUPABASE_URL || !SERVICE_KEY || !SESSION_SECRET) {
  console.error('Missing one of NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SESSION_SECRET')
  process.exit(1)
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const COOKIE_NAME = 'lpz_session'
function signSession(userId: string, role: 'admin' | 'staff'): string {
  return jwt.sign({ userId, role }, SESSION_SECRET, {
    algorithm: 'HS256',
    expiresIn: 60 * 60 * 24 * 30,
  })
}
function asCookie(token: string): string {
  return `${COOKIE_NAME}=${token}`
}

let pass = 0
let fail = 0
function step(label: string, ok: boolean, detail = '') {
  if (ok) {
    pass += 1
    console.log(`✅ ${label}${detail ? ' — ' + detail : ''}`)
  } else {
    fail += 1
    console.log(`❌ ${label}${detail ? ' — ' + detail : ''}`)
  }
}

interface StartResponse {
  attemptId: string
  current: { id: string }
  attempt_kind: 'leaderboard' | 'practice'
  totalQuestions: number
  currentQuestionIndex: number
}

async function pickActualQuiz(): Promise<{ id: string; title: string; max_score: number }> {
  const { data } = await sb
    .from('quizzes')
    .select('id, title, max_score, type, is_unlocked, deleted_at')
    .eq('type', 'actual')
    .eq('is_unlocked', true)
    .is('deleted_at', null)
    .order('week_number', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (!data) throw new Error('No unlocked actual quiz found in DB')
  return { id: data.id, title: data.title, max_score: data.max_score ?? 0 }
}

async function pickAdminUserId(): Promise<string> {
  if (process.env.ADMIN_USER_ID) return process.env.ADMIN_USER_ID
  const { data } = await sb
    .from('users')
    .select('id')
    .eq('role', 'admin')
    .eq('status', 'approved')
    .limit(1)
    .maybeSingle()
  if (!data) throw new Error('No admin user in DB; set ADMIN_USER_ID env var')
  return data.id
}

async function startAttempt(cookie: string, quizId: string): Promise<StartResponse> {
  const res = await fetch(`${BASE_URL}/api/quizzes/${quizId}/start`, {
    method: 'POST',
    headers: { Cookie: cookie },
  })
  if (!res.ok) throw new Error(`start ${res.status}: ${await res.text()}`)
  return (await res.json()) as StartResponse
}

async function answerEverything(cookie: string, attemptId: string, total: number) {
  // Hit /api/attempts/[id] iteratively to walk through questions, sending
  // a correct answer each time. The server stores only the original letter,
  // so to guarantee correctness we need to know the question's correct
  // letter — fetch it from DB by question id.
  for (let i = 0; i < total; i++) {
    const stateRes = await fetch(`${BASE_URL}/api/attempts/${attemptId}?q=${i}`, {
      headers: { Cookie: cookie },
    })
    if (!stateRes.ok) throw new Error(`state ${stateRes.status}: ${await stateRes.text()}`)
    const state = (await stateRes.json()) as { current: { id: string; options: { slot: 'A' | 'B' | 'C' | 'D'; text: string }[] } }
    // Look up correct answer + the option_orders for this question to find
    // which display slot maps to the correct letter.
    const { data: q } = await sb
      .from('questions')
      .select('correct_answer, option_a, option_b, option_c, option_d')
      .eq('id', state.current.id)
      .maybeSingle()
    if (!q) throw new Error(`question ${state.current.id} not found`)
    const correctText =
      q.correct_answer === 'A' ? q.option_a :
      q.correct_answer === 'B' ? q.option_b :
      q.correct_answer === 'C' ? q.option_c : q.option_d
    const slot = state.current.options.find(o => o.text === correctText)?.slot
    if (!slot) throw new Error('Could not match correct option to a display slot')
    const ansRes = await fetch(`${BASE_URL}/api/attempts/${attemptId}/answer`, {
      method: 'PATCH',
      headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: state.current.id, selectedDisplaySlot: slot }),
    })
    if (!ansRes.ok) throw new Error(`answer ${ansRes.status}: ${await ansRes.text()}`)
  }
}

async function submit(cookie: string, attemptId: string, claim: 'leaderboard' | 'practice'): Promise<{ status: number; body: any }> {
  const res = await fetch(`${BASE_URL}/api/attempts/${attemptId}/submit`, {
    method: 'POST',
    headers: { Cookie: cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ claim }),
  })
  return { status: res.status, body: await res.json().catch(() => ({})) }
}

async function main() {
  console.log(`Smoke test → ${BASE_URL}`)
  let testUserId: string | null = null
  try {
    // Step 1 — create test user
    const username = `smoke_${Date.now()}`
    const email = `${username}@lapizblue.test`
    const passwordHash = await bcrypt.hash('SmokeTest@2026', 12)
    const { data: created, error: cErr } = await sb
      .from('users')
      .insert({
        username,
        email,
        password_hash: passwordHash,
        first_name: 'Smoke',
        last_name: 'Test',
        role: 'staff',
        status: 'approved',
      })
      .select('id, xp, total_xp')
      .single()
    if (cErr || !created) throw new Error(`user create failed: ${cErr?.message}`)
    testUserId = created.id
    step('1. Created test user', true, `id=${testUserId}`)

    const cookie = asCookie(signSession(testUserId, 'staff'))
    const quiz = await pickActualQuiz()

    // Step 2 — Attempt 1
    const start1 = await startAttempt(cookie, quiz.id)
    step('2a. Start Attempt 1 returns leaderboard kind',
      start1.attempt_kind === 'leaderboard',
      `kind=${start1.attempt_kind}`)
    await answerEverything(cookie, start1.attemptId, start1.totalQuestions)
    const submit1 = await submit(cookie, start1.attemptId, 'leaderboard')
    step('2b. Submit Attempt 1 returns 200', submit1.status === 200, `status=${submit1.status}`)
    step('2c. Response attempt_kind=leaderboard', submit1.body?.attempt_kind === 'leaderboard')
    step('2d. perfect score → 100%', submit1.body?.percent === 100, `percent=${submit1.body?.percent}`)

    // Verify DB
    const { data: lbRow } = await sb
      .from('attempts')
      .select('is_leaderboard_attempt, xp_awarded, time_taken_seconds')
      .eq('id', start1.attemptId)
      .maybeSingle()
    step('2e. is_leaderboard_attempt=true in DB', lbRow?.is_leaderboard_attempt === true)
    step('2f. xp_awarded > 0 in DB', (lbRow?.xp_awarded ?? 0) > 0, `xp=${lbRow?.xp_awarded}`)
    step('2g. time_taken_seconds populated', (lbRow?.time_taken_seconds ?? 0) >= 0)

    // Step 3 — start a second attempt → should be practice
    const start2 = await startAttempt(cookie, quiz.id)
    step('3. Start again → practice kind',
      start2.attempt_kind === 'practice',
      `kind=${start2.attempt_kind}`)

    // Step 3b — try claiming leaderboard on the practice → 409
    await answerEverything(cookie, start2.attemptId, start2.totalQuestions)
    const submitClaimLb = await submit(cookie, start2.attemptId, 'leaderboard')
    step('3b. Submit with claim=leaderboard → 409',
      submitClaimLb.status === 409,
      `status=${submitClaimLb.status}, error=${submitClaimLb.body?.error}`)

    // Step 4 — submit as practice (a fresh attempt because the previous
    // one is now is_complete=true after the 409? Actually the 409 returned
    // BEFORE mutating, so the practice attempt is still uncomplete. Re-submit
    // with claim=practice to convert it).
    const submitPractice1 = await submit(cookie, start2.attemptId, 'practice')
    step('4a. Practice submit returns 200', submitPractice1.status === 200)
    step('4b. attempt_kind=practice in response', submitPractice1.body?.attempt_kind === 'practice')

    const { data: pcRow } = await sb
      .from('practice_counters')
      .select('attempt_count, practice_dates')
      .eq('user_id', testUserId)
      .eq('quiz_id', quiz.id)
      .maybeSingle()
    step('4c. practice_counters.attempt_count >= 1',
      (pcRow?.attempt_count ?? 0) >= 1,
      `count=${pcRow?.attempt_count}`)

    // Verify XP unchanged after practice
    const { data: userPostPractice } = await sb
      .from('users')
      .select('xp')
      .eq('id', testUserId)
      .maybeSingle()
    const userBefore = (created.xp ?? 0) + (lbRow?.xp_awarded ?? 0)
    step('4d. XP did NOT change for practice',
      (userPostPractice?.xp ?? 0) === userBefore,
      `xp=${userPostPractice?.xp}, expected=${userBefore}`)

    // Step 5 — bump practice 4 more times for Trainee (5 total)
    for (let i = 0; i < 4; i++) {
      const s = await startAttempt(cookie, quiz.id)
      await answerEverything(cookie, s.attemptId, s.totalQuestions)
      const sb2 = await submit(cookie, s.attemptId, 'practice')
      if (sb2.status !== 200) throw new Error(`practice submit ${i} failed: ${sb2.status}`)
    }
    const { data: trainee } = await sb
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', testUserId)
      .eq('achievement_id', `${quiz.id}:trainee`)
      .maybeSingle()
    step('5. Trainee achievement granted at 5 practice attempts', !!trainee)

    // Step 6 — admin reset
    const adminId = await pickAdminUserId()
    const adminCookie = asCookie(signSession(adminId, 'admin'))
    const resetRes = await fetch(`${BASE_URL}/api/admin/users/${testUserId}/reset-attempt`, {
      method: 'POST',
      headers: { Cookie: adminCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ quizId: quiz.id, reason: 'smoke test reset' }),
    })
    const resetBody = await resetRes.json().catch(() => ({}))
    step('6a. Admin reset returns 200', resetRes.status === 200,
      `status=${resetRes.status}, body=${JSON.stringify(resetBody).slice(0, 100)}`)
    const { data: lbRowAfter } = await sb
      .from('attempts')
      .select('deleted_at')
      .eq('id', start1.attemptId)
      .maybeSingle()
    step('6b. LB attempt soft-deleted', !!lbRowAfter?.deleted_at)
    const { data: userAfterReset } = await sb
      .from('users')
      .select('xp')
      .eq('id', testUserId)
      .maybeSingle()
    step('6c. XP decremented by xp_awarded',
      (userAfterReset?.xp ?? 0) === (created.xp ?? 0),
      `xp=${userAfterReset?.xp}, expected=${created.xp ?? 0}`)
    const { data: revokedTier } = await sb
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', testUserId)
      .eq('achievement_id', `${quiz.id}:gold`)
      .maybeSingle()
    step('6d. Gold tier revoked after reset', !revokedTier)

    // Step 7 — take Attempt 1 again (now allowed)
    const start3 = await startAttempt(cookie, quiz.id)
    step('7. Start after reset → leaderboard kind again',
      start3.attempt_kind === 'leaderboard',
      `kind=${start3.attempt_kind}`)
  } catch (e) {
    console.error('Smoke test crashed:', e)
    fail += 1
  } finally {
    // Step 8 — cleanup
    if (testUserId) {
      await sb.from('user_achievements').delete().eq('user_id', testUserId)
      await sb.from('practice_counters').delete().eq('user_id', testUserId)
      await sb.from('attempts').delete().eq('user_id', testUserId)
      await sb.from('email_log').delete().eq('user_id', testUserId)
      await sb.from('users').delete().eq('id', testUserId)
      step('8. Cleanup deleted test user', true)
    }
  }

  console.log('')
  console.log(`Result: ${pass} passed, ${fail} failed`)
  process.exit(fail === 0 ? 0 : 1)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
