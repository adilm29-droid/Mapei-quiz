import * as React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer'

/**
 * User-facing PDF report per CLAUDE_CODE_PROMPT.md §9.
 * - Midnight blue header band with logo + title
 * - Score, time, rank-at-completion summary
 * - Per-question: question, all options, ONLY correct option highlighted in green
 *   (no red wrongs — explicit "no shaming" rule)
 * - Footer: Lapiz Blue / internal training only
 */

export interface UserReportProps {
  quizTitle: string
  fullName: string
  date_uae: string                 // formatted "08 May 2026 · 14:32 GST"
  timeTaken: string                // "12:34"
  finalScore: number
  maxScore: number
  percent: number
  xpEarned: number
  rankAtCompletion: number | null
  totalCompletions: number
  questions: ReadonlyArray<{
    question_text: string
    option_a: string
    option_b: string
    option_c: string
    option_d: string
    correct_answer: 'A' | 'B' | 'C' | 'D'
    explanation: string | null
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
  reportTag: { fontSize: 11, color: '#94A3B8', letterSpacing: 1 },
  body: { padding: 32 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 4, color: '#0B1437' },
  subtitle: { fontSize: 10, color: '#475569', marginBottom: 16 },
  metaTable: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: 12,
    marginBottom: 24,
  },
  metaCell: { width: '33%', paddingVertical: 4 },
  metaLabel: { fontSize: 8, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.6 },
  metaValue: { fontSize: 12, color: '#0F172A', fontWeight: 'bold', marginTop: 2 },
  questionBlock: { marginBottom: 18 },
  qHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  qNum: { fontSize: 9, color: '#94A3B8', letterSpacing: 0.6 },
  qText: { fontSize: 11, fontWeight: 'bold', color: '#0F172A', lineHeight: 1.4, marginBottom: 8 },
  option: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginBottom: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  optionCorrect: {
    backgroundColor: '#F0FDF4',
    borderColor: '#16A34A',
  },
  optionLetter: {
    width: 20,
    fontWeight: 'bold',
    color: '#64748B',
  },
  optionLetterCorrect: { color: '#16A34A' },
  optionText: { flex: 1, fontSize: 10, color: '#0F172A', lineHeight: 1.35 },
  explanation: {
    marginTop: 6,
    fontSize: 9,
    color: '#475569',
    lineHeight: 1.5,
    fontStyle: 'italic',
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: '#CBD5E1',
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 32,
    right: 32,
    fontSize: 8,
    color: '#94A3B8',
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
  },
})

const LETTERS = ['A', 'B', 'C', 'D'] as const

export function UserReport(props: UserReportProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>LAPIZ BLUE</Text>
            <Text style={styles.brandTag}>Quiz · Sales Training</Text>
          </View>
          <Text style={styles.reportTag}>QUIZ REPORT</Text>
        </View>

        <View style={styles.body}>
          <Text style={styles.title}>{props.quizTitle}</Text>
          <Text style={styles.subtitle}>{props.fullName} · {props.date_uae}</Text>

          <View style={styles.metaTable}>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Score</Text>
              <Text style={styles.metaValue}>{props.finalScore} / {props.maxScore}</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Percent</Text>
              <Text style={styles.metaValue}>{props.percent.toFixed(1)}%</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Time taken</Text>
              <Text style={styles.metaValue}>{props.timeTaken}</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>XP earned</Text>
              <Text style={styles.metaValue}>+{props.xpEarned}</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Rank</Text>
              <Text style={styles.metaValue}>
                {props.rankAtCompletion ? `#${props.rankAtCompletion}` : '—'}{props.totalCompletions ? ` / ${props.totalCompletions}` : ''}
              </Text>
            </View>
          </View>

          {props.questions.map((q, i) => {
            const opts = [q.option_a, q.option_b, q.option_c, q.option_d]
            return (
              <View key={i} style={styles.questionBlock} wrap={false}>
                <View style={styles.qHeader}>
                  <Text style={styles.qNum}>Q{i + 1}</Text>
                </View>
                <Text style={styles.qText}>{q.question_text}</Text>
                {opts.map((text, j) => {
                  const letter = LETTERS[j]
                  const isCorrect = letter === q.correct_answer
                  return (
                    <View key={j} style={[styles.option, ...(isCorrect ? [styles.optionCorrect] : [])]}>
                      <Text style={[styles.optionLetter, ...(isCorrect ? [styles.optionLetterCorrect] : [])]}>
                        {letter}.
                      </Text>
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
          Generated for Lapiz Blue General Trading LLC · Internal training material · Not for external distribution
        </Text>
      </Page>
    </Document>
  )
}
