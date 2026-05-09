/**
 * One-off content fix per CLAUDE_CODE_PROMPT.md §19.
 *
 * The original Quiz 1 had a question that asked which classification
 * arises from "Kerabond T + Isolastic", expecting the answer C2ES2.
 * Two errors:
 *   - Kerabond T is not the cementitious adhesive in this combination —
 *     it should be Kerabond Plus (the standard variant).
 *   - The isolastic dosage matters: 1:1 dilution → C2ES1 (not S2).
 *
 * This script finds the question by signature and rewrites it
 * idempotently. Run with:
 *   npx tsx scripts/fix-isolastic-question.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in env.
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const NEW_TEXT =
  'When Kerabond Plus is mixed with Isolastic at a 1:1 dilution ratio (instead of water), what classification does the resulting adhesive achieve under EN 12004?'
const NEW_OPTION_A = 'C1'
const NEW_OPTION_B = 'C2TE'
const NEW_OPTION_C = 'C2ES1'
const NEW_OPTION_D = 'C2ES2'
const NEW_CORRECT = 'C' as const
const NEW_EXPLANATION =
  'Kerabond Plus + Isolastic at 1:1 dilution creates a C2ES1 class adhesive — improved cementitious (C2), with extended open time (E) and reduced slip (S1). The S2 class only applies to higher-flexibility systems with deformation > 5 mm.'

async function main() {
  // Find the question by signature: question text mentions both
  // "Kerabond" and "Isolastic" together. We tolerate previous variants.
  const { data: candidates, error } = await supabase
    .from('questions')
    .select('id, question_text, option_a, option_b, option_c, option_d, correct_answer')
    .ilike('question_text', '%Kerabond%')
  if (error) {
    console.error('Lookup failed:', error)
    process.exit(1)
  }

  const matches = (candidates ?? []).filter(q => /isolastic/i.test(q.question_text))
  if (matches.length === 0) {
    console.log('No Kerabond/Isolastic question found — nothing to fix.')
    return
  }
  if (matches.length > 1) {
    console.warn(`Found ${matches.length} candidate questions; updating all of them:`)
    for (const m of matches) console.warn(`  - ${m.id} :: ${m.question_text.slice(0, 80)}`)
  }

  for (const q of matches) {
    const isAlreadyCorrect =
      q.question_text === NEW_TEXT &&
      q.option_c === NEW_OPTION_C &&
      q.correct_answer === NEW_CORRECT
    if (isAlreadyCorrect) {
      console.log(`✓ ${q.id} already up-to-date.`)
      continue
    }

    const { error: upErr } = await supabase
      .from('questions')
      .update({
        question_text: NEW_TEXT,
        option_a: NEW_OPTION_A,
        option_b: NEW_OPTION_B,
        option_c: NEW_OPTION_C,
        option_d: NEW_OPTION_D,
        correct_answer: NEW_CORRECT,
        explanation: NEW_EXPLANATION,
      })
      .eq('id', q.id)
    if (upErr) {
      console.error(`Failed to update ${q.id}:`, upErr)
      continue
    }
    console.log(`✓ Updated ${q.id}`)
  }
  console.log('Done.')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
