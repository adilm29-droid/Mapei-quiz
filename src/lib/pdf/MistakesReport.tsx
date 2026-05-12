import * as React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

/**
 * "Wrong questions" PDF for the user themselves. Lists every question
 * they got wrong across every leaderboard attempt, with the question
 * text, their answer, and the correct answer. Designed as a study
 * companion — no scoring metadata, no shaming pills, just the facts.
 */

export interface MistakesReportProps {
  fullName: string
  date_uae: string
  totalMistakes: number
  mistakes: ReadonlyArray<{
    quiz_title: string
    question_text: string
    your_answer: string | null
    correct_answer: string
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
  subtitle: { fontSize: 10, color: '#475569', marginBottom: 20 },
  empty: {
    padding: 24,
    backgroundColor: '#F0FDF4',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#16A34A',
    fontSize: 12,
    color: '#15803D',
    textAlign: 'center',
  },
  mistake: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  quizName: {
    fontSize: 8,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  qText: { fontSize: 11, fontWeight: 'bold', color: '#0F172A', lineHeight: 1.4, marginBottom: 8 },
  answerRow: { flexDirection: 'row', marginBottom: 4 },
  answerLabel: { width: 70, fontSize: 9, color: '#64748B' },
  yourAnswer: { flex: 1, fontSize: 10, color: '#B91C1C', textDecoration: 'line-through' },
  correctAnswer: { flex: 1, fontSize: 10, color: '#15803D', fontWeight: 'bold' },
  explanation: {
    marginTop: 6,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#CBD5E1',
    fontSize: 9,
    color: '#475569',
    fontStyle: 'italic',
    lineHeight: 1.5,
  },
  footer: {
    position: 'absolute',
    bottom: 16,
    left: 32,
    right: 32,
    fontSize: 8,
    color: '#94A3B8',
    textAlign: 'center',
  },
})

export function MistakesReport(props: MistakesReportProps) {
  const { fullName, date_uae, totalMistakes, mistakes } = props
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <View>
            <Text style={styles.brand}>LAPIZ BLUE</Text>
            <Text style={styles.brandTag}>Quiz · Study Companion</Text>
          </View>
          <Text style={styles.reportTag}>YOUR MISTAKES</Text>
        </View>

        <View style={styles.body}>
          <Text style={styles.title}>Questions to revisit</Text>
          <Text style={styles.subtitle}>
            {fullName} · Generated {date_uae} · {totalMistakes} question
            {totalMistakes === 1 ? '' : 's'}
          </Text>

          {mistakes.length === 0 ? (
            <Text style={styles.empty}>
              No wrong answers on record. You&apos;re crushing it.
            </Text>
          ) : (
            mistakes.map((m, i) => (
              <View key={i} style={styles.mistake} wrap={false}>
                <Text style={styles.quizName}>{m.quiz_title}</Text>
                <Text style={styles.qText}>
                  {i + 1}. {m.question_text}
                </Text>
                {m.your_answer && (
                  <View style={styles.answerRow}>
                    <Text style={styles.answerLabel}>You picked:</Text>
                    <Text style={styles.yourAnswer}>{m.your_answer}</Text>
                  </View>
                )}
                <View style={styles.answerRow}>
                  <Text style={styles.answerLabel}>Correct:</Text>
                  <Text style={styles.correctAnswer}>{m.correct_answer}</Text>
                </View>
                {m.explanation && <Text style={styles.explanation}>{m.explanation}</Text>}
              </View>
            ))
          )}
        </View>

        <Text style={styles.footer} fixed>
          Lapiz Blue General Trading LLC · Internal training material · Not for external distribution
        </Text>
      </Page>
    </Document>
  )
}
