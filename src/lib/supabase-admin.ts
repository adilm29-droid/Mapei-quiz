import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * Server-only Supabase client using the service-role key.
 * Bypasses RLS — never import this from a 'use client' file or any
 * code that ships to the browser.
 *
 * Lazy-initialized so a missing env var only blows up when a route
 * actually tries to use it (not at module-import time during build).
 */
let cached: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) {
    throw new Error('Server misconfigured: NEXT_PUBLIC_SUPABASE_URL is not set')
  }
  if (!serviceKey) {
    throw new Error(
      'Server misconfigured: SUPABASE_SERVICE_ROLE_KEY is not set. ' +
        'Add it to .env.local locally and to Vercel Project Settings → Environment Variables.',
    )
  }

  cached = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return cached
}
