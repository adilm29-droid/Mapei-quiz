'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { GradientButton } from '@/components/ui/gradient-button'

export function ImportQuizDialog({
  open,
  onOpenChange,
  onImported,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onImported: () => void
}) {
  const [weekNumber, setWeekNumber] = useState('')
  const [json, setJson] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors([])
    let parsed: any
    try {
      parsed = JSON.parse(json)
    } catch (err) {
      setErrors([`JSON parse failed: ${(err as Error).message}`])
      return
    }
    setSubmitting(true)
    const res = await fetch('/api/admin/quizzes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...parsed, week_number: parseInt(weekNumber, 10) || parsed.week_number }),
    })
    const body = await res.json().catch(() => ({}))
    setSubmitting(false)
    if (!res.ok) {
      if (body?.errors) setErrors(body.errors)
      else setErrors([body?.error || 'Import failed'])
      return
    }
    toast.success(`Imported "${body.title}" (${body.questions} questions, max ${body.max_score})`)
    setJson('')
    setWeekNumber('')
    onOpenChange(false)
    onImported()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload quiz JSON</DialogTitle>
          <DialogDescription>
            Paste the JSON in the same shape as <code>mapei_quiz_1.json</code>. Each question
            needs <code>difficulty</code> (very_easy / easy / practical / medium),{' '}
            <code>options</code> (4), and <code>correct_answer</code> matching one of the options.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="wk">Week number (override)</Label>
            <Input
              id="wk"
              type="number"
              min="1"
              value={weekNumber}
              onChange={e => setWeekNumber(e.target.value)}
              placeholder="Leave blank to use the value inside the JSON, or default to 1"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="json">Quiz JSON</Label>
            <textarea
              id="json"
              value={json}
              onChange={e => setJson(e.target.value)}
              required
              spellCheck={false}
              rows={14}
              className="w-full rounded-xl border border-midnight-line bg-midnight-deepest/60 px-4 py-3 font-mono text-caption text-whitex-soft placeholder:text-whitex-faint focus:border-info focus:outline-none focus:ring-2 focus:ring-info/30"
              placeholder='{"quiz_title":"…","questions":[{"id":1,"difficulty":"very_easy","question":"…","options":["A","B","C","D"],"correct_answer":"A"}]}'
            />
          </div>

          {errors.length > 0 && (
            <div className="rounded-xl border-l-2 border-danger/70 bg-danger/5 px-4 py-3 text-caption text-danger">
              <ul className="space-y-1">
                {errors.slice(0, 8).map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
                {errors.length > 8 && <li>(+{errors.length - 8} more)</li>}
              </ul>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-whitex-muted hover:bg-midnight-line hover:text-whitex-soft"
            >
              Cancel
            </Button>
            <GradientButton type="submit" gradient="aurora" size="md" disabled={submitting}>
              {submitting ? 'Importing…' : 'Import quiz'}
            </GradientButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
