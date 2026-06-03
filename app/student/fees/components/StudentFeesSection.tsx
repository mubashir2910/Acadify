"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Download } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import HybridPayModal from "./HybridPayModal"
import MonthlyBlockCard from "./MonthlyBlockCard"
import MonthlyBreakdownModal from "./MonthlyBreakdownModal"

export type LedgerRowInBlock = {
  id: string
  head_name_snapshot: string
  head_category: string
  period_label: string
  expected: string
  waiver: string
  waiverReason: string | null
  paid: string
  status: string
}

export type MonthlyBlock = {
  year: number
  month: number
  label: string
  status: "PAID" | "PARTIAL" | "PENDING" | "OVERDUE" | "EMPTY"
  totalExpected: string
  totalWaiver: string
  totalPaid: string
  totalDue: string
  dueDate: string | null
  lateFee: {
    id: string
    amount: string
    paid: string
    waiverAmount: string
    waiverReason: string | null
    waived: boolean
  } | null
  ledgerRows: LedgerRowInBlock[]
}

type TxnAllocation = {
  ledger: { period_year: number; period_month: number } | null
  monthly_late_fee: { period_year: number; period_month: number } | null
}

type Txn = {
  id: string
  receipt_no: string
  amount: string
  method: string
  status: string
  paid_at: string
  rejection_reason: string | null
  allocations: TxnAllocation[]
}

type ActiveBankAccount = {
  id: string
  label: string | null
  account_holder: string
  bank_name: string
  account_number: string
  ifsc: string
  branch: string | null
  account_type: string | null
}
type ActiveUpiAccount = { id: string; label: string | null; upi_id: string }
type ActiveQrCode = {
  id: string
  label: string | null
  caption: string
  image_url: string
  bank_account_id: string | null
}

export type PublicConfig = {
  payment_mode?: "FULL_MANUAL" | "FULL_ONLINE" | "HYBRID" | null
  currency?: string
  active_bank_account?: ActiveBankAccount | null
  active_upi_account?: ActiveUpiAccount | null
  active_qr_code?: ActiveQrCode | null
}

