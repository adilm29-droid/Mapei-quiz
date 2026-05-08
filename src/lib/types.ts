/**
 * Database row types — one source of truth for every table in
 * supabase/schema_reset.sql. Keep in sync if the schema changes.
 *
 * Convention: the *Row types are exact DB shapes. *Insert types omit
 * server-generated fields (id, created_at, updated_at). *Public types
 * are the safe-to-return-from-API shape (no password_hash, etc.).
 */

// ── users ─────────────────────────────────────────────────────────────
export type UserRole = 'admin' | 'staff'
export type UserStatus = 'pending' | 'approved' | 'rejected' | 'suspended'

export interface UserRow {
  id: string
  username: string
  password_hash: string
  email: string
  first_name: string | null
  last_name: string | null
  role: UserRole
  status: UserStatus
  avatar_url: string | null
  xp: number
  level: number
  title: string
  current_streak: number
  longest_streak: number
  streak_freezes: number
  last_quiz_date: string | null // YYYY-MM-DD (UAE date)
  active_badge_id: string | null
  created_at: string
  updated_at: string
}

export type UserPublic = Omit<UserRow, 'password_hash'>

// ── quizzes ───────────────────────────────────────────────────────────
export interface QuizRow {
  id: string
  title: string
  week_number: number
  is_unlocked: boolean
  unlocked_at: string | null
  leaderboard_visible: boolean
  leaderboard_revealed_at: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

// ── questions ─────────────────────────────────────────────────────────
export type AnswerLetter = 'A' | 'B' | 'C' | 'D'

export interface QuestionRow {
  id: string
  quiz_id: string
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: AnswerLetter
  explanation: string | null
  category: string | null
  order_index: number
  created_at: string
}

// What an admin pastes via CSV (no IDs, no quiz_id, no order_index — server fills)
export interface QuestionInsert {
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: AnswerLetter
  explanation?: string | null
  category?: string | null
}

// ── attempts ──────────────────────────────────────────────────────────
/** Map from question_id → display order of letters. e.g. ['C','A','D','B']
 *  means slot 1 shows the original C option, slot 2 shows A, etc. */
export type OptionOrder = AnswerLetter[]

/** Map from question_id → original letter the user picked. */
export type AnswersMap = Record<string, AnswerLetter>

/** Map from question_id → display-order shuffle for that question. */
export type OptionOrdersMap = Record<string, OptionOrder>

export interface AttemptRow {
  id: string
  user_id: string
  quiz_id: string
  attempt_number: number
  started_at: string
  expires_at: string
  submitted_at: string | null
  is_complete: boolean
  is_incomplete: boolean
  final_score: number | null
  question_order: string[]               // ordered list of question_id
  option_orders: OptionOrdersMap
  current_question_index: number
  answers: AnswersMap
  created_at: string
}

// ── access_requests ───────────────────────────────────────────────────
export type AccessRequestStatus = 'pending' | 'granted' | 'denied'

export interface AccessRequestRow {
  id: string
  user_id: string
  quiz_id: string
  status: AccessRequestStatus
  requested_at: string
  resolved_at: string | null
  resolved_by: string | null
}

// ── badges (catalog) ──────────────────────────────────────────────────
export type BadgeCategory = 'skill' | 'streak' | 'discovery'

export interface BadgeRow {
  id: string
  code: string
  name: string
  description: string
  icon_name: string
  category: BadgeCategory
  gradient: 'aurora' | 'sunset' | 'champion' | 'spring' | 'ember' | 'plasma'
  condition_json: Record<string, unknown>
  created_at: string
}

// ── user_badges ───────────────────────────────────────────────────────
export interface UserBadgeRow {
  id: string
  user_id: string
  badge_id: string
  earned_at: string
}

// ── reviewed_mistakes ─────────────────────────────────────────────────
export interface ReviewedMistakeRow {
  id: string
  user_id: string
  question_id: string
  reviewed_at: string
}

// ── email_log ─────────────────────────────────────────────────────────
export type EmailType =
  | 'account_created'
  | 'new_registration'
  | 'password_reset_request'
  | 'approved'
  | 'quiz_assigned'
  | 'certificate_earned'
  | 'leaderboard_live'
  | 'streak_milestone'
  | 'streak_at_risk'
  | 'access_request_received'
  | 'access_request_resolved'
  | 'weekly_recap'

export interface EmailLogRow {
  id: string
  user_id: string | null
  type: EmailType
  payload: Record<string, unknown>
  sent_at: string
}

// ── derived / API response shapes ─────────────────────────────────────
export interface QuestionForDisplay {
  /** Question id (used for answer submissions) */
  id: string
  question_text: string
  /** The 4 options in the user's display order. Letter labels stay A/B/C/D. */
  options: { slot: 'A' | 'B' | 'C' | 'D'; text: string }[]
}

export interface AttemptStateForClient {
  attemptId: string
  quizId: string
  totalQuestions: number
  currentQuestionIndex: number
  expiresAt: string                      // ISO
  timeRemainingMs: number                // server-computed at request time
  current: QuestionForDisplay
  /** Display slot the user previously confirmed for the current question, if any */
  previouslySelected: 'A' | 'B' | 'C' | 'D' | null
  /** Which question_ids the user has already answered */
  answeredQuestionIds: string[]
}

export interface AttemptResultForClient {
  attemptId: string
  totalQuestions: number
  finalScore: number
  percent: number
  perQuestion: {
    questionId: string
    question_text: string
    yourAnswer: AnswerLetter | null      // original letter
    yourAnswerText: string | null
    correctAnswer: AnswerLetter
    correctAnswerText: string
    isCorrect: boolean
    explanation: string | null
  }[]
  xp: {
    delta: number
    newXp: number
    leveledUp: boolean
    oldLevel: number
    newLevel: number
    newTitle: string
  }
  streak: {
    current: number
    longest: number
    hitMilestone: 7 | 30 | 100 | 365 | null
    freezeUsed: boolean
  }
  newBadges: { code: string; name: string; description: string; gradient: string }[]
}
