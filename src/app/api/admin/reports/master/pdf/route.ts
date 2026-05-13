import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guard'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { assembleMasterReport } from '@/lib/reports/master-report'
import { renderMasterReport } from '@/lib/pdf/render'
import { formatUaeDateTime } from '@/lib/utils/timezone'
import { uaeDate } from '@/lib/uae-time'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/reports/master/pdf
 *
 * Admin-only. Pulls the combined master-report data (overall ranking +
 * per-quiz ranking with medals) and streams the rendered PDF.
 */
export async function GET() {
  const guard = await requireAdmin()
  if (guard instanceof NextResponse) return guard

  const supabase = getSupabaseAdmin()
  const data = await assembleMasterReport(supabase)
  const pdf = await renderMasterReport({
    data,
    date_uae: formatUaeDateTime(data.generatedAt),
  })

  const filename = `lapizblue-master-report-${uaeDate(data.generatedAt)}.pdf`
  return new NextResponse(pdf as any, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
