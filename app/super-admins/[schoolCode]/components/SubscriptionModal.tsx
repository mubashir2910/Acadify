"use client"

import { useState } from "react"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface SubscriptionModalProps {
  schoolCode: string
  currentStatus: string
  onClose: () => void
  onSuccess: () => void
}

const STATUS_OPTIONS = ["ACTIVE", "SUSPENDED", "CANCELLED"] as const

export default function SubscriptionModal({
  schoolCode,
  currentStatus,
  onClose,
  onSuccess,
}: SubscriptionModalProps) {
  const [status, setStatus] = useState(
    currentStatus === "TRIAL" ? "ACTIVE" : currentStatus,
  )
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (status === "ACTIVE" && !endDate) {
      setError("Please select a subscription end date")
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/schools/${schoolCode}/subscription`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          subscription_ends_at: endDate ? endDate.toISOString() : null,
          reason: reason.trim() || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || "Failed to update")
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update subscription")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-lg shadow-lg w-full max-w-md p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div>
          <h2 className="text-lg font-semibold">Manage Subscription</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Changes are recorded with a timestamp and your name for audit.
          </p>
        </div>

        {/* Status selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Status</label>
          <div className="flex gap-2 flex-wrap">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setStatus(opt)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium border transition-colors",
                  status === opt
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:bg-muted/50",
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Date picker — only shown for ACTIVE */}
        {status === "ACTIVE" && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Subscription End Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !endDate && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP") : "Select end date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  disabled={(date) => date < new Date()}
                  autoFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">Reason (optional)</label>
          <textarea
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[72px] resize-y"
            placeholder="e.g. Payment received for annual plan, suspending due to overdue invoice…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
          />
          <p className="text-[11px] text-muted-foreground">
            Saved with this change in the history log.
          </p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            loading={submitting}
            loadingText="Updating..."
          >
            Update Subscription
          </Button>
        </div>
      </div>
    </div>
  )
}
