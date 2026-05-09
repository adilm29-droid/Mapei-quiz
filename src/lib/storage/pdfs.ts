import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Upload a rendered PDF to the private `quiz-pdfs` bucket.
 * Path convention: `{user_id}/{attempt_id}.pdf`. Storage RLS lets users
 * read their own folder; admins read any.
 */
export async function uploadAttemptPdf(
  supabase: SupabaseClient,
  userId: string,
  attemptId: string,
  pdf: Buffer,
): Promise<{ pdf_url: string; storage_path: string }> {
  const storagePath = `${userId}/${attemptId}.pdf`

  const { error: uploadErr } = await supabase.storage
    .from('quiz-pdfs')
    .upload(storagePath, pdf, {
      contentType: 'application/pdf',
      cacheControl: 'no-store',
      upsert: true,
    })
  if (uploadErr) throw new Error(`PDF upload failed: ${uploadErr.message}`)

  // Bucket is private — store the path; signed URLs are minted on demand
  // by the /api/quiz/[attemptId]/pdf route.
  return { pdf_url: storagePath, storage_path: storagePath }
}

/**
 * Mint a 60-minute signed URL for a stored PDF, or fetch the bytes
 * directly so a route handler can stream them. Caller decides which.
 */
export async function streamAttemptPdf(
  supabase: SupabaseClient,
  storagePath: string,
): Promise<Buffer> {
  const { data, error } = await supabase.storage.from('quiz-pdfs').download(storagePath)
  if (error || !data) throw new Error(`PDF download failed: ${error?.message ?? 'no data'}`)
  const arr = await data.arrayBuffer()
  return Buffer.from(arr)
}
