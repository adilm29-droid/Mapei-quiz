import type { AnswersMap, QuestionRow } from './types'

/**
 * Server-side authoritative scoring. The browser never computes this —
 * /api/attempts/:id/submit always derives final_score from the original
 * letters in `answers` vs `correct_answer`.
 */
export interface ScoreBreakdown {
  finalScore: number          // sum of points for correctly-answered questions
  maxScore: number            // sum of points across all questions in the quiz
  correctCount: number
  totalQuestions: number
  /** percent rounded to 1dp */
  percent: number
  perQuestion: {
    questionId: string
    awarded: number           // 0 or q.points
    possible: number          // q.points
    correct: boolean
    answered: boolean
  }[]
}

export function computeScore(questions: QuestionRow[], answers: AnswersMap): ScoreBreakdown {
  let finalScore = 0
  let maxScore = 0
  let correctCount = 0

  const perQuestion = questions.map(q => {
    const possible = q.points
    maxScore += possible
    const userAnswer = answers[q.id]
    const answered = !!userAnswer
    const correct = answered && userAnswer === q.correct_answer
    const awarded = correct ? possible : 0
    if (correct) {
      finalScore += possible
      correctCount += 1
    }
    return { questionId: q.id, awarded, possible, correct, answered }
  })

  const percent =
    maxScore === 0 ? 0 : Math.round((finalScore / maxScore) * 1000) / 10

  return {
    finalScore,
    maxScore,
    correctCount,
    totalQuestions: questions.length,
    percent,
    perQuestion,
  }
}
