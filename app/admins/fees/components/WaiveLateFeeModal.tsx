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

export type MonthlyLateFeeRow = {
  id: string
  period_year: number
  period_month: number
  amount: string
  paid: string
  waiverAmount?: string
  student: { user: { name: string } }
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export default function WaiveLateFeeModal({
  monthlyLateFee,
  onClose,
  onSuccess,
}: {
  monthlyLateFee: MonthlyLateFeeRow | null
  onClose: () => void
  onSuccess: () => Promise<void> | void
}) {
  const [type, setType] = useState<"AMOUNT" | "PERCENT">("AMOUNT")
  const [value, setValue] = useState("")
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (monthlyLateFee) {
      setType("AMOUNT")
      setValue("")
      setReason("")
    }
  }, [monthlyLateFee])

  if (!monthlyLateFee) return null

  async function submit() {
    if (!monthlyLateFee) return
    const v = Number(value)
    if (!(v > 0)) {
      toast.error("Value must be greater than 0")
      return
    }
    if (type === "PERCENT" && v > 100) {
      toast.error("Percent must be ≤ 100")
      return
    }
    if (reason.trim().length < 3) {
      toast.error("Reason must be at least 3 characters")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/fees/late-fees/${monthlyLateFee.id}/waive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, value: v, reason: reason.trim() }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.message ?? "Failed to waive late fee")
        return
      }
      toast.success("Late fee waiver granted")
      await onSuccess()
    } finally {
      setSubmitting(false)
    }
  }

  const alreadyWaived = Number(monthlyLateFee.waiverAmount ?? 0)
  const outstanding = Math.max(
    0,
    Number(monthlyLateFee.amount) - Number(monthlyLateFee.paid) - alreadyWaived,
  )
  const periodLabel = `${MONTH_LABELS[monthlyLateFee.period_month - 1]} ${monthlyLateFee.period_year}`

  return (
    <Dialog open={Boolean(monthlyLateFee)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Waive Late Fee — {periodLabel}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="rounded bg-muted/40 p-3 text-xs">
            <div className="font-semibold">{monthlyLateFee.student.user.name}</div>
            <div className="text-muted-foreground">Month: {periodLabel}</div>
            <div className="text-amber-700 dark:text-amber-400 mt-1">
              Outstanding late fee: ₹{outstanding.toFixed(2)}
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
              placeholder="Scholarship, hardship, system error etc."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={submit} loading={submitting} loadingText="Saving…">
              Grant Waiver
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
