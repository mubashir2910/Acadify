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
    currentStatus === "TRIAL" ? "ACTIVE" : currentStatus
  )
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 space-y-5">
        <h2 className="text-lg font-semibold">Manage Subscription</h2>

        {/* Status selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Status</label>
          <div className="flex gap-2">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setStatus(opt)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium border transition-colors",
                  status === opt
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
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
                    !endDate && "text-muted-foreground"
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
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Updating..." : "Update Subscription"}
          </Button>
        </div>
      </div>
    </div>
  )
}
