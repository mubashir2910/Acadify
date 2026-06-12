"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export type MonthPaymentContext = {
  studentId: string
  studentName: string
  studentClass?: string | null
  studentSection?: string | null
  year: number
  month: number
  label: string
}

type LedgerRowInBlock = {
  id: string
  fee_head_id: string | null
  head_name_snapshot: string
  expected: string
  waiver: string
  waiverReason: string | null
  paid: string
  status: string
}

type LateFeeInBlock = {
  id: string
  amount: string
  paid: string
  waiverAmount: string
  waiverReason: string | null
  waived: boolean
}

type BlockResponse = {
  year: number
  month: number
  ledgerRows: LedgerRowInBlock[]
  lateFee: LateFeeInBlock | null
}

// Per-ledger-row allocation tracked internally so the server still receives
// granular allocations even though the UI shows ONE aggregated "Fees" block.
type LedgerAlloc = {
  ledgerId: string
  outstanding: number
  waiverAmount: number
  waiverReason: string | null
  headName: string
}
type LateAlloc = {
  monthlyLateFeeId: string
  outstanding: number
  waiverAmount: number
  waiverReason: string | null
}

const METHODS = [
  "CASH",
  "UPI_OFFLINE",
  "BANK_TRANSFER",
  "CHEQUE",
  "UPI_ONLINE",
  "CARD",
  "OTHER",
]

