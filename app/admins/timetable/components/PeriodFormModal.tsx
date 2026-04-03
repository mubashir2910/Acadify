"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { PeriodRow } from "@/schemas/timetable.schema"

interface PeriodFormModalProps {
  mode: "create" | "edit"
  period?: PeriodRow
  lastPeriodEndTime?: string
  defaultOrder?: number
  onClose: () => void
  onSuccess: () => void
}

export default function PeriodFormModal({
  mode,
  period,
  lastPeriodEndTime,
  defaultOrder = 1,
  onClose,
  onSuccess,
}: PeriodFormModalProps) {
  const [label, setLabel] = useState(period?.label ?? "")
  const [startTime, setStartTime] = useState(period?.start_time ?? "")
  const [endTime, setEndTime] = useState(period?.end_time ?? "")
  const [isBreak, setIsBreak] = useState(period?.is_break ?? false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!label.trim()) return setError("Label is required")
    if (!startTime) return setError("Start time is required")
    if (!endTime) return setError("End time is required")
    if (endTime <= startTime) return setError("End time must be after start time")

    setSubmitting(true)
    try {
      const url =
        mode === "create" ? "/api/timetable/periods" : `/api/timetable/periods/${period!.id}`
      const method = mode === "create" ? "POST" : "PATCH"
      const body =
        mode === "create"
          ? { label: label.trim(), start_time: startTime, end_time: endTime, is_break: isBreak, order: defaultOrder }
          : { label: label.trim(), start_time: startTime, end_time: endTime, is_break: isBreak }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.message ?? "Failed to save")
        return
      }

      toast.success(mode === "create" ? "Period added" : "Period updated")
      onSuccess()
    } catch {
      setError("Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  // Quick duplicate helper: pre-fill start time from the last period's end time
  function fillFromLastPeriod() {
    const t = lastPeriodEndTime ?? period?.end_time
    if (t) setStartTime(t)
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Period" : "Edit Period"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="label">Label</Label>
            <Input
              id="label"
              placeholder="e.g. Period 1 or Lunch Break"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="start">Start Time</Label>
              <Input
                id="start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end">End Time</Label>
              <Input
                id="end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {mode === "create" && (
            <button
              type="button"
              onClick={fillFromLastPeriod}
              className="text-xs text-blue-600 hover:underline"
            >
              Use last period&apos;s end time as start
            </button>
          )}

          <div className="flex items-center gap-2">
            <input
              id="isBreak"
              type="checkbox"
              checked={isBreak}
              onChange={(e) => setIsBreak(e.target.checked)}
              className="rounded border-slate-300"
            />
            <Label htmlFor="isBreak" className="cursor-pointer">
              This is a break (no class can be assigned)
            </Label>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : mode === "create" ? "Add" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
