import { redirect } from 'next/navigation'

/**
 * /dashboard is the legacy post-login landing. The new podium-centric home
 * lives at /home. This file just bounces traffic over so old links keep working.
 */
export default function DashboardRedirect() {
  redirect('/home')
}
