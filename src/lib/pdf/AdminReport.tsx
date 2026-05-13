import * as React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

/**
 * Admin PDF report per CLAUDE_CODE_PROMPT.md §9. Same shape as the user
 * report but additionally shows:
 *  - User's chosen option (red if wrong, green if right)
 *  - "WRONG ANSWER" pill in the question header where applicable
 *  - IP / UA / timestamps in the header
 *  - Per-question time spent if available
 */

export interface AdminReportProps {
  quizTitle: string
  fullName: string
  username: string
  email: string
  date_uae: string
  timeTaken: string
  finalScore: number
  maxScore: number
  percent: number
  xpEarned: number
  rankAtCompletion: number | null
  totalCompletions: number
  ip: string | null
  userAgent: string | null
  startedAtUae: string
  submittedAtUae: string
  questions: ReadonlyArray<{
    question_text: string
    option_a: string
    option_b: string
    option_c: string
    option_d: string
    correct_answer: 'A' | 'B' | 'C' | 'D'
    user_answer: 'A' | 'B' | 'C' | 'D' | null
    explanation: string | null
    time_taken_seconds: number | null
  }>
}

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, color: '#0F172A', padding: 0 },
  header: {
    backgroundColor: '#0B1437',
    color: '#FFFFFF',
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: { fontSize: 18, fontWeight: 'bold', letterSpacing: 1.5 },
  brandTag: { fontSize: 9, color: '#94A3B8', marginTop: 2, letterSpacing: 1 },
  reportTag: { fontSize: 11, color: '#FCA5A5', letterSpacing: 1, fontWeight: 'bold' },

  body: { padding: 28 },
  title: { fontSize: 16, fontWeight: 'bold', marginBottom: 4, color: '#0B1437' },
  subtitle: { fontSize: 9, color: '#475569', marginBottom: 14 },

  metaTable: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
  },
  metaCell: { width: '50%', paddingVertical: 3 },
  metaLabel: { fontSize: 8, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 },
  metaValue: { fontSize: 10, color: '#0F172A', marginTop: 1 },

  questionBlock: { marginBottom: 14 },
  qHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  qNum: { fontSize: 9, color: '#94A3B8', letterSpacing: 0.5 },
  wrongPill: {
    backgroundColor: '#FEE2E2',
    color: '#B91C1C',
    fontSize: 7,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    letterSpacing: 0.5,
  },
  skippedPill: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
    fontSize: 7,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    letterSpacing: 0.5,
  },
  qText: { fontSize: 10, fontWeight: 'bold', color: '#0F172A', lineHeight: 1.4, marginBottom: 6 },
  qMeta: { fontSize: 8, color: '#94A3B8', marginBottom: 4 },

  option: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 3,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  optionCorrect: { backgroundColor: '#F0FDF4', borderColor: '#16A34A' },
  optionWrong:   { backgroundColor: '#FEF2F2', borderColor: '#DC2626' },
  optionLetter: { width: 16, fontWeight: 'bold', color: '#64748B', fontSize: 9 },
  optionLetterCorrect: { color: '#16A34A' },
  optionLetterWrong:   { color: '#DC2626' },
  optionText: { flex: 1, fontSize: 9, color: '#0F172A', lineHeight: 1.3 },
  explanation: {
    marginTop: 4,
    fontSize: 8,
    color: '#475569',
    lineHeight: 1.4,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#CBD5E1',
  },

  footer: {
    position: 'absolute',
    bottom: 24,
    left: 28,
    right: 28,
    fontSize: 7,
    color: '#94A3B8',
    textAlign: 'center',
  },
})

const LETTERS = ['A', 'B', 'C', 'D'] as const

