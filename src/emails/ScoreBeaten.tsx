import * as React from 'react'
import { Section, Text } from '@react-email/components'
import { EmailLayout, EMAIL_GRADIENT, HeroHeadline, P, PMuted, GradientButton } from './_layout'

interface ScoreBeatenProps {
  first_name: string
  rival_name: string
  quiz_title: string
  your_score: number
  rival_score: number
  max_score: number
  quiz_url: string
}

export default function ScoreBeaten({
  first_name,
  rival_name,
  quiz_title,
  your_score,
  rival_score,
  max_score,
  quiz_url,
}: ScoreBeatenProps) {
  const gap = rival_score - your_score
  return (
    <EmailLayout
      preview={`${rival_name} just beat your score on ${quiz_title}`}
      headerStyle={{ background: EMAIL_GRADIENT.ember }}
    >
      <HeroHeadline emoji="⚡">Someone just beat your score</HeroHeadline>
      <P>
        Hi <strong>{first_name}</strong>,
      </P>
      <P>
        <strong>{rival_name}</strong> just submitted <strong>{rival_score} / {max_score}</strong> on{' '}
        <em>{quiz_title}</em> — that's <strong>{gap}</strong> {gap === 1 ? 'point' : 'points'} ahead of
        your <strong>{your_score} / {max_score}</strong>.
      </P>

      <Section
        style={{
          background: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          padding: 18,
          marginBottom: 22,
        }}
      >
        <table width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ padding: '6px 0', fontSize: 13, color: '#6b7280' }}>You</td>
              <td
                style={{
                  padding: '6px 0',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 700,
                  color: '#111827',
                  textAlign: 'right',
                }}
              >
                {your_score}
              </td>
            </tr>
            <tr style={{ borderTop: '1px solid #e5e7eb' }}>
              <td style={{ padding: '6px 0', fontSize: 13, color: '#EF4444', fontWeight: 600 }}>
                {rival_name}
              </td>
              <td
                style={{
                  padding: '6px 0',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 700,
                  color: '#EF4444',
                  textAlign: 'right',
                }}
              >
                {rival_score}
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <GradientButton href={quiz_url} gradient="ember">
        Take it again — reclaim the lead →
      </GradientButton>
      <PMuted>You still have an attempt left. Don't let the lead get away.</PMuted>
    </EmailLayout>
  )
}