export default function StudentFeesSection() {
  const [schoolCode, setSchoolCode] = useState<string | null>(null)
  const [config, setConfig] = useState<PublicConfig | null>(null)
  const [blocks, setBlocks] = useState<MonthlyBlock[]>([])
  const [txns, setTxns] = useState<Txn[]>([])
  const [loading, setLoading] = useState(true)
  const [openBlock, setOpenBlock] = useState<MonthlyBlock | null>(null)
  const [payBlock, setPayBlock] = useState<MonthlyBlock | null>(null)

  const TABS = useMemo(() => {
    const base: { id: string; label: string }[] = [
      { id: "dues", label: "Monthly Dues" },
      { id: "history", label: "Payment History" },
    ]
    if (config?.payment_mode !== "FULL_MANUAL") {
      base.push({ id: "pending", label: "Pending Verifications" })
    }
    return base
  }, [config?.payment_mode])
  const [active, setActive] = useState<string>("dues")

  // If admin flipped mode to FULL_MANUAL while user was on the Pending tab, hop them off
  useEffect(() => {
    if (active === "pending" && !TABS.some((t) => t.id === "pending")) {
      setActive("dues")
    }
  }, [active, TABS])

  async function load() {
    setLoading(true)
    try {
      const [blocksRes, txnRes] = await Promise.all([
        fetch("/api/fees/monthly-blocks"),
        fetch("/api/fees/transactions?pageSize=200"),
      ])
      if (blocksRes.ok) {
        const data = await blocksRes.json()
        setBlocks(data.blocks ?? [])
      }
      if (txnRes.ok) {
        const data = await txnRes.json()
        setTxns(data.items ?? [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch("/api/profile")
        if (r.ok) {
          const data = await r.json()
          // /api/profile returns the user with `students: [{ school }]` (plural,
          // from getStudentProfile). The older singular `student` lookup was a
          // dead branch and left schoolCode null for every student.
          const code =
            data?.students?.[0]?.school?.schoolCode ??
            data?.teachers?.[0]?.school?.schoolCode ??
            data?.schoolUsers?.[0]?.school?.schoolCode ??
            null
          if (code) setSchoolCode(code)
        }
      } catch {
        /* non-critical */
      }
    })()
    void load()
  }, [])

  useEffect(() => {
    if (!schoolCode) return
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch(`/api/schools/${schoolCode}/payment-config`)
        if (!res.ok) {
          toast.error("Could not load payment settings — pay options may be unavailable")
          return
        }
        const data = await res.json()
        if (!cancelled) setConfig(data)
      } catch {
        if (!cancelled) toast.error("Network error while loading payment settings")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [schoolCode])

  async function downloadReceipt(id: string) {
    try {
      const res = await fetch(`/api/fees/transactions/${id}/receipt`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.message ?? "Receipt unavailable")
        return
      }
      const { pdf, filename } = (await res.json()) as { pdf: string; filename: string }
      const bin = atob(pdf)
      const arr = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
      const url = URL.createObjectURL(new Blob([arr], { type: "application/pdf" }))
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
      toast.error("Failed to download receipt")
    }
  }

  const visibleBlocks = blocks.filter((b) => b.status !== "EMPTY")

  // Set of "year-month" keys for any month that already has a
  // PENDING_VERIFICATION transaction. Pay Now is locked on these months
  // until the admin approves or rejects the prior submission, preventing
  // duplicate proofs for the same period. Rejected/refunded txns don't
  // lock — the parent must be able to retry after a rejection.
  const lockedMonths = useMemo(() => {
    const set = new Set<string>()
    for (const t of txns) {
      if (t.status !== "PENDING_VERIFICATION") continue
      for (const a of t.allocations ?? []) {
        const period = a.ledger ?? a.monthly_late_fee
        if (period) set.add(`${period.period_year}-${period.period_month}`)
      }
    }
    return set
  }, [txns])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={cn(
              "px-3 py-1.5 text-sm rounded-md",
              active === t.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : active === "dues" ? (
        <div className="space-y-3">
          {visibleBlocks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6">
              No fees due — you&apos;re all caught up.
            </p>
          ) : (
            visibleBlocks.map((b) => {
              const isHybrid = config?.payment_mode === "HYBRID"
              const hasOnlinePayMethod = Boolean(
                config?.active_bank_account ||
                  config?.active_upi_account ||
                  config?.active_qr_code,
              )
              const isLocked = lockedMonths.has(`${b.year}-${b.month}`)
              const canPay =
                isHybrid && hasOnlinePayMethod && Number(b.totalDue) > 0 && !isLocked

              let disabledReason: string | null = null
              if (!config || !config.payment_mode) {
                disabledReason =
                  "Payment settings not configured yet — contact your school admin"
              } else if (config.payment_mode === "FULL_MANUAL") {
                disabledReason = "Pay at the school office"
              } else if (config.payment_mode === "FULL_ONLINE") {
                disabledReason = "Online gateway coming soon"
              } else if (isHybrid && !hasOnlinePayMethod) {
                disabledReason = "School hasn't published payment details yet"
              } else if (isHybrid && Number(b.totalDue) <= 0) {
                disabledReason = null
              }

              return (
                <MonthlyBlockCard
                  key={`${b.year}-${b.month}`}
                  block={b}
                  onBreakdown={() => setOpenBlock(b)}
                  onPay={canPay ? () => setPayBlock(b) : undefined}
                  payDisabledReason={disabledReason}
                  awaitingVerification={isLocked}
                />
              )
            })
          )}
        </div>
      ) : active === "history" ? (
        <div className="space-y-2">
          {txns.filter((t) => t.status === "VERIFIED" || t.status === "REFUNDED").length === 0 ? (
            <p className="text-sm text-muted-foreground py-6">No payments yet.</p>
          ) : (
            txns
              .filter((t) => t.status === "VERIFIED" || t.status === "REFUNDED")
              .map((t) => (
                <div
                  key={t.id}
                  className="rounded-md border border-border bg-card p-3 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="font-medium text-sm">₹{Number(t.amount).toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.receipt_no} · {new Date(t.paid_at).toLocaleDateString()} · {t.method}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => downloadReceipt(t.id)}>
                    <Download className="h-4 w-4 mr-1" /> Receipt
                  </Button>
                </div>
              ))
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {txns.filter((t) => ["PENDING_VERIFICATION", "REJECTED"].includes(t.status)).length ===
          0 ? (
            <p className="text-sm text-muted-foreground py-6">No uploads awaiting verification.</p>
          ) : (
            txns
              .filter((t) => ["PENDING_VERIFICATION", "REJECTED"].includes(t.status))
              .map((t) => (
                <div
                  key={t.id}
                  className="rounded-md border border-border bg-card p-3 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">₹{Number(t.amount).toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">
                        {t.receipt_no} · submitted {new Date(t.paid_at).toLocaleDateString()}
                      </div>
                    </div>
                    <Badge variant={t.status === "REJECTED" ? "destructive" : "secondary"}>
                      {t.status}
                    </Badge>
                  </div>
                  {t.rejection_reason && (
                    <div className="text-xs text-destructive bg-destructive/10 rounded p-2">
                      Reason: {t.rejection_reason}
                    </div>
                  )}
                </div>
              ))
          )}
        </div>
      )}

      <MonthlyBreakdownModal
        block={openBlock}
        currency={config?.currency ?? "INR"}
        onClose={() => setOpenBlock(null)}
        onPay={
          config?.payment_mode === "HYBRID"
            ? () => {
                if (openBlock) {
                  setPayBlock(openBlock)
                  setOpenBlock(null)
                }
              }
            : undefined
        }
      />

      <HybridPayModal
        block={payBlock}
        schoolCode={schoolCode}
        onClose={() => setPayBlock(null)}
        onSuccess={async () => {
          setPayBlock(null)
          await load()
        }}
      />
    </div>
  )
}