export function AdminReport(props: AdminReportProps) {
  // Three states per question:
  //   correct  — user_answer === correct_answer
  //   wrong    — user_answer is set AND !== correct_answer
  //   skipped  — user_answer is null/undefined (left blank)
  // Both wrong + skipped count toward the "missed" total; the score
  // itself is correct_count (post-migration-009: 1 mark per question).
  const wrongPicks = props.questions.filter(
    q => !!q.user_answer && q.user_answer !== q.correct_answer,
  ).length
  const skipped = props.questions.filter(q => !q.user_answer).length
  const missed = wrongPicks + skipped

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>LAPIZ BLUE</Text>
            <Text style={styles.brandTag}>Quiz · Sales Training</Text>
          </View>
          <Text style={styles.reportTag}>ADMIN REPORT</Text>
        </View>

        <View style={styles.body}>
          <Text style={styles.title}>{props.quizTitle}</Text>
          <Text style={styles.subtitle}>
            {props.fullName} (@{props.username}) · {props.email} · {props.date_uae}
          </Text>

          <View style={styles.metaTable}>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Score</Text>
              <Text style={styles.metaValue}>{props.finalScore} / {props.maxScore} ({props.percent.toFixed(1)}%)</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Missed</Text>
              <Text style={styles.metaValue}>
                {missed} total ({wrongPicks} wrong + {skipped} skipped)
              </Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Time taken</Text>
              <Text style={styles.metaValue}>{props.timeTaken}</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>XP awarded</Text>
              <Text style={styles.metaValue}>+{props.xpEarned}</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Rank at completion</Text>
              <Text style={styles.metaValue}>
                {props.rankAtCompletion ? `#${props.rankAtCompletion}` : '—'}{props.totalCompletions ? ` / ${props.totalCompletions}` : ''}
              </Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Started</Text>
              <Text style={styles.metaValue}>{props.startedAtUae}</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Submitted</Text>
              <Text style={styles.metaValue}>{props.submittedAtUae}</Text>
            </View>
            <View style={[styles.metaCell, { width: '100%' }]}>
              <Text style={styles.metaLabel}>IP / User-Agent</Text>
              <Text style={styles.metaValue}>{props.ip ?? '—'} · {props.userAgent ?? '—'}</Text>
            </View>
          </View>

          {props.questions.map((q, i) => {
            const opts = [q.option_a, q.option_b, q.option_c, q.option_d]
            const isWrong = !!q.user_answer && q.user_answer !== q.correct_answer
            const isSkipped = !q.user_answer
            return (
              <View key={i} style={styles.questionBlock} wrap={false}>
                <View style={styles.qHeader}>
                  <Text style={styles.qNum}>Q{i + 1}</Text>
                  {isWrong ? (
                    <Text style={styles.wrongPill}>WRONG ANSWER</Text>
                  ) : isSkipped ? (
                    <Text style={styles.skippedPill}>SKIPPED</Text>
                  ) : null}
                </View>
                <Text style={styles.qText}>{q.question_text}</Text>
                {q.time_taken_seconds != null ? (
                  <Text style={styles.qMeta}>Time on question: {q.time_taken_seconds}s</Text>
                ) : null}
                {opts.map((text, j) => {
                  const letter = LETTERS[j]
                  const isCorrect = letter === q.correct_answer
                  const isUserPick = letter === q.user_answer
                  let style: any[] = [styles.option]
                  let letterStyle: any[] = [styles.optionLetter]
                  if (isCorrect) {
                    style.push(styles.optionCorrect)
                    letterStyle.push(styles.optionLetterCorrect)
                  } else if (isUserPick) {
                    style.push(styles.optionWrong)
                    letterStyle.push(styles.optionLetterWrong)
                  }
                  return (
                    <View key={j} style={style}>
                      <Text style={letterStyle}>{letter}.</Text>
                      <Text style={styles.optionText}>{text}</Text>
                    </View>
                  )
                })}
                {q.explanation ? <Text style={styles.explanation}>{q.explanation}</Text> : null}
              </View>
            )
          })}
        </View>

        <Text style={styles.footer} fixed>
          ADMIN COPY · Lapiz Blue General Trading LLC · Internal training audit · Not for external distribution
        </Text>
      </Page>
    </Document>
  )
}
