import './globals.css'
import type { Metadata } from 'next'
import localFont from 'next/font/local'

// Fonts are self-hosted (src/fonts, latin variable woff2) so builds never
// depend on fetching Google Fonts — that fetch intermittently failed on Vercel.

// Body font (legacy + general): Manrope
const manrope = localFont({
  src: '../fonts/manrope.woff2',
  weight: '200 800',
  variable: '--font-manrope',
  display: 'swap',
})

// Display font (per DESIGN_SYSTEM §2): Inter Tight at 700
const interTight = localFont({
  src: '../fonts/inter-tight.woff2',
  weight: '600 800',
  variable: '--font-display',
  display: 'swap',
})

// Body font for new screens (per design): Inter
const inter = localFont({
  src: '../fonts/inter.woff2',
  weight: '300 700',
  variable: '--font-sans',
  display: 'swap',
})

// Numerics: JetBrains Mono — scores, timers, XP
const jetbrains = localFont({
  src: '../fonts/jetbrains-mono.woff2',
  weight: '400 700',
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
