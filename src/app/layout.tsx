import './globals.css'
import type { Metadata } from 'next'
import { Manrope, Inter, Inter_Tight, JetBrains_Mono } from 'next/font/google'

// Body font (legacy + general): Manrope
const manrope = Manrope({
  subsets: ['latin'],
  weight: ['200', '300', '400', '500', '600', '700', '800'],
  variable: '--font-manrope',
  display: 'swap',
})

// Display font (per DESIGN_SYSTEM §2): Inter Tight at 700
const interTight = Inter_Tight({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
})

// Body font for new screens (per design): Inter
const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
})

// Numerics: JetBrains Mono — scores, timers, XP
const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Lapiz Blue Quiz',
  description: 'Get sharper. One quiz at a time.',
  icons: { icon: '/favicon.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${interTight.variable} ${inter.variable} ${jetbrains.variable}`}
    >
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
