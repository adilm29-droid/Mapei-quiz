import * as React from 'react'
import { Section, Text } from '@react-email/components'
import { EmailLayout, EMAIL_GRADIENT, HeroHeadline, P, GradientButton } from './_layout'

interface WeeklyRecapProps {
  first_name: string
  quizzes_completed: number
  xp_earned: number
  current_streak: number
  badges_earned_this_week: number
  rank_change?: number | null
  home_url: string
}

export default function WeeklyRecap({
  first_name,
  quizzes_completed,
  xp_earned,
  current_streak,
  badges_earned_this_week,
  rank_change,
  home_url,
}: WeeklyRecapProps) {
  return (
    <EmailLayout
      preview="Your week in numbers"
      headerStyle={{ background: EMAIL_GRADIENT.aurora }}
    >
      <HeroHeadline emoji="📊">Your week in numbers</HeroHeadline>
      <P>
        Hi <strong>{first_name}</strong>,
      </P>
      <P>Here's how the past 7 days went:</P>

      <Section style={{ marginBottom: 24 }}>
        <table width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'separate', borderSpacing: 8 }}>
          <tbody>
            <tr>
              <Stat label="Quizzes" value={quizzes_completed} accent="#06B6D4" />
              <Stat label="XP earned" value={`+${xp_earned}`} accent="#8B5CF6" />
            </tr>
            <tr>
              <Stat label="Day streak" value={current_streak} accent="#EC4899" />
              <Stat label="Badges" value={badges_earned_this_week} accent="#FCD34D" />
            </tr>
          </tbody>
        </table>
      </Section>

      {rank_change !== undefined && rank_change !== null && rank_change !== 0 && (
        <P>
          {rank_change > 0
            ? `📈 You climbed ${rank_change} spots on the All-Time leaderboard.`
            : `📉 You slipped ${Math.abs(rank_change)} spots — time to bounce back.`}
        </P>
      )}

      <GradientButton href={home_url} gradient="aurora">
        See the full picture →
      </GradientButton>
    </EmailLayout>
  )
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string
  value: number | string
  accent: string
}) {
  return (
    <td
      width="50%"
      style={{
        background: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: '18px 16px',
      }}
    >
      <Text
        style={{
          margin: 0,
          fontFamily: 'JetBrains Mono, Menlo, Consolas, monospace',
          fontSize: 28,
          fontWeight: 800,
          color: accent,
          lineHeight: '32px',
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          margin: '4px 0 0',
          fontSize: 11,
          color: '#6b7280',
          letterSpacing: 1.4,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
    </td>
  )
}
