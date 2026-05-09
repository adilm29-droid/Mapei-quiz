import * as React from 'react'
import { Section, Text } from '@react-email/components'
import { EmailLayout, EMAIL_GRADIENT, HeroHeadline, P, PMuted, GradientButton } from './_layout'

/**
 * End-of-day digest email per CLAUDE_CODE_PROMPT.md §13.
 *
 * Content:
 *   - For each quiz that had its first-ever leaderboard completion today
 *     (UAE TZ): top 10 + the recipient's own rank
 *   - Today's top 3 XP gainers across all quizzes
 *
 * Single email per user per day. Idempotency enforced via email_log.
 */

interface DigestQuiz {
  quiz_id: string
  title: string
  top10: { rank: number; name: string; score: number; max_score: number }[]
  user_rank: number | null
}

interface DigestProps {
  first_name: string
  date_uae: string                     // formatted "08 May 2026"
  quizzes: DigestQuiz[]                // freshly-revealed quizzes (may be empty)
  top_xp_today: { name: string; xp: number }[]   // top 3 by XP gain today
  leaderboard_url: string
  home_url: string
}

export default function Digest({
  first_name,
  date_uae,
  quizzes,
  top_xp_today,
  leaderboard_url,
  home_url,
}: DigestProps) {
  return (
    <EmailLayout
      preview={`Today's Lapiz Blue Quiz roundup · ${date_uae}`}
      headerStyle={{ background: EMAIL_GRADIENT.aurora }}
    >
      <HeroHeadline>Today&apos;s roundup</HeroHeadline>
      <P>
        Hi <strong>{first_name}</strong>,
      </P>
      <P>Here&apos;s what happened on Lapiz Blue Quiz today, {date_uae}.</P>

      {quizzes.length > 0 ? (
        quizzes.map(q => (
          <Section
            key={q.quiz_id}
            style={{
              background: '#0B1437',
              borderRadius: 14,
              padding: 20,
              marginBottom: 16,
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <Text style={{ margin: 0, color: '#cbd5e1', fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase' }}>
              New leaderboard activity
            </Text>
            <Text style={{ margin: '4px 0 14px', color: '#fff', fontSize: 18, fontWeight: 700 }}>
              {q.title}
            </Text>
            <table width="100%" cellPadding={0} cellSpacing={0}>
              <tbody>
                {q.top10.map(row => (
                  <tr key={row.rank}>
                    <td
                      style={{
                        padding: '6px 0',
                        color: '#94a3b8',
                        fontSize: 12,
                        width: 28,
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    >
                      #{row.rank}
                    </td>
                    <td style={{ padding: '6px 0', color: '#e2e8f0', fontSize: 13 }}>{row.name}</td>
                    <td
                      style={{
                        padding: '6px 0',
                        color: '#fff',
                        fontSize: 13,
                        textAlign: 'right',
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    >
                      {row.score}/{row.max_score}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {q.user_rank ? (
              <Text style={{ margin: '12px 0 0', color: '#fbbf24', fontSize: 12 }}>
                Your rank: #{q.user_rank}
              </Text>
            ) : (
              <Text style={{ margin: '12px 0 0', color: '#94a3b8', fontSize: 12 }}>
                You haven&apos;t completed this one yet — give it a go.
              </Text>
            )}
          </Section>
        ))
      ) : (
        <PMuted>No new leaderboards revealed today.</PMuted>
      )}

      {top_xp_today.length > 0 ? (
        <Section
          style={{
            background: '#0B1437',
            borderRadius: 14,
            padding: 20,
            marginBottom: 16,
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <Text
            style={{
              margin: 0,
              color: '#cbd5e1',
              fontSize: 11,
              letterSpacing: 1.4,
              textTransform: 'uppercase',
            }}
          >
            Today&apos;s top XP earners
          </Text>
          <table width="100%" cellPadding={0} cellSpacing={0} style={{ marginTop: 8 }}>
            <tbody>
              {top_xp_today.map((u, i) => (
                <tr key={i}>
                  <td style={{ padding: '6px 0', width: 28, color: '#94a3b8', fontSize: 12 }}>
                    #{i + 1}
                  </td>
                  <td style={{ padding: '6px 0', color: '#e2e8f0', fontSize: 13 }}>{u.name}</td>
                  <td
                    style={{
                      padding: '6px 0',
                      color: '#10b981',
                      fontSize: 13,
                      textAlign: 'right',
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                  >
                    +{u.xp} XP
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      ) : null}

      <GradientButton href={leaderboard_url} gradient="aurora">
        See the leaderboards →
      </GradientButton>
      <PMuted>
        Or jump back into <a href={home_url} style={{ color: '#cbd5e1' }}>Home</a> to take this
        week&apos;s quiz.
      </PMuted>
    </EmailLayout>
  )
}
