"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { MonthlyBlock } from "./StudentFeesSection"

const STATUS_VARIANT: Record<
  MonthlyBlock["status"],
  "default" | "secondary" | "outline" | "destructive"
> = {
  PAID: "default",
  PARTIAL: "secondary",
  PENDING: "outline",
  OVERDUE: "destructive",
  EMPTY: "outline",
}

export default function MonthlyBlockCard({
  block,
  onBreakdown,
  onPay,
  awaitingVerification,
}: {
  block: MonthlyBlock
  onBreakdown: () => void
  onPay?: () => void
  // payDisabledReason intentionally dropped — the disabled Pay Now button
  // communicates "no action available" without the noisy italic helper text.
  payDisabledReason?: string | null
  // True when the student already has a PENDING_VERIFICATION transaction
  // for this month. The button label changes so the parent understands
  // why they can't pay again until the admin acts on the prior submission.
  awaitingVerification?: boolean
}) {
  const totalDue = Number(block.totalDue)
  const totalPaid = Number(block.totalPaid)
  const latePaid = block.lateFee ? Number(block.lateFee.paid) : 0
  const dueDate = block.dueDate ? new Date(block.dueDate) : null
  const overdue = block.status === "OVERDUE"
  // For PAID rows, surface what the family actually paid (ledger paid + late
  // fee paid). For not-yet-paid rows, surface what's still owed.
  const isPaid = block.status === "PAID"
  const displayAmount = isPaid ? totalPaid + latePaid : totalDue

  return (
    <div
      className={`rounded-md border bg-card p-4 ${
        overdue ? "border-destructive/40" : "border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-base">Fees for {block.label}</span>
            <Badge variant={STATUS_VARIANT[block.status]}>{block.status}</Badge>
          </div>
          {dueDate && (
            <div className="text-xs text-muted-foreground mt-1">
              Due {dueDate.toLocaleDateString("en-IN")}
            </div>
          )}
          <button
            onClick={onBreakdown}
            className="text-xs text-primary underline-offset-2 hover:underline mt-2"
          >
            Breakdown
          </button>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold font-mono">₹{displayAmount.toFixed(2)}</div>
          <Button
            size="sm"
            className="mt-2"
            onClick={onPay}
            disabled={!onPay}
          >
            {awaitingVerification ? "Awaiting verification" : "Pay Now"}
          </Button>
        </div>
      </div>
    </div>
  )
}
