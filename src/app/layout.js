import './globals.css'

export const metadata = {
  title: 'LapizBlue Staff Quiz',
  description: 'Staff training quiz - Mapei Product Knowledge Assessment',
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body>{children}</body>
    </html>
  )
}
