"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function ChangeSchoolCodeModal({
  currentSchoolCode,
  schoolName,
  onClose,
  onSuccess,
}: {
  currentSchoolCode: string
  schoolName: string
  onClose: () => void
  onSuccess: (newCode: string) => void
}) {
  const [confirmCode, setConfirmCode] = useState("")
  const [newCode, setNewCode] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    const newCodeTrimmed = newCode.trim().toUpperCase()
    if (!newCodeTrimmed) {
      toast.error("New school code is required")
      return
    }
    if (confirmCode.trim() !== currentSchoolCode) {
      toast.error("Confirmation code does not match the current code")
      return
    }
    if (newCodeTrimmed === currentSchoolCode) {
      toast.error("New code is the same as the current code")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/schools/${currentSchoolCode}/change-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentSchoolCode: confirmCode.trim(),
          newSchoolCode: newCodeTrimmed,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.message ?? "Failed to update school code")
        return
      }
      toast.success(`School code updated to ${data?.school?.schoolCode ?? newCodeTrimmed}`)
      onSuccess(data?.school?.schoolCode ?? newCodeTrimmed)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change School Code</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="rounded-md border border-amber-300 bg-amber-500/10 p-3 text-xs text-amber-900">
            <p className="font-semibold mb-1">⚠ Changing the school code is risky.</p>
            <p>
              All admin/teacher/student URLs that reference this school by code
              will need to be updated. Make sure no integrations or
              bookmarks rely on the old code.
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">
              To confirm, retype the current school code
            </label>
            <Input
              value={confirmCode}
              onChange={(e) => setConfirmCode(e.target.value.toUpperCase())}
              placeholder={currentSchoolCode}
              className="font-mono uppercase"
            />
            <p className="text-xs text-muted-foreground">
              Currently: <span className="font-mono">{currentSchoolCode}</span> ·{" "}
              {schoolName}
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">New school code (2-5 chars)</label>
            <Input
              value={newCode}
              onChange={(e) => setNewCode(e.target.value.toUpperCase())}
              placeholder="e.g. SRA2"
              className="font-mono uppercase"
              maxLength={5}
            />
            <p className="text-xs text-muted-foreground">
              Letters, numbers, hyphens, or underscores only.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={submit}
              loading={submitting}
              loadingText="Updating…"
            >
              Update Code
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
