"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

const MAX_LOGO_SIZE = 2 * 1024 * 1024
const ALLOWED_LOGO_TYPES = ["image/jpeg", "image/png", "image/webp"]

export default function EditBrandingModal({
  schoolCode,
  onClose,
  onSuccess,
}: {
  schoolCode: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [motto, setMotto] = useState("")
  const [brandColor, setBrandColor] = useState("#000000")
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/schools/${schoolCode}`)
        if (res.ok) {
          const data = await res.json()
          setMotto(data.motto ?? "")
          setBrandColor(data.brand_color ?? "#000000")
          setLogoUrl(data.logo_url ?? null)
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [schoolCode])

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    if (!f) {
      setFile(null)
      return
    }
    if (!ALLOWED_LOGO_TYPES.includes(f.type)) {
      toast.error("Logo must be JPEG, PNG, or WebP")
      e.target.value = ""
      return
    }
    if (f.size > MAX_LOGO_SIZE) {
      toast.error("Logo must be under 2MB")
      e.target.value = ""
      return
    }
    setFile(f)
  }

  async function save() {
    setSaving(true)
    try {
      let nextLogoUrl = logoUrl
      if (file) {
        setUploading(true)
        const fd = new FormData()
        fd.append("file", file)
        fd.append("schoolCode", schoolCode)
        const upload = await fetch("/api/upload/school-logo", {
          method: "POST",
          body: fd,
        })
        const uploadJson = await upload.json().catch(() => ({}))
        setUploading(false)
        if (!upload.ok || !uploadJson?.url) {
          toast.error(uploadJson?.message ?? "Logo upload failed")
          return
        }
        nextLogoUrl = uploadJson.url
      }

      const res = await fetch(`/api/schools/${schoolCode}/branding`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logoUrl: nextLogoUrl,
          motto: motto.trim() || null,
          brandColor,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.message ?? "Failed to update branding")
        return
      }
      toast.success("Branding updated")
      if (fileRef.current) fileRef.current.value = ""
      setFile(null)
      onSuccess()
    } finally {
      setSaving(false)
    }
  }

  const previewSrc = file ? URL.createObjectURL(file) : logoUrl

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit School Branding</DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-sm text-muted-foreground py-4">Loading…</p>
        ) : (
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-4">
              <div
                className="size-16 rounded-md border-2 bg-background flex items-center justify-center overflow-hidden"
                style={{ borderColor: brandColor }}
              >
                {previewSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewSrc} alt="Logo preview" className="size-full object-cover" />
                ) : (
                  <span className="text-xs text-muted-foreground">No logo</span>
                )}
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium mb-1">School Logo</label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleLogoChange}
                  className="text-xs file:mr-3 file:rounded file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm hover:file:bg-muted/80"
                />
                <p className="text-xs text-muted-foreground mt-1">PNG/JPG/WebP, max 2MB.</p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Motto (optional)</label>
              <Textarea
                value={motto}
                onChange={(e) => setMotto(e.target.value)}
                placeholder="A short tagline shown on receipts and report cards"
                maxLength={200}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Brand Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value.toUpperCase())}
                  className="h-10 w-14 rounded border border-border bg-background p-1"
                />
                <Input
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="font-mono uppercase"
                  maxLength={7}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Used on receipts and future PDFs.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={save}
                loading={saving || uploading}
                loadingText={uploading ? "Uploading…" : "Saving…"}
              >
                Save
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
