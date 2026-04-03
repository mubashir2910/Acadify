"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { DayType } from "@/schemas/calendar.schema"

interface DateInfo {
  currentType: DayType | null
  isWeekend: boolean
  isOverride: boolean
  reason: string | null
  label: string
}

interface DayEditModalProps {
  open: boolean
  onClose: () => void
  dateStr: string
  dateInfo: DateInfo
  onSuccess: () => void
}

export default function DayEditModal({
  open,
  onClose,
  dateStr,
  dateInfo,
  onSuccess,
}: DayEditModalProps) {
  const [selectedType, setSelectedType] = useState<DayType | null>(null)
  const [reason, setReason] = useState(dateInfo.reason ?? "")
  const [saving, setSaving] = useState(false)

  // Reset form state whenever a different date is opened
  useEffect(() => {
    setSelectedType(null)
    setReason(dateInfo.reason ?? "")
  }, [dateStr])

  const date = new Date(dateStr + "T00:00:00")
  const formattedDate = format(date, "EEEE, MMMM d, yyyy")

  // Available options based on day type
  const weekdayOptions: { type: DayType; label: string; color: string }[] = [
    { type: "HOLIDAY", label: "Holiday", color: "bg-slate-700 hover:bg-slate-800 text-white" },
    { type: "HALF_DAY", label: "Half Day", color: "bg-amber-600 hover:bg-amber-700 text-white" },
    { type: "EVENT", label: "Event", color: "bg-blue-600 hover:bg-blue-700 text-white" },
  ]
  const weekendOptions: { type: DayType; label: string; color: string }[] = [
    { type: "WORKING_DAY", label: "Working Day", color: "bg-green-700 hover:bg-green-800 text-white" },
    { type: "HALF_DAY", label: "Half Day", color: "bg-amber-600 hover:bg-amber-700 text-white" },
  ]

  const options = dateInfo.isWeekend ? weekendOptions : weekdayOptions

  const handleSave = async () => {
    if (!selectedType) return
    setSaving(true)
    try {
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: dateStr,
          type: selectedType,
          ...(reason.trim() ? { reason: reason.trim() } : {}),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || "Failed to update")
      }

      const labels: Record<string, string> = {
        HOLIDAY: "Day marked as holiday",
        WORKING_DAY: "Day marked as working day",
        HALF_DAY: "Day marked as half day",
        EVENT: "Event added",
      }
      toast.success(labels[selectedType] ?? "Day updated")
      onSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update")
    } finally {
      setSaving(false)
    }
  }

  const handleRevert = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/calendar", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateStr }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || "Failed to revert")
      }

      toast.success("Reverted to default")
      onSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revert")
    } finally {
      setSaving(false)
    }
  }

  const showReason = selectedType && selectedType !== "WORKING_DAY"

  const statusColor = dateInfo.label.includes("Holiday")
    ? "bg-rose-100 text-rose-600"
    : dateInfo.label.includes("Half")
      ? "bg-amber-100 text-amber-700"
      : dateInfo.label.includes("Event")
        ? "bg-blue-100 text-blue-700"
        : "bg-green-100 text-green-700"

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Day</DialogTitle>
          <p className="text-sm text-muted-foreground">{formattedDate}</p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Current status */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Current:</span>
            <Badge className={statusColor}>{dateInfo.label}</Badge>
          </div>

          {/* Action options */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Change to:</p>
            <div className="flex flex-wrap gap-2">
              {options.map((opt) => (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => setSelectedType(opt.type)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    selectedType === opt.type
                      ? opt.color
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reason input */}
          {showReason && (
            <div className="space-y-1.5">
              <label htmlFor="reason" className="text-sm font-medium">
                {selectedType === "EVENT" ? "Event description" : "Reason"} (optional)
              </label>
              <input
                id="reason"
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                  selectedType === "EVENT"
                    ? "e.g., Annual Sports Day"
                    : selectedType === "HALF_DAY"
                      ? "e.g., Parent-Teacher Meeting"
                      : "e.g., May Day Holiday"
                }
                maxLength={100}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            <Button onClick={handleSave} disabled={saving || !selectedType}>
              {saving ? "Saving..." : "Save"}
            </Button>

            {dateInfo.isOverride && (
              <Button variant="outline" onClick={handleRevert} disabled={saving}>
                Revert to Default
              </Button>
            )}

            <Button variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
