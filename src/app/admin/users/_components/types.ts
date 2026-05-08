export interface AdminUserRow {
  id: string
  username: string
  email: string
  first_name: string | null
  last_name: string | null
  role: 'admin' | 'staff'
  status: 'pending' | 'approved' | 'rejected' | 'suspended'
  xp: number
  level: number
  title: string
  current_streak: number
  longest_streak: number
  last_quiz_date: string | null
  created_at: string
  updated_at: string
}
