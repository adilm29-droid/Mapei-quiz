import sharp from 'sharp'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Quiz cover upload pipeline.
 * - Magic-byte validation
 * - cover-resize 1200×600 → webp q85
 * - Stored at quiz-covers/{quiz_id}.webp in the public `quiz-covers` bucket
 */

const MAX_INPUT_BYTES = 2 * 1024 * 1024

export class CoverValidationError extends Error {}

export async function processAndUploadQuizCover(
  supabase: SupabaseClient,
  quizId: string,
  fileBuffer: Buffer,
): Promise<{ cover_image_url: string }> {
  if (fileBuffer.byteLength > MAX_INPUT_BYTES) {
    throw new CoverValidationError('Image is larger than 2 MB')
  }

  let img: sharp.Sharp
  let meta: sharp.Metadata
  try {
    img = sharp(fileBuffer)
    meta = await img.metadata()
  } catch {
    throw new CoverValidationError('Could not read image — file may be corrupt or not an image')
  }
  if (!meta.format || !['jpeg', 'jpg', 'png', 'webp', 'avif'].includes(meta.format)) {
    throw new CoverValidationError(`Unsupported image format: ${meta.format ?? 'unknown'}`)
  }

  const processed = await img
    .resize(1200, 600, { fit: 'cover', position: 'centre' })
    .webp({ quality: 85 })
    .toBuffer()

  const path = `${quizId}.webp`
  const { error: uploadErr } = await supabase.storage
    .from('quiz-covers')
    .upload(path, processed, {
      contentType: 'image/webp',
      cacheControl: '3600',
      upsert: true,
    })
  if (uploadErr) throw new Error(`Cover upload failed: ${uploadErr.message}`)

  const { data } = supabase.storage.from('quiz-covers').getPublicUrl(path)
  return { cover_image_url: `${data.publicUrl}?v=${Date.now()}` }
}
