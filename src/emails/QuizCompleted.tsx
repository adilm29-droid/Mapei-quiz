import * as React from 'react'
import { Section, Text } from '@react-email/components'
import { EmailLayout, EMAIL_GRADIENT, HeroHeadline, P, PMuted, GradientButton } from './_layout'
import type { EmailGradient } from './_layout'

interface QuizCompletedProps {
  first_name: string
  quiz_title: string
  final_score: number
  max_score: number
  percent: number
  rank_so_far?: number | null
  total_attempts_so_far?: number | null
  xp_earned: number
  new_badges_count: number
  current_streak: number
  review_url: string
  /** Permalink to /api/quiz/{attempt_id}/pdf?variant=user. Renders a
   *  secondary "Download your report" button. Missing → no button. */
  pdf_url?: string | null
}

export default function QuizCompleted({
  first_name,
  quiz_title,
  final_score,
  max_score,
  percent,
  rank_so_far,
  total_attempts_so_far,
  xp_earned,
  new_badges_count,
  current_streak,
  review_url,
  pdf_url,
}: QuizCompletedProps) {
  const grad: EmailGradient =
    percent === 100 ? 'champion' : percent >= 70 ? 'spring' : percent >= 50 ? 'sunset' : 'ember'
  const headline = percent === 100 ? 'Perfect score 🏆' : percent >= 70 ? 'Strong work' : 'Quiz submitted'
  return (
    <EmailLayout preview={`You scored ${final_score} / ${max_score}`} headerStyle={{ background: EMAIL_GRADIENT[grad] }}>
      <HeroHeadline>{headline}</HeroHeadline>
      <P>
        Hi <strong>{first_name}</strong>,
      </P>
      <P>
        You just completed <strong>{quiz_title}</strong>. Here's how it landed:
      </P>

      <Section
        style={{
          background: EMAIL_GRADIENT[grad],
          borderRadius: 14,
          padding: 1,
          marginBottom: 22,
        }}
      >
        <div style={{ background: '#0B1437', borderRadius: 13, padding: 28, textAlign: 'center' }}>
          <Text
            style={{
              margin: 0,
              fontFamily: 'JetBrains Mono, Menlo, Consolas, monospace',
              fontSize: 56,
              fontWeight: 800,
              color: '#ffffff',
              lineHeight: '60px',
            }}
          >
            {final_score} / {max_score}
          </Text>
          <Text style={{ margin: '6px 0 0', color: 'rgba(255,255,255,0.65)', fontSize: 14 }}>
            {percent}%
          </Text>
        </div>
      </Section>

      <table width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'separate', borderSpacing: 8, marginBottom: 22 }}>
        <tbody>
          <tr>
            <Stat label="XP earned" value={`+${xp_earned}`} />
            <Stat label="Day streak" value={current_streak} />
          </tr>
          {(rank_so_far || new_badges_count > 0) && (
            <tr>
              {rank_so_far ? (
                <Stat
                  label={`Rank ${total_attempts_so_far ? `(of ${total_attempts_so_far})` : ''}`}
                  value={`#${rank_so_far}`}
                />
              ) : (
                <Stat label="Status" value="Live ranking soon" />
              )}
              <Stat label="New badges" value={new_badges_count} />
            </tr>
          )}
        </tbody>
      </table>

      <GradientButton href={review_url} gradient={grad}>
        Review your answers →
      </GradientButton>
      {pdf_url ? (
        <div style={{ marginTop: 12 }}>
          <a
            href={pdf_url}
            style={{
              display: 'inline-block',
              padding: '10px 18px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.18)',
              color: '#cbd5e1',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
              letterSpacing: 0.3,
            }}
          >
            ⬇ Download your report (PDF)
          </a>
        </div>
      ) : null}
      <PMuted>
        Leaderboard goes live once 5 staff complete this quiz and 24 hours have passed. We'll
        email you the moment it does.
      </PMuted>
    </EmailLayout>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <td
      width="50%"
      style={{
        background: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: '14px 16px',
      }}
    >
      <Text style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0B1437', lineHeight: '28px', fontFamily: 'JetBrains Mono, monospace' }}>
        {value}
      </Text>
      <Text style={{ margin: '2px 0 0', fontSize: 11, color: '#6b7280', letterSpacing: 1.4, textTransform: 'uppercase' }}>
        {label}
      </Text>
    </td>
  )
}
