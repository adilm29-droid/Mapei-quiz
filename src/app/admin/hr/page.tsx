import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { HrClient } from './_components/hr-client'

export const dynamic = 'force-dynamic'

export default async function HrSurveyPage() {
  const supabase = getSupabaseAdmin()
  const [responses, setting] = await Promise.all([
    supabase.from('hr_responses').select('*').order('created_at', { ascending: false }).limit(5000),
    supabase.from('hr_settings').select('value').eq('key', 'passcode').maybeSingle(),
  ])

  if (responses.error) {
    return (
      <div className="rounded-2xl border border-danger/30 bg-danger/10 p-6 text-caption text-danger">
        Failed to load survey responses: {responses.error.message}. Has{' '}
        <code>supabase/migrations/010_hr_survey.sql</code> been run in Supabase?
      </div>
    )
  }

  return <HrClient initial={responses.data ?? []} passcode={setting.data?.value ?? ''} />
}