export default function MonthMarkPaidModal({
  context,
  onClose,
  onSuccess,
}: {
  context: MonthPaymentContext | null
  onClose: () => void
  onSuccess: () => Promise<void> | void
}) {
  const [ledgerAllocs, setLedgerAllocs] = useState<LedgerAlloc[]>([])
  const [lateAlloc, setLateAlloc] = useState<LateAlloc | null>(null)
  const [loadingBlock, setLoadingBlock] = useState(false)
  const [method, setMethod] = useState("CASH")
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10))
  const [ref, setRef] = useState("")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!context) return
    let cancelled = false
    setLoadingBlock(true)
    setMethod("CASH")
    setPaidAt(new Date().toISOString().slice(0, 10))
    setRef("")
    setNotes("")
    void (async () => {
      try {
        const p = new URLSearchParams()
        p.set("studentId", context.studentId)
        const res = await fetch(`/api/fees/monthly-blocks?${p.toString()}`)
        if (!res.ok) {
          toast.error("Failed to load month details")
          return
        }
        const data = (await res.json()) as { blocks?: BlockResponse[] }
        const block = (data.blocks ?? []).find(
          (b) => b.year === context.year && b.month === context.month,
        )
        if (!block) {
          setLedgerAllocs([])
          setLateAlloc(null)
          return
        }
        const builtLedgers: LedgerAlloc[] = []
        for (const r of block.ledgerRows) {
          const outstanding = Math.max(
            0,
            Number(r.expected) - Number(r.waiver) - Number(r.paid),
          )
          if (outstanding <= 0) continue
          builtLedgers.push({
            ledgerId: r.id,
            outstanding,
            waiverAmount: Number(r.waiver),
            waiverReason: r.waiverReason,
            headName: r.head_name_snapshot,
          })
        }
        let builtLate: LateAlloc | null = null
        if (block.lateFee && !block.lateFee.waived) {
          const outstanding = Math.max(
            0,
            Number(block.lateFee.amount) -
              Number(block.lateFee.paid) -
              Number(block.lateFee.waiverAmount),
          )
          if (outstanding > 0) {
            builtLate = {
              monthlyLateFeeId: block.lateFee.id,
              outstanding,
              waiverAmount: Number(block.lateFee.waiverAmount),
              waiverReason: block.lateFee.waiverReason,
            }
          }
        }
        if (!cancelled) {
          setLedgerAllocs(builtLedgers)
          setLateAlloc(builtLate)
        }
      } finally {
        if (!cancelled) setLoadingBlock(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [context])

  if (!context) return null

  // Aggregate the per-ledger rows into a single "Fees" block for display.
  // The user sees ONE row (not per-head Tuition / Lab / Exams etc.) — the
  // breakdown remains accessible through the Breakdown button on the ledger.
  const feesOutstandingTotal = ledgerAllocs.reduce((s, a) => s + a.outstanding, 0)
  const feesWaiverTotal = ledgerAllocs.reduce((s, a) => s + a.waiverAmount, 0)
  // Each `waiverReason` is a `\n`-joined string of every waive's reason on
  // that head. Split and de-dupe so the modal shows one reason per line
  // (matching the Breakdown modal's bullet list).
  const feesReasons = Array.from(
    new Set(
      ledgerAllocs
        .flatMap((a) => (a.waiverReason ?? "").split("\n"))
        .map((r) => r.trim())
        .filter((r) => r.length > 0),
    ),
  )
  const lateReasons = lateAlloc?.waiverReason
    ? Array.from(
        new Set(
          lateAlloc.waiverReason
            .split("\n")
            .map((r) => r.trim())
            .filter((r) => r.length > 0),
        ),
      )
    : []

  const totalAmount =
    feesOutstandingTotal + (lateAlloc ? lateAlloc.outstanding : 0)

  const hasFees = feesOutstandingTotal > 0
  const hasLate = Boolean(lateAlloc && lateAlloc.outstanding > 0)

  async function submit() {
    if (!context) return
    if (!(totalAmount > 0)) {
      toast.error("Nothing outstanding to record")
      return
    }
    type AllocationPayload =
      | { ledgerId: string; amountApplied: number }
      | { monthlyLateFeeId: string; amountApplied: number }
    const allocations: AllocationPayload[] = []
    for (const l of ledgerAllocs) {
      const amt = Math.round(l.outstanding * 100) / 100
      if (amt > 0) allocations.push({ ledgerId: l.ledgerId, amountApplied: amt })
    }
    if (lateAlloc && lateAlloc.outstanding > 0) {
      allocations.push({
        monthlyLateFeeId: lateAlloc.monthlyLateFeeId,
        amountApplied: Math.round(lateAlloc.outstanding * 100) / 100,
      })
    }

    setSubmitting(true)
    try {
      const rounded = Math.round(totalAmount * 100) / 100
      const payload = {
        studentId: context.studentId,
        amount: rounded,
        method,
        paidAt: new Date(paidAt).toISOString(),
        externalTxnRef: ref || null,
        notes: notes || null,
        allocations,
      }
      const res = await fetch("/api/fees/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.message ?? "Failed to record payment")
        return
      }
      const created = (await res.json()) as { id: string; receipt_no: string }
      toast.success(`Payment recorded — Receipt ${created.receipt_no}`)

      const receiptRes = await fetch(`/api/fees/transactions/${created.id}/receipt`)
      if (receiptRes.ok) {
        const { pdf, filename } = (await receiptRes.json()) as {
          pdf: string
          filename: string
        }
        const blob = base64ToBlob(pdf, "application/pdf")
        downloadBlob(blob, filename)
      }
      await onSuccess()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={Boolean(context)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Manual Payment</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="rounded bg-muted/40 p-3 text-xs leading-snug">
            <div className="font-semibold text-sm">{context.studentName}</div>
            {(context.studentClass || context.studentSection) && (
              <div className="text-muted-foreground">
                {context.studentClass ?? ""}
                {context.studentClass && context.studentSection ? " | " : ""}
                {context.studentSection ?? ""}
              </div>
            )}
            <div className="text-muted-foreground">{context.label}</div>
          </div>

          {loadingBlock ? (
            <div className="flex items-center gap-2 text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading outstanding…
            </div>
          ) : !hasFees && !hasLate ? (
            <p className="text-sm text-muted-foreground py-2">
              Nothing outstanding for this month.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">
                Allocations (amounts are fixed; use Waive on the Breakdown
                button to reduce)
              </div>

              {hasFees && (
                <div className="rounded border border-border p-3 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">
                      Fees for {context.label}
                    </div>
                    {feesWaiverTotal > 0 && (
                      <div className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                        <div>Waived ₹{feesWaiverTotal.toFixed(2)}</div>
                        {feesReasons.map((reason, idx) => (
                          <div key={idx} className="pl-3 text-emerald-700 dark:text-emerald-400/80 dark:text-emerald-400/80">
                            • {reason}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="font-mono font-semibold whitespace-nowrap">
                    ₹{feesOutstandingTotal.toFixed(2)}
                  </span>
                </div>
              )}

              {hasLate && lateAlloc && (
                <div className="rounded border border-amber-300 dark:border-amber-700 bg-amber-500/10/40 dark:bg-amber-500/10 p-3 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-amber-700 dark:text-amber-400">
                      Late Fee
                    </div>
                    {lateAlloc.waiverAmount > 0 && (
                      <div className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                        <div>Waived ₹{lateAlloc.waiverAmount.toFixed(2)}</div>
                        {lateReasons.map((reason, idx) => (
                          <div key={idx} className="pl-3 text-emerald-700 dark:text-emerald-400/80 dark:text-emerald-400/80">
                            • {reason}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="font-mono font-semibold whitespace-nowrap text-amber-700 dark:text-amber-400">
                    ₹{lateAlloc.outstanding.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-sm pt-2 border-t border-border mt-1">
                <span className="font-semibold">Total</span>
                <span className="font-mono font-bold">
                  ₹{totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium">Method</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                {METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Paid date</label>
              <Input
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Reference (optional)</label>
              <Input
                value={ref}
                onChange={(e) => setRef(e.target.value)}
                placeholder="UPI ref / cheque no"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Notes (optional)</label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={submit}
              loading={submitting}
              loadingText="Saving…"
              disabled={!(totalAmount > 0)}
            >
              Record & Download Receipt
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function base64ToBlob(base64: string, mime: string): Blob {
  const bin = atob(base64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return new Blob([arr], { type: mime })
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
