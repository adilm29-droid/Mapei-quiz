import * as React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { MasterReportData } from '@/lib/reports/master-report'

/**
 * Admin "Master report" PDF — combined ranking on page 1, then one
 * section per quiz with per-quiz ranking + medal indicators.
 * Bar widths are proportional to score/max so the page reads as a
 * compact bar chart.
 */

export interface MasterReportPdfProps {
  data: MasterReportData
  date_uae: string
}

const COLORS = {
  midnight: '#0B1437',
  ink: '#0F172A',
  muted: '#475569',
  faint: '#94A3B8',
  line: '#E2E8F0',
  bg: '#F8FAFC',
  gold: '#F59E0B',
  silver: '#94A3B8',
  bronze: '#B45309',
  aurora: '#6366F1',
}

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 9, color: COLORS.ink, padding: 0 },
  header: {
    backgroundColor: COLORS.midnight,
    color: '#FFFFFF',
    padding: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: { fontSize: 16, fontWeight: 'bold', letterSpacing: 1.5 },
  brandTag: { fontSize: 8, color: COLORS.faint, marginTop: 2, letterSpacing: 1 },
  reportTag: { fontSize: 10, color: COLORS.faint, letterSpacing: 1 },
  body: { padding: 28 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.midnight,
    marginTop: 12,
    marginBottom: 4,
  },
  sectionMeta: {
    fontSize: 8,
    color: COLORS.muted,
    marginBottom: 10,
  },
  rowOuter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    borderRadius: 4,
    marginBottom: 4,
    paddingVertical: 5,
    paddingHorizontal: 8,
    position: 'relative',
  },
  bar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    opacity: 0.18,
    borderRadius: 4,
  },
  rank: {
    width: 22,
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.muted,
    textAlign: 'center',
  },
  nameBlock: { flex: 1, paddingLeft: 6, paddingRight: 6 },
  name: { fontSize: 10, fontWeight: 'bold', color: COLORS.ink },
  username: { fontSize: 7, color: COLORS.muted },
  medal: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    color: '#FFFFFF',
    fontSize: 7,
    fontWeight: 'bold',
    letterSpacing: 0.8,
    marginRight: 6,
  },
  score: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.ink,
    textAlign: 'right',
    minWidth: 50,
  },
  scoreMeta: {
    fontSize: 7,
    color: COLORS.muted,
    textAlign: 'right',
  },
  empty: {
    padding: 12,
    backgroundColor: COLORS.bg,
    borderRadius: 4,
    fontSize: 9,
    color: COLORS.muted,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 14,
    left: 28,
    right: 28,
    fontSize: 7,
    color: COLORS.faint,
    textAlign: 'center',
  },
})

function medalStyle(medal: 'gold' | 'silver' | 'bronze' | null) {
  if (medal === 'gold') return { backgroundColor: COLORS.gold }
  if (medal === 'silver') return { backgroundColor: COLORS.silver }
  if (medal === 'bronze') return { backgroundColor: COLORS.bronze }
  return null
}

function barColor(medal: 'gold' | 'silver' | 'bronze' | null): string {
  if (medal === 'gold') return COLORS.gold
  if (medal === 'silver') return COLORS.silver
  if (medal === 'bronze') return COLORS.bronze
  return COLORS.aurora
}

function ScoreRow({
  rank,
  name,
  username,
  score,
  max,
  metaRight,
  medal,
}: {
  rank: number
  name: string
  username: string
  score: number
  max: number
  metaRight: string
  medal: 'gold' | 'silver' | 'bronze' | null
}) {
  const widthPct = max > 0 ? Math.min(100, (score / max) * 100) : 0
  const m = medalStyle(medal)
  return (
    <View style={styles.rowOuter} wrap={false}>
      <View
        style={[
          styles.bar,
          { width: `${widthPct}%`, backgroundColor: barColor(medal) },
        ]}
      />
      <Text style={styles.rank}>{rank}</Text>
      <View style={styles.nameBlock}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.username}>@{username}</Text>
      </View>
      {m && (
        <Text style={[styles.medal, m]}>
          {medal === 'gold' ? 'GOLD' : medal === 'silver' ? 'SILVER' : 'BRONZE'}
        </Text>
      )}
      <View>
        <Text style={styles.score}>
          {score} / {max}
        </Text>
        <Text style={styles.scoreMeta}>{metaRight}</Text>
      </View>
    </View>
  )
}

export function MasterReport({ data, date_uae }: MasterReportPdfProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <View>
            <Text style={styles.brand}>LAPIZ BLUE</Text>
            <Text style={styles.brandTag}>Quiz · Master Report</Text>
          </View>
          <Text style={styles.reportTag}>ALL STAFF · ALL QUIZZES</Text>
        </View>

        <View style={styles.body}>
          <Text style={styles.sectionTitle}>
            Overall ranking ({data.totals.length})
          </Text>
          <Text style={styles.sectionMeta}>
            Combined across every quiz. Generated {date_uae}.
          </Text>
          {data.totals.length === 0 ? (
            <Text style={styles.empty}>No leaderboard attempts on file yet.</Text>
          ) : (
            data.totals.map(t => (
              <ScoreRow
                key={t.userId}
                rank={t.rank}
                name={t.userName}
                username={t.username}
                score={t.totalScore}
                max={t.totalMax}
                metaRight={`${t.quizzesAttempted} quiz${t.quizzesAttempted === 1 ? '' : 'zes'}`}
                medal={t.medal}
              />
            ))
          )}

          {data.quizzes.map(q => (
            <View key={q.quizId} break={false}>
              <Text style={styles.sectionTitle}>
                {q.weekNumber ? `Week ${q.weekNumber} · ` : ''}
                {q.title}
              </Text>
              <Text style={styles.sectionMeta}>
                {q.rows.length} attempt{q.rows.length === 1 ? '' : 's'} · max {q.maxScore}
              </Text>
              {q.rows.length === 0 ? (
                <Text style={styles.empty}>No staff have completed this quiz yet.</Text>
              ) : (
                q.rows.map(r => (
                  <ScoreRow
                    key={`${q.quizId}:${r.userId}`}
                    rank={r.rank}
                    name={r.userName}
                    username={r.username}
                    score={r.score}
                    max={r.maxScore}
                    metaRight={`${r.wrong} wrong`}
                    medal={r.medal}
                  />
                ))
              )}
            </View>
          ))}
        </View>

        <Text style={styles.footer} fixed>
          Lapiz Blue General Trading LLC · Internal training audit · Not for external distribution
        </Text>
      </Page>
    </Document>
  )
}
