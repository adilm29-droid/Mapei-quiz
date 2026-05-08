import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components'
import * as React from 'react'

interface EmailLayoutProps {
  preview: string
  /** Tailwind class for the gradient header (e.g. 'bg-gradient-aurora'). Use AURORA_BG / CHAMPION_BG / etc. style strings instead since email CSS is inline. */
  headerStyle?: React.CSSProperties
  children: React.ReactNode
}

// Email gradients as inline-style strings (Tailwind classes don't render in
// most clients reliably; we use react-email's Tailwind for layout but always
// pin colors via inline `style`).
export const EMAIL_GRADIENT = {
  aurora:   'linear-gradient(135deg, #06B6D4 0%, #8B5CF6 100%)',
  sunset:   'linear-gradient(135deg, #EC4899 0%, #F97316 100%)',
  champion: 'linear-gradient(135deg, #FCD34D 0%, #F59E0B 100%)',
  spring:   'linear-gradient(135deg, #34D399 0%, #06B6D4 100%)',
  ember:    'linear-gradient(135deg, #EF4444 0%, #EC4899 100%)',
  plasma:   'linear-gradient(135deg, #A855F7 0%, #EC4899 50%, #F97316 100%)',
} as const

export type EmailGradient = keyof typeof EMAIL_GRADIENT

const TOKENS = {
  bgPage: '#f4f5f7',
  cardBg: '#ffffff',
  cardBorder: '#e5e7eb',
  text: '#111827',
  textSoft: '#374151',
  textMuted: '#6b7280',
  textFaint: '#9ca3af',
  midnight: '#0B1437',
} as const

/**
 * Standard email container per DESIGN_SYSTEM §11.
 * - 600px wide centered
 * - Gradient header (varies by template)
 * - White card body
 * - Grey footer with brand name
 *
 * Each template wraps its content with this. Children render inside the
 * white body card.
 */
export function EmailLayout({ preview, headerStyle, children }: EmailLayoutProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind>
        <Body style={{ margin: 0, padding: 0, background: TOKENS.bgPage, fontFamily: "Inter, Arial, Helvetica, sans-serif" }}>
          <Container style={{ maxWidth: 600, padding: '24px 0' }}>
            <Section
              style={{
                background: headerStyle?.background ?? EMAIL_GRADIENT.aurora,
                padding: '32px 32px 28px',
                borderRadius: '16px 16px 0 0',
                textAlign: 'center',
              }}
            >
              <Text
                style={{
                  margin: 0,
                  fontSize: 22,
                  fontWeight: 800,
                  color: '#ffffff',
                  letterSpacing: 2,
                }}
              >
                LAPIZ BLUE
              </Text>
              <Text
                style={{
                  margin: '4px 0 0',
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.65)',
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                }}
              >
                Quiz
              </Text>
            </Section>

            <Section
              style={{
                background: TOKENS.cardBg,
                padding: '32px',
                borderLeft: `1px solid ${TOKENS.cardBorder}`,
                borderRight: `1px solid ${TOKENS.cardBorder}`,
              }}
            >
              {children}
            </Section>

            <Section
              style={{
                background: '#f9fafb',
                padding: '20px 32px',
                borderRadius: '0 0 16px 16px',
                border: `1px solid ${TOKENS.cardBorder}`,
                borderTop: 'none',
                textAlign: 'center',
              }}
            >
              <Text style={{ margin: 0, fontSize: 11, color: TOKENS.textFaint }}>
                Lapiz Blue General Trading LLC · Sales Training Platform
              </Text>
              <Text style={{ margin: '4px 0 0', fontSize: 10, color: '#d1d5db' }}>
                © 2026 Lapiz Blue. All rights reserved.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

// ── Reusable building blocks ───────────────────────────────────────────

interface GradientButtonProps {
  href: string
  gradient?: EmailGradient
  children: React.ReactNode
}

export function GradientButton({ href, gradient = 'aurora', children }: GradientButtonProps) {
  return (
    <Section style={{ margin: '4px 0 16px', textAlign: 'center' }}>
      <a
        href={href}
        style={{
          display: 'inline-block',
          background: EMAIL_GRADIENT[gradient],
          color: '#ffffff',
          textDecoration: 'none',
          fontWeight: 700,
          fontSize: 15,
          padding: '14px 36px',
          borderRadius: 12,
          letterSpacing: 0.4,
        }}
      >
        {children}
      </a>
    </Section>
  )
}

interface KeyValueRowProps {
  label: string
  value: string
  isLast?: boolean
}

export function KeyValueRow({ label, value, isLast }: KeyValueRowProps) {
  const borderBottom = isLast ? 'none' : '1px solid #e5e7eb'
  return (
    <table width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'collapse' }}>
      <tbody>
        <tr>
          <td style={{ padding: '10px 16px', color: TOKENS.textMuted, fontSize: 13, borderBottom, width: '40%' }}>
            {label}
          </td>
          <td style={{ padding: '10px 16px', fontWeight: 600, color: TOKENS.text, fontSize: 14, borderBottom }}>
            {value}
          </td>
        </tr>
      </tbody>
    </table>
  )
}

interface CredentialsBlockProps {
  username: string
  password: string
}

export function CredentialsBlock({ username, password }: CredentialsBlockProps) {
  return (
    <Section
      style={{
        background: EMAIL_GRADIENT.aurora,
        borderRadius: 14,
        padding: 1,
        margin: '0 0 20px',
      }}
    >
      <div
        style={{
          background: TOKENS.midnight,
          borderRadius: 13,
          padding: 24,
        }}
      >
        <Text style={{ margin: 0, color: 'rgba(255,255,255,0.55)', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' }}>
          Username
        </Text>
        <Text
          style={{
            margin: '6px 0 18px',
            color: '#ffffff',
            fontFamily: 'JetBrains Mono, Menlo, Consolas, monospace',
            fontSize: 18,
            fontWeight: 600,
          }}
        >
          {username}
        </Text>
        <Text style={{ margin: 0, color: 'rgba(255,255,255,0.55)', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' }}>
          Temporary Password
        </Text>
        <Text
          style={{
            margin: '6px 0 0',
            color: '#ffffff',
            fontFamily: 'JetBrains Mono, Menlo, Consolas, monospace',
            fontSize: 18,
            fontWeight: 600,
          }}
        >
          {password}
        </Text>
      </div>
    </Section>
  )
}

export const EMAIL_TEXT = {
  text: TOKENS.text,
  textSoft: TOKENS.textSoft,
  textMuted: TOKENS.textMuted,
  textFaint: TOKENS.textFaint,
}

interface HeroHeadlineProps {
  emoji?: string
  children: React.ReactNode
}

/** First line of the body — h1, white-on-light card */
export function HeroHeadline({ emoji, children }: HeroHeadlineProps) {
  return (
    <Text style={{ margin: '0 0 16px', fontSize: 22, fontWeight: 700, color: TOKENS.text, lineHeight: '30px' }}>
      {emoji ? `${emoji} ` : ''}{children}
    </Text>
  )
}

/** Body paragraph */
export function P({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ margin: '0 0 16px', fontSize: 15, lineHeight: '24px', color: TOKENS.textSoft }}>
      {children}
    </Text>
  )
}

/** Subtle/footer-style paragraph */
export function PMuted({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ margin: 0, fontSize: 13, color: TOKENS.textMuted, lineHeight: '20px' }}>
      {children}
    </Text>
  )
}

export function Divider() {
  return <Hr style={{ borderColor: TOKENS.cardBorder, margin: '20px 0' }} />
}
