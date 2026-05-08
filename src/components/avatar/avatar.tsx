'use client'

import * as React from 'react'
import Image from 'next/image'
import { Crown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { gradientFromString, initialsFor, type AvatarGradient } from '@/lib/gradient-from-string'

/**
 * Avatar — placeholder per DESIGN_SYSTEM §5 v1.
 * Circle with deterministic gradient + initials. Crown overlay when champion.
 * Pulsing aurora ring when this is the current user's own avatar.
 */

const SIZE = {
  sm: 32,
  md: 48,
  lg: 80,
  xl: 120,
} as const

export type AvatarSize = keyof typeof SIZE

const TEXT_SIZE = {
  sm: 'text-[12px]',
  md: 'text-[16px]',
  lg: 'text-[24px] font-bold',
  xl: 'text-[36px] font-bold',
} as const

const CROWN_SIZE = {
  sm: 14,
  md: 20,
  lg: 30,
  xl: 44,
} as const

export interface AvatarProps {
  /** Used to pick the deterministic gradient + initials fallback */
  username: string
  first_name?: string | null
  last_name?: string | null
  /** Overrides initials if set */
  text?: string
  /** Photo URL — when present, replaces the initials placeholder */
  src?: string | null
  size?: AvatarSize
  /** Show crown overlay (#1) */
  champion?: boolean
  /** Show pulsing aurora ring (this is the current user) */
  isSelf?: boolean
  /** Override the deterministic gradient */
  gradient?: AvatarGradient
  className?: string
}

export function Avatar({
  username,
  first_name,
  last_name,
  text,
  src,
  size = 'md',
  champion,
  isSelf,
  gradient,
  className,
}: AvatarProps) {
  const px = SIZE[size]
  const grad = gradient ?? gradientFromString(username)
  const initials = text ?? initialsFor({ first_name, last_name, username })

  return (
    <span
      className={cn('relative inline-flex shrink-0', className)}
      style={{ width: px, height: px }}
    >
      {isSelf && (
        <span
          aria-hidden
          className="absolute inset-0 -m-[3px] animate-pulse-aurora rounded-full"
          style={{
            boxShadow: '0 0 0 2px rgba(167,139,250,0.85)',
          }}
        />
      )}

      <span
        className={cn(
          'relative flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-white/12 text-whitex-soft',
          `bg-gradient-${grad}`,
          TEXT_SIZE[size],
        )}
      >
        {src ? (
          <Image
            src={src}
            alt={`${username}'s avatar`}
            fill
            sizes={`${px}px`}
            className="object-cover"
          />
        ) : (
          <span className="font-display select-none tracking-tight" style={{ letterSpacing: '-0.02em' }}>
            {initials}
          </span>
        )}
      </span>

      {champion && (
        <span
          aria-hidden
          className="absolute left-1/2 -translate-x-1/2 animate-crown-bob"
          style={{ top: -CROWN_SIZE[size] * 0.55 }}
        >
          <Crown
            size={CROWN_SIZE[size]}
            className="rotate-[-8deg] fill-[#FCD34D] text-[#F59E0B] drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]"
          />
        </span>
      )}
    </span>
  )
}
