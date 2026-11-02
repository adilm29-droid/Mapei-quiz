import Link from 'next/link'
import { HeartHandshake, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Entry to the HR Colleague Feedback Survey from the sign-in screens. */
export function HrSurveyButton({ className }: { className?: string }) {
  return (
    <Link
      href="/survey"
      prefetch={false}
      className={cn(
        'group inline-flex items-center gap-3 rounded-full border border-white/25 bg-white/10 px-6 py-3.5',
        'text-sm font-semibold tracking-wide text-white shadow-[0_8px_30px_-12px_rgba(244,166,193,0.45)] backdrop-blur-md',
        'transition-all duration-200 ease-out',
        'hover:scale-110 hover:border-[#F4A6C1] hover:bg-[#F4A6C1] hover:text-[#3B1B47] hover:shadow-[0_12px_40px_-8px_rgba(244,166,193,0.8)]',
        'focus-visible:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4A6C1] focus-visible:ring-offset-2 focus-visible:ring-offset-[#06122e]',
        'active:scale-105 motion-reduce:transition-none motion-reduce:hover:scale-100',
        className,
      )}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F4A6C1]/25 text-[#F9C6D8] transition-colors group-hover:bg-white/60 group-hover:text-[#B0306A]">
        <HeartHandshake className="h-4 w-4" />
      </span>
      <span className="flex flex-col items-start leading-tight">
        <span>HR Feedback Survey</span>
        <span className="text-[11px] font-medium tracking-normal text-white/60 transition-colors group-hover:text-[#5B2A66]">
          Staff · takes 2 minutes
        </span>
      </span>
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
    </Link>
  )
}
