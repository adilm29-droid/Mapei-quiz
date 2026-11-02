import { redirect } from 'next/navigation'

// Friendly alias — the HR survey admin lives at /admin/hr
export default function AdminSurveyAlias() {
  redirect('/admin/hr')
}
