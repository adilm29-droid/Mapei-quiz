import { cn } from '@/lib/utils'
import { LogoMark } from './LogoMark'
import { LogoWordmark } from './LogoWordmark'

interface LogoFullProps {
  className?: string
  markClassName?: string
  wordmarkClassName?: string
  spinMark?: boolean
}

export function LogoFull({ className, markClassName, wordmarkClassName, spinMark = false }: LogoFullProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <LogoMark spin={spinMark} className={cn('h-9 w-9', markClassName)} />
      <span className="block h-7 w-px bg-white/40" aria-hidden />
      <LogoWordmark className={cn('h-7 w-auto', wordmarkClassName)} />
    </div>
  )
}
