/**
 * The static gallery of avatar photos staff can pick from on first login.
 * Files live in /public/avatars/. Server validates picks against this list
 * so users can't set arbitrary URLs.
 */
export const AVATAR_GALLERY = [
  '/avatars/Anjali.jpeg',
  '/avatars/Daniyal.jpeg',
  '/avatars/Dayem.jpeg',
  '/avatars/Hamdan.jpeg',
  '/avatars/Mudassir.jpeg',
  '/avatars/Vanessa.jpeg',
  '/avatars/Mystery.jpeg',
] as const

export type AvatarUrl = (typeof AVATAR_GALLERY)[number]

export function isValidAvatarUrl(url: string): boolean {
  return (AVATAR_GALLERY as readonly string[]).includes(url)
}
