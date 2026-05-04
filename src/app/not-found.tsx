import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center gap-6 bg-[#040a1c] px-6 text-center">
      <h1 className="font-sans text-5xl font-bold tracking-tight text-white">404</h1>
      <p className="text-sm uppercase tracking-[0.3em] text-white/50">Page not found</p>
      <Link
        href="/"
        className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#040a1c] transition-colors hover:bg-white/90"
      >
        Back to home
      </Link>
    </main>
  )
}
