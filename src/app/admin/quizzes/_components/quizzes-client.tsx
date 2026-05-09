'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { Upload, Eye, EyeOff, Pencil, BarChart3 } from 'lucide-react'
import { GradientButton } from '@/components/ui/gradient-button'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ImportQuizDialog } from './import-quiz-dialog'

interface QuizRow {
  id: string
  title: string
  week_number: number
  is_unlocked: boolean
  leaderboard_visible: boolean
  max_score: number | null
  unlocked_at: string | null
  created_at: string
  question_count: number
}

export function QuizzesClient({ initial }: { initial: QuizRow[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function toggleUnlock(q: QuizRow) {
    const res = await fetch(`/api/admin/quizzes/${q.id}/unlock`, { method: 'POST' })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(body?.error || 'Could not toggle')
      return
    }
    toast.success(`${q.title} → ${body.is_unlocked ? 'unlocked' : 'locked'}`)
    router.refresh()
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-h1 font-semibold tracking-tight text-white">Quizzes</h1>
          <p className="mt-1 text-caption text-whitex-muted">
            {initial.length} {initial.length === 1 ? 'quiz' : 'quizzes'} total
          </p>
        </div>
        <GradientButton gradient="aurora" size="md" onClick={() => setOpen(true)}>
          <Upload className="h-4 w-4" />
          Upload JSON quiz
        </GradientButton>
      </div>

      {initial.length === 0 ? (
        <div className="rounded-2xl border border-midnight-line bg-midnight-elevated/40 p-12 text-center backdrop-blur">
          <p className="text-caption text-whitex-muted">
            No quizzes yet. Upload your first one with the button above.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-midnight-line bg-midnight-elevated/40 backdrop-blur">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-midnight-line text-micro uppercase tracking-wider text-whitex-faint">
                <th className="px-5 py-3 font-medium">Title</th>
                <th className="px-5 py-3 font-medium">Week</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Questions</th>
                <th className="px-5 py-3 text-right font-medium">Max</th>
                <th className="w-32 px-5 py-3 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {initial.map(q => (
                <tr key={q.id} className="border-b border-midnight-line/60 last:border-0 hover:bg-midnight-line/40">
                  <td className="px-5 py-3 text-body font-medium text-whitex-soft">{q.title}</td>
                  <td className="px-5 py-3 font-mono text-caption tabular text-whitex-muted">W{q.week_number}</td>
                  <td className="px-5 py-3">
                    {q.leaderboard_visible ? (
                      <Badge tone="success">leaderboard live</Badge>
                    ) : q.is_unlocked ? (
                      <Badge tone="info">unlocked</Badge>
                    ) : (
                      <Badge tone="neutral">draft</Badge>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-caption tabular text-whitex-soft">
                    {q.question_count}
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-caption tabular text-whitex-soft">
                    {q.max_score ?? '—'}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <Link
                        href={`/admin/quizzes/${q.id}/insights`}
                        className="inline-flex items-center rounded-md px-2 py-1 text-micro text-whitex-muted hover:bg-midnight-line hover:text-white"
                      >
                        <BarChart3 className="mr-1 h-3 w-3" />
                        Insights
                      </Link>
                      <Link
                        href={`/admin/quizzes/${q.id}/edit`}
                        className="inline-flex items-center rounded-md px-2 py-1 text-micro text-whitex-muted hover:bg-midnight-line hover:text-white"
                      >
                        <Pencil className="mr-1 h-3 w-3" />
                        Edit
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleUnlock(q)}
                        className="text-whitex-muted hover:bg-midnight-line hover:text-white"
                      >
                        {q.is_unlocked ? (
                          <>
                            <EyeOff className="mr-1.5 h-3.5 w-3.5" />
                            Lock
                          </>
                        ) : (
                          <>
                            <Eye className="mr-1.5 h-3.5 w-3.5" />
                            Unlock
                          </>
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ImportQuizDialog open={open} onOpenChange={setOpen} onImported={() => router.refresh()} />
    </>
  )
}
