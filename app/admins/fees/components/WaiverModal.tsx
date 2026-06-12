"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export type WaiverTarget = {
  studentId: string
  studentName: string
  sessionId: string
  feeHeadId: string
  feeHeadName: string
  periodYear: number
  periodMonth: number
  periodLabel: string
}

export default function WaiverModal({
  target,
  onClose,
  onSuccess,
}: {
  target: WaiverTarget | null
  onClose: () => void
  onSuccess: () => Promise<void> | void
}) {
  const [type, setType] = useState<"PERCENT" | "AMOUNT">("AMOUNT")
  const [value, setValue] = useState("")
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (target) {
      setType("AMOUNT")
      setValue("")
      setReason("")
    }
  }, [target])

  if (!target) return null

  async function submit() {
    if (!target) return
    const v = Number(value)
    if (!(v > 0)) {
      toast.error("Value must be greater than 0")
      return
    }
    if (reason.trim().length < 3) {
      toast.error("Reason must be at least 3 characters")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/fees/waivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: target.studentId,
          sessionId: target.sessionId,
          feeHeadId: target.feeHeadId,
          periodYear: target.periodYear,
          periodMonth: target.periodMonth,
          type,
          value: v,
          reason: reason.trim(),
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.message ?? "Failed to grant waiver")
        return
      }
      toast.success(`Waiver granted for ${target.feeHeadName} • ${target.periodLabel}`)
      await onSuccess()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={Boolean(target)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Waive {target.feeHeadName} — {target.periodLabel}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="rounded bg-muted/40 p-3 text-xs">
            <div className="font-semibold">{target.studentName}</div>
            <div className="text-muted-foreground">
              Applies to {target.feeHeadName} • {target.periodLabel} only
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium">Type</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={type}
                onChange={(e) => setType(e.target.value as "AMOUNT" | "PERCENT")}
              >
                <option value="AMOUNT">Fixed amount</option>
                <option value="PERCENT">Percent</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Value</label>
              <Input
                type="number"
                step="0.01"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Reason</label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Scholarship, hardship etc."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={submit}
              loading={submitting}
              loadingText="Saving…"
            >
              Grant Waiver
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
