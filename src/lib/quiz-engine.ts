/**
 * Pure helpers for quiz mechanics — shuffle, slot translation, display
 * mapping. Keep these stateless; route handlers are the only place that
 * touches the DB.
 */

import type { AnswerLetter, OptionOrder, QuestionRow } from './types'

const LETTERS: readonly AnswerLetter[] = ['A', 'B', 'C', 'D'] as const

/** Fisher–Yates. Returns a fresh array; does not mutate input. */
export function shuffle<T>(input: readonly T[]): T[] {
  const arr = input.slice()
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/** Per-question option order. e.g. ['B','D','A','C'] = slot1=origB, slot2=origD, … */
export function shuffleOptionLetters(): OptionOrder {
  return shuffle(LETTERS) as OptionOrder
}

/** Slot 1-4 (display) → original letter (A/B/C/D). */
export function slotToOriginalLetter(order: OptionOrder, slot: 1 | 2 | 3 | 4): AnswerLetter {
  return order[slot - 1]
}

/** Original letter → display slot 1-4. */
export function originalLetterToSlot(order: OptionOrder, letter: AnswerLetter): 1 | 2 | 3 | 4 {
  const idx = order.indexOf(letter)
  return ((idx >= 0 ? idx : 0) + 1) as 1 | 2 | 3 | 4
}

/** Build the display payload for one question, using its option_order. */
export function questionToDisplay(
  q: Pick<
    QuestionRow,
    'id' | 'question_text' | 'option_a' | 'option_b' | 'option_c' | 'option_d' | 'difficulty' | 'points'
  >,
  order: OptionOrder,
) {
  const original = { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d } as Record<
    AnswerLetter,
    string
  >
  return {
    id: q.id,
    question_text: q.question_text,
    difficulty: q.difficulty,
    points: q.points,
    options: order.map((origLetter, i) => ({
      slot: LETTERS[i],          // 'A' | 'B' | 'C' | 'D'
      text: original[origLetter],
    })),
  }
}

export const QUIZ_TIME_LIMIT_MS = 30 * 60 * 1000          // 30 minutes
export const FREE_ATTEMPT_CAP = 2                         // each user gets 2 free attempts per quiz
