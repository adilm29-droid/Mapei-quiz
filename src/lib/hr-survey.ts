// Digital Colleague Feedback Survey — content copied verbatim from "Survey Parametres.docx".
// Shared by the /survey pages (client) and the /api/survey routes (server).

export type SurveyType = 'A' | 'B'

export const SCALE = [
  { value: 1, label: 'Very Poor' },
  { value: 2, label: 'Poor' },
  { value: 3, label: 'Satisfactory', short: 'Satis­factory' },
  { value: 4, label: 'Good' },
  { value: 5, label: 'Excellent' },
] as const

export const SURVEYS: Record<
  SurveyType,
  { key: SurveyType; title: string; picker: string; blurb: string; assessedLabel: string; questions: string[] }
> = {
  A: {
    key: 'A',
    title: 'Staff → Manager',
    picker: 'I’m rating my Manager / HOD',
    blurb: 'Confidential: your manager never sees who said what.',
    assessedLabel: 'Name of your HOD / Manager',
    questions: [
      'Does your manager communicate instructions and expectations clearly?',
      'Does your manager treat team members respectfully and professionally?',
      'Is your manager available and supportive when help or guidance is needed?',
      'Does your manager make fair and consistent decisions?',
      'Does your manager take responsibility for problems and mistakes?',
      'Does your manager organise and manage the department effectively?',
      'Does your manager respond to important issues in a timely manner?',
      'Does your manager encourage teamwork and cooperation?',
      'Does your manager give useful feedback that helps staff improve?',
      'Overall, how effective is your manager at leading and supporting the team?',
    ],
  },
  B: {
    key: 'B',
    title: 'Manager → Staff',
    picker: 'I’m rating a team member or colleague',
    blurb: 'For HODs rating staff, and linked roles such as Loader and Storekeeper.',
    assessedLabel: 'Name of the employee',
    questions: [
      'Does the employee communicate clearly and professionally?',
      'Does the employee treat managers and colleagues respectfully?',
      'Does the employee cooperate well with other team members?',
      'Can the employee be relied upon to complete assigned responsibilities properly?',
      'Does the employee take responsibility for mistakes and correct them?',
      'Does the employee respond positively to instructions and feedback?',
      'Does the employee support colleagues when assistance is required?',
      'Does the employee handle disagreements and work issues professionally?',
      'Does the employee contribute positively to teamwork and the work environment?',
      'Overall, how effective and dependable is this employee as a team member?',
    ],
  },
}

export const MIN_HOD_RESPONSES = 3
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Twice per year in UAE time (UTC+4): Jan–Jun = H1, Jul–Dec = H2 */
export function periodFor(date: Date = new Date()): string {
  const uae = new Date(date.getTime() + 4 * 60 * 60 * 1000)
  return `${uae.getUTCFullYear()}-${uae.getUTCMonth() < 6 ? 'H1' : 'H2'}`
}

export function periodLabel(p: string): string {
  const [y, h] = String(p).split('-')
  return h === 'H1' ? `Jan–Jun ${y}` : `Jul–Dec ${y}`
}

export function normaliseName(s: unknown): string {
  return String(s ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/(^|[\s'-])\p{L}/gu, m => m.toUpperCase())
}

/** 10 questions × 5 = 50; KPI = total × 2 (out of 100) */
export function scoreOf(answers: number[]): { total: number; kpi: number } {
  const total = answers.reduce((a, b) => a + (b || 0), 0)
  return { total, kpi: total * 2 }
}
