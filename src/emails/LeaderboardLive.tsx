import * as React from 'react'
import { Section, Text } from '@react-email/components'
import { EmailLayout, EMAIL_GRADIENT, HeroHeadline, P, GradientButton } from './_layout'

interface PodiumRow {
  rank: 1 | 2 | 3
  name: string
  score: number
}

interface LeaderboardLiveProps {
  first_name: string
  quiz_title: string
  week_number: number
  podium: PodiumRow[]
  user_rank?: number | null
  leaderboard_url: string
}

const RANK_COLOR = {
  1: '#FCD34D',
  2: '#CBD5E1',
  3: '#D97706',
} as const

export default function LeaderboardLive({
  first_name,
  quiz_title,
  week_number,
  podium,
  user_rank,
  leaderboard_url,
}: LeaderboardLiveProps) {
  return (
    <EmailLayout
      preview={`Week ${week_number} leaderboard is live`}
      headerStyle={{ background: EMAIL_GRADIENT.champion }}
    >
      <HeroHeadline emoji="🏆">Week {week_number} leaderboard is live</HeroHeadline>
      <P>
        Hi <strong>{first_name}</strong>,
      </P>
      <P>
        The results are in for <strong>{quiz_title}</strong>. Here's the podium:
      </P>

      <Section
        style={{
          background: 'linear-gradient(135deg, rgba(252,211,77,0.06), rgba(245,158,11,0.04))',
          border: '1px solid #e5e7eb',
          borderRadius: 14,
          padding: 20,
          marginBottom: 22,
        }}
      >
        {podium.map((row, i) => (
          <table
            key={i}
            width="100%"
            cellPadding={0}
            cellSpacing={0}
            style={{
              borderCollapse: 'collapse',
              borderBottom: i < podium.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
            }}
          >
            <tbody>
              <tr>
                <td style={{ width: 48, padding: '10px 0' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: RANK_COLOR[row.rank],
                      color: '#0B1437',
                      fontSize: 14,
                      fontWeight: 800,
                    }}
                  >
                    {row.rank}
                  </span>
                </td>
                <td style={{ padding: '10px 0', fontSize: 15, color: '#111827', fontWeight: 600 }}>
                  {row.name}
                </td>
                <td
                  style={{
                    padding: '10px 0',
                    fontFamily: 'JetBrains Mono, Menlo, Consolas, monospace',
                    fontSize: 16,
                    fontWeight: 700,
                    color: '#0B1437',
                    textAlign: 'right',
                  }}
                >
                  {row.score}
                </td>
              </tr>
            </tbody>
          </table>
        ))}
      </Section>

      {user_rank && user_rank > 3 && (
        <Text style={{ margin: '0 0 16px', fontSize: 13, color: '#6b7280' }}>
          You finished at <strong style={{ color: '#111827' }}>#{user_rank}</strong>. See where you
          landed and who's next to catch:
        </Text>
      )}

      <GradientButton href={leaderboard_url} gradient="champion">
        See where you ranked →
      </GradientButton>
    </EmailLayout>
  )
}
