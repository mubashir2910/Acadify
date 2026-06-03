"use client"

import { useState, useRef } from "react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Paperclip, X, Loader2, FileText, Image } from "lucide-react"

interface SlotInfo {
  timetableId: string
  subject: string
  class: string
  section: string
  periodLabel: string
  startTime: string
  endTime: string
  date: string
}

interface ExistingLog {
  id: string
  topic: string
  description: string | null
  attachmentUrl: string | null
  attachmentType: string | null
}

interface LogFormModalProps {
  open: boolean
  onClose: () => void
  slot: SlotInfo
  existing: ExistingLog | null
  onSaved: () => void
}

export function LogFormModal({ open, onClose, slot, existing, onSaved }: LogFormModalProps) {
  const [topic, setTopic] = useState(existing?.topic ?? "")
  const [description, setDescription] = useState(existing?.description ?? "")
  const [attachmentUrl, setAttachmentUrl] = useState(existing?.attachmentUrl ?? "")
  const [attachmentType, setAttachmentType] = useState<"pdf" | "image" | "">(
    (existing?.attachmentType as "pdf" | "image") ?? ""
  )
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/upload/attachment", { method: "POST", body: formData })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.message ?? "Upload failed")
        return
      }
      const data = await res.json()
      setAttachmentUrl(data.url)
      setAttachmentType(data.type)
    } catch {
      toast.error("Upload failed")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!topic.trim()) { toast.error("Topic is required"); return }
    setSaving(true)
    try {
      const body: Record<string, string | undefined> = {
        timetableId: slot.timetableId,
        date: slot.date,
        topic: topic.trim(),
      }
      if (description.trim()) body.description = description.trim()
      if (attachmentUrl) { body.attachmentUrl = attachmentUrl; body.attachmentType = attachmentType || undefined }

      const res = await fetch("/api/class-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.message ?? "Failed to save log")
        return
      }
      toast.success(existing ? "Log updated" : "Class logged successfully")
      onSaved()
      onClose()
    } catch {
      toast.error("Failed to save log")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit Class Log" : "Log Class"}</DialogTitle>
        </DialogHeader>

        {/* Slot info */}
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
          <span className="font-medium">{slot.subject}</span>
          <span>·</span>
          <span>Class {slot.class} — {slot.section}</span>
          <span>·</span>
          <span>{slot.periodLabel} ({slot.startTime}–{slot.endTime})</span>
          <span>·</span>
          <span>{slot.date}</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="topic">Topic Covered <span className="text-destructive">*</span></Label>
            <Input
              id="topic"
              placeholder="e.g. Newton's Laws of Motion"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              maxLength={200}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Notes / Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Textarea
              id="description"
              placeholder="Additional notes, homework given, etc."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Attachment <span className="text-muted-foreground font-normal">(optional — PDF or image, max 5MB)</span></Label>
            {attachmentUrl ? (
              <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 bg-muted/50">
                {attachmentType === "pdf" ? (
                  <FileText className="h-4 w-4 text-red-500 dark:text-red-400 shrink-0" />
                ) : (
                  <Image className="h-4 w-4 text-blue-500 dark:text-blue-400 shrink-0" />
                )}
                <a
                  href={attachmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 text-sm text-blue-600 dark:text-blue-400 underline truncate"
                >
                  View attachment
                </a>
                <button
                  type="button"
                  onClick={() => { setAttachmentUrl(""); setAttachmentType("") }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Paperclip className="h-4 w-4 mr-1" />}
                  {uploading ? "Uploading…" : "Attach File"}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={uploading}
              loading={saving}
              loadingText="Saving…"
            >
              {existing ? "Update Log" : "Save Log"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
