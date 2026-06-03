"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { MonthlyBlock } from "./StudentFeesSection"

export default function MonthlyBreakdownModal({
  block,
  currency,
  onClose,
  onPay,
}: {
  block: MonthlyBlock | null
  currency: string
  onClose: () => void
  onPay?: () => void
}) {
  if (!block) return null

  const totalDue = Number(block.totalDue)
  const lateAmt = block.lateFee ? Number(block.lateFee.amount) : 0
  const latePaid = block.lateFee ? Number(block.lateFee.paid) : 0
  const lateWaiver = block.lateFee ? Number(block.lateFee.waiverAmount) : 0
  const lateOutstanding = block.lateFee && !block.lateFee.waived
    ? Math.max(0, lateAmt - latePaid - lateWaiver)
    : 0
  // For a "paid" late fee row, show what was actually paid (ledger row treats
  // fully-waived as `lateAmt` minus what was paid; same visual rule the
  // ledger-row branch uses below).
  const lateDisplay = lateOutstanding > 0
    ? lateOutstanding
    : block.lateFee
      ? latePaid
      : 0

  return (
    <Dialog open={Boolean(block)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            <div>{block.label}</div>
            <div className="text-sm font-normal text-muted-foreground">Fees Breakdown</div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <ul className="text-sm space-y-1.5">
            {block.ledgerRows.map((r) => {
              const exp = Number(r.expected)
              const wav = Number(r.waiver)
              const paid = Number(r.paid)
              const remaining = Math.max(0, exp - wav - paid)
              // When fully cleared (remaining=0), surface what the student
              // actually paid (`paid`) instead of zero — that's the number
              // they want to see on their receipt history.
              const displayAmt = remaining > 0 ? remaining : paid
              return (
                <li
                  key={r.id}
                  className="flex flex-col gap-0.5 border-b border-border/60 py-1.5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span>{r.head_name_snapshot}</span>
                    <span className="font-mono">
                      {currency} {displayAmt.toFixed(2)}
                      {remaining === 0 && paid > 0 && (
                        <span className="text-xs text-emerald-700 dark:text-emerald-400 ml-2">paid</span>
                      )}
                    </span>
                  </div>
                  {wav > 0 && (
                    <div className="text-xs text-emerald-700 dark:text-emerald-400">
                      <div>Waived {currency} {wav.toFixed(2)}</div>
                      {r.waiverReason &&
                        r.waiverReason
                          .split("\n")
                          .map((reason) => reason.trim())
                          .filter((reason) => reason.length > 0)
                          .map((reason, idx) => (
                            <div key={idx} className="pl-3">
                              • {reason}
                            </div>
                          ))}
                    </div>
                  )}
                </li>
              )
            })}
            {block.lateFee && (lateAmt > 0 || block.lateFee.waived) && (
              <li
                className={`flex flex-col gap-0.5 border-b border-border/60 py-1.5 ${
                  lateOutstanding > 0 ? "text-amber-700 dark:text-amber-400" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span>Late Fee</span>
                  <span className="font-mono">
                    {currency} {lateDisplay.toFixed(2)}
                    {lateOutstanding === 0 && latePaid > 0 && (
                      <span className="text-xs text-emerald-700 dark:text-emerald-400 ml-2">paid</span>
                    )}
                    {block.lateFee.waived && latePaid === 0 && (
                      <span className="text-xs text-emerald-700 dark:text-emerald-400 ml-2">waived</span>
                    )}
                  </span>
                </div>
                {lateWaiver > 0 && (
                  <div className="text-xs text-emerald-700 dark:text-emerald-400">
                    <div>Waived {currency} {lateWaiver.toFixed(2)}</div>
                    {block.lateFee.waiverReason &&
                      block.lateFee.waiverReason
                        .split("\n")
                        .map((reason) => reason.trim())
                        .filter((reason) => reason.length > 0)
                        .map((reason, idx) => (
                          <div key={idx} className="pl-3">
                            • {reason}
                          </div>
                        ))}
                  </div>
                )}
              </li>
            )}
          </ul>

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="font-semibold">Total Due</span>
            <span className="font-mono font-bold text-base">
              {currency} {totalDue.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
            {onPay && totalDue > 0 && (
              <Button onClick={onPay}>Pay Now</Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
