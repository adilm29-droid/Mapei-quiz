import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * Server-only Supabase client using the service-role key.
 * Bypasses RLS — never import this from a 'use client' file or any
 * code that ships to the browser.
 *
 * Lazy-initialized so a missing env var only blows up when a route
 * actually tries to use it (not at module-import time during build).
 *
 * Typed with the generated `Database` schema — query results auto-infer
 * their Row shape (no more `(row as any).foo`). Regenerate
 * `src/types/database.ts` after every schema change:
 *
 *   curl -H "Authorization: Bearer $TOKEN" \
 *     https://api.supabase.com/v1/projects/<ref>/types/typescript \
 *     | node -e "process.stdout.write(JSON.parse(require('fs').readFileSync(0,'utf8')).types)" \
 *     > src/types/database.ts
 */
export type SupabaseAdmin = SupabaseClient<Database>

let cached: SupabaseAdmin | null = null

export function getSupabaseAdmin(): SupabaseAdmin {
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

  cached = createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return cached
}
