'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, ImageIcon } from 'lucide-react'
import { toast } from 'sonner'

export function CoverUploader({
  quizId,
  currentUrl,
}: {
  quizId: string
  currentUrl: string | null
}) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [chosen, setChosen] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  function pickFile(file: File | null | undefined) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be ≤ 2 MB')
      return
    }
    setChosen(file)
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function upload() {
    if (!chosen) return
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('cover', chosen)
      const res = await fetch(`/api/admin/quizzes/${quizId}/cover`, {
        method: 'POST',
        body: fd,
      })
      const json = (await res.json()) as { error?: string | null }
      if (!res.ok || json.error) {
        toast.error(json.error || 'Upload failed')
        return
      }
      toast.success('Cover updated')
      setChosen(null)
      setPreview(null)
      router.refresh()
    } catch (e: any) {
      toast.error(e?.message || 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  const showPreview = preview ?? currentUrl

  return (
    <div className="rounded-2xl border border-midnight-line bg-midnight-elevated p-4">
      <h3 className="mb-3 text-h3 font-semibold text-white">Cover image</h3>
      <p className="mb-3 text-caption text-whitex-muted">
        Used as the background for the quiz card on the home screen. Auto-cropped to 1200×600.
      </p>
      <div
        onDragOver={e => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault()
          setDragOver(false)
          pickFile(e.dataTransfer.files?.[0])
        }}
        className={
          'flex flex-col items-center gap-3 rounded-xl border-2 border-dashed p-6 text-center transition-colors ' +
          (dragOver
            ? 'border-aurora-from bg-aurora-from/5'
            : 'border-midnight-line bg-midnight-base')
        }
      >
        {showPreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={showPreview}
            alt="Cover preview"
            className="h-40 w-full rounded-lg object-cover ring-1 ring-midnight-line"
          />
        ) : (
          <div className="flex h-40 w-full items-center justify-center rounded-lg border border-dashed border-midnight-line bg-midnight-elevated">
            <ImageIcon className="h-7 w-7 text-whitex-faint" />
          </div>
        )}
        <p className="text-caption text-whitex-muted">
          Drop an image or{' '}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="text-white underline"
          >
            click to pick
          </button>
          . PNG / JPG / WEBP, ≤ 2 MB.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => pickFile(e.target.files?.[0])}
        />
      </div>
      {chosen ? (
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setChosen(null)
              setPreview(null)
            }}
            disabled={busy}
            className="rounded-lg border border-midnight-line bg-midnight-base px-4 py-2 text-caption text-whitex-soft hover:bg-midnight-line"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={upload}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-aurora px-4 py-2 text-caption font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            <Upload className="h-3.5 w-3.5" />
            {busy ? 'Uploading…' : 'Save cover'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
