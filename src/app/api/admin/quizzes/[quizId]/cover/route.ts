import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guard'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import {
  processAndUploadQuizCover,
  CoverValidationError,
} from '@/lib/storage/quiz-covers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/quizzes/[quizId]/cover
 * multipart/form-data with file field "cover".
 *
 * Per CLAUDE_CODE_PROMPT.md §17. Resizes via sharp (1200×600 webp q85),
 * stores to public `quiz-covers` bucket, updates quizzes.cover_image_url.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ quizId: string }> },
) {
  const guard = await requireAdmin()
  if (guard instanceof NextResponse) return guard

  const { quizId } = await context.params
  const supabase = getSupabaseAdmin()

  let buffer: Buffer
  try {
    const form = await request.formData()
    const file = form.get('cover')
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: '`cover` field is required' }, { status: 400 })
    }
    buffer = Buffer.from(await file.arrayBuffer())
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Invalid form data' }, { status: 400 })
  }

  try {
    const { cover_image_url } = await processAndUploadQuizCover(supabase, quizId, buffer)
    await supabase
      .from('quizzes')
      .update({ cover_image_url, updated_at: new Date().toISOString() })
      .eq('id', quizId)
    return NextResponse.json({ data: { cover_image_url }, error: null })
  } catch (e: any) {
    if (e instanceof CoverValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 })
    }
    console.error('[admin/cover] error:', e)
    return NextResponse.json({ error: e?.message || 'Upload failed' }, { status: 500 })
  }
}
