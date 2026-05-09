import sharp from 'sharp'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Avatar upload pipeline.
 * - Validates magic bytes via sharp's metadata reader (don't trust extensions)
 * - Center-crop square → 512×512 → webp q85
 * - Stores at avatars/{user_id}.webp in the public `avatars` bucket
 * - Returns the public URL
 */

const MAX_INPUT_BYTES = 2 * 1024 * 1024

export class AvatarValidationError extends Error {}

export async function processAndUploadAvatar(
  supabase: SupabaseClient,
  userId: string,
  fileBuffer: Buffer,
  declaredMime?: string,
): Promise<{ avatar_url: string }> {
  if (fileBuffer.byteLength > MAX_INPUT_BYTES) {
    throw new AvatarValidationError('Image is larger than 2 MB')
  }

  // Reject non-image bytes immediately.
  let img: sharp.Sharp
  let meta: sharp.Metadata
  try {
    img = sharp(fileBuffer)
    meta = await img.metadata()
  } catch {
    throw new AvatarValidationError('Could not read image — file may be corrupt or not an image')
  }
  if (!meta.format || !['jpeg', 'jpg', 'png', 'webp', 'avif'].includes(meta.format)) {
    throw new AvatarValidationError(`Unsupported image format: ${meta.format ?? 'unknown'}`)
  }
  // declaredMime is informational only — magic bytes via sharp are authoritative
  void declaredMime

  // Center-square crop, then resize to 512×512 webp q85
  const processed = await img
    .resize(512, 512, { fit: 'cover', position: 'centre' })
    .webp({ quality: 85 })
    .toBuffer()

  const path = `${userId}.webp`
  const { error: uploadErr } = await supabase.storage
    .from('avatars')
    .upload(path, processed, {
      contentType: 'image/webp',
      cacheControl: '3600',
      upsert: true,
    })
  if (uploadErr) {
    throw new Error(`Avatar upload failed: ${uploadErr.message}`)
  }

  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  // Add a cache-busting query so browsers refresh after re-upload
  return { avatar_url: `${data.publicUrl}?v=${Date.now()}` }
}
