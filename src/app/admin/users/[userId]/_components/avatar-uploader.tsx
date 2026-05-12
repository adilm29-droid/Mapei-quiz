'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, ImageIcon, Check } from 'lucide-react'
import { toast } from 'sonner'

/**
 * Admin-only avatar control. Per CLAUDE_CODE_PROMPT.md §15 + Tarun's
 * 2026-05-12 ask: in addition to local upload, admins can pick from a
 * gallery — the 7 static images under /public/avatars/ plus every
 * image already in use by another user. Picking a gallery image just
 * sets `users.avatar_url` (no upload), so the same artwork can be
 * shared across users.
 */
export function AvatarUploader({
  userId,
  currentUrl,
  staticGallery,
  uploadedGallery,
}: {
  userId: string
  currentUrl: string | null
  staticGallery: readonly string[]
  uploadedGallery: readonly string[]
}) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [chosen, setChosen] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [assigning, setAssigning] = useState<string | null>(null)

  function pickFile(file: File | null | undefined) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are accepted')
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
      fd.append('avatar', chosen)
      const res = await fetch(`/api/admin/users/${userId}/avatar`, {
        method: 'POST',
        body: fd,
      })
      const json = (await res.json()) as { data?: any; error?: string | null }
      if (!res.ok || json.error) {
        toast.error(json.error || 'Upload failed')
        return
      }
      toast.success('Avatar updated')
      setChosen(null)
      setPreview(null)
      router.refresh()
    } catch (e: any) {
      toast.error(e?.message || 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  async function assign(url: string) {
    setAssigning(url)
    try {
      const res = await fetch(`/api/admin/users/${userId}/avatar/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const json = (await res.json()) as { data?: any; error?: string | null }
      if (!res.ok || json.error) {
        toast.error(json.error || 'Could not assign avatar')
        return
      }
      toast.success('Avatar updated')
      router.refresh()
    } catch (e: any) {
      toast.error(e?.message || 'Could not assign avatar')
    } finally {
      setAssigning(null)
    }
  }

  const showPreview = preview ?? currentUrl

  return (
    <div className="space-y-4 rounded-2xl border border-midnight-line bg-midnight-elevated p-4">
      <Gallery
        title="Default gallery"
        urls={staticGallery}
        currentUrl={currentUrl}
        onPick={assign}
        pendingUrl={assigning}
        emptyHint="None"
      />

      <Gallery
        title="Previously uploaded"
        urls={uploadedGallery}
        currentUrl={currentUrl}
        onPick={assign}
        pendingUrl={assigning}
        emptyHint="No uploads yet — pictures show here once any user has one."
      />

      <div>
        <h4 className="mb-2 text-micro uppercase tracking-wider text-whitex-faint">
          Upload new
        </h4>
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
              alt="Avatar preview"
              className="h-24 w-24 rounded-full object-cover ring-2 ring-midnight-line"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full border border-dashed border-midnight-line bg-midnight-elevated">
              <ImageIcon className="h-6 w-6 text-whitex-faint" />
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
            . PNG / JPG / WEBP, ≤ 2 MB. Auto-cropped to 512×512.
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
          <div className="mt-3 flex justify-end gap-2">
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
              {busy ? 'Uploading…' : 'Save avatar'}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function Gallery({
  title,
  urls,
  currentUrl,
  onPick,
  pendingUrl,
  emptyHint,
}: {
  title: string
  urls: readonly string[]
  currentUrl: string | null
  onPick: (url: string) => void
  pendingUrl: string | null
  emptyHint: string
}) {
  return (
    <div>
      <h4 className="mb-2 text-micro uppercase tracking-wider text-whitex-faint">
        {title}{' '}
        <span className="ml-1 text-whitex-faint/60">({urls.length})</span>
      </h4>
      {urls.length === 0 ? (
        <p className="rounded-lg border border-dashed border-midnight-line bg-midnight-base/40 px-3 py-2 text-micro text-whitex-faint">
          {emptyHint}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {urls.map(url => {
            const isCurrent = url === currentUrl
            const isPending = url === pendingUrl
            return (
              <button
                key={url}
                type="button"
                onClick={() => !isCurrent && onPick(url)}
                disabled={isCurrent || !!pendingUrl}
                title={isCurrent ? 'Currently selected' : 'Use this image'}
                className={
                  'relative h-16 w-16 overflow-hidden rounded-full border-2 transition-all ' +
                  (isCurrent
                    ? 'border-aurora-from ring-2 ring-aurora-from/40'
                    : 'border-midnight-line hover:border-whitex-muted')
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
                {isCurrent && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <Check className="h-5 w-5 text-white drop-shadow" />
                  </span>
                )}
                {isPending && !isCurrent && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-micro text-white">
                    …
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
