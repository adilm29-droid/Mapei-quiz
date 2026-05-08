import * as React from 'react'
import { Section, Text } from '@react-email/components'
import { EmailLayout, EMAIL_GRADIENT, HeroHeadline, P, PMuted, GradientButton } from './_layout'
import type { EmailGradient } from './_layout'

interface Top3FinisherProps {
  first_name: string
  quiz_title: string
  rank: 1 | 2 | 3
  final_score: number
  max_score: number
  leaderboard_url: string
}

const RANK_LABEL = { 1: 'CHAMPION 👑', 2: 'SILVER 🥈', 3: 'BRONZE 🥉' } as const
const RANK_GRADIENT: Record<1 | 2 | 3, EmailGradient> = {
  1: 'champion',
  2: 'spring',
  3: 'sunset',
}
const RANK_HEADLINE = {
  1: 'You took the crown',
  2: 'Silver medal — just a step from #1',
  3: 'Bronze on the podium',
} as const

export default function Top3Finisher({
  first_name,
  quiz_title,
  rank,
  final_score,
  max_score,
  leaderboard_url,
}: Top3FinisherProps) {
  return (
    <EmailLayout
      preview={`You placed #${rank} on ${quiz_title}`}
      headerStyle={{ background: EMAIL_GRADIENT[RANK_GRADIENT[rank]] }}
    >
      <HeroHeadline>{RANK_HEADLINE[rank]}</HeroHeadline>
      <P>
        Hi <strong>{first_name}</strong>,
      </P>
      <P>
        The leaderboard for <strong>{quiz_title}</strong> is live — and you placed in the top three.
      </P>

      <Section
        style={{
          background: EMAIL_GRADIENT[RANK_GRADIENT[rank]],
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
              fontSize: 18,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.9)',
              letterSpacing: 4,
            }}
          >
            {RANK_LABEL[rank]}
          </Text>
          <Text
            style={{
              margin: '12px 0 0',
              fontFamily: 'JetBrains Mono, Menlo, Consolas, monospace',
              fontSize: 64,
              fontWeight: 800,
              color: '#ffffff',
              lineHeight: '64px',
            }}
          >
            #{rank}
          </Text>
          <Text style={{ margin: '12px 0 0', color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
            {final_score} / {max_score} points
          </Text>
        </div>
      </Section>

      <GradientButton href={leaderboard_url} gradient={RANK_GRADIENT[rank]}>
        See the full leaderboard →
      </GradientButton>
      <PMuted>
        {rank === 1
          ? 'Defend the crown next week.'
          : rank === 2
          ? '#1 is in striking distance.'
          : 'Keep climbing — you have the momentum.'}
      </PMuted>
    </EmailLayout>
  )
}
