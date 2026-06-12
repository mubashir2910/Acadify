"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Upload, Loader2, Clock, Copy } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { MonthlyBlock, PublicConfig } from "./StudentFeesSection"

const METHODS = ["UPI_OFFLINE", "BANK_TRANSFER", "CHEQUE"]
const SESSION_MS = 2 * 60 * 1000 // 2-minute payment session

function formatMmSs(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const mm = Math.floor(total / 60)
  const ss = total % 60
  return `${mm}:${String(ss).padStart(2, "0")}`
}

type AllocationDraft = {
  ledgerId?: string
  monthlyLateFeeId?: string
  label: string
  amount: number
}

function buildAllocationDrafts(block: MonthlyBlock): AllocationDraft[] {
  const drafts: AllocationDraft[] = []
  for (const r of block.ledgerRows) {
    const remaining = Math.max(
      0,
      Number(r.expected) - Number(r.waiver) - Number(r.paid),
    )
    if (remaining > 0) {
      drafts.push({
        ledgerId: r.id,
        label: `${r.head_name_snapshot} — ${r.period_label}`,
        amount: Number(remaining.toFixed(2)),
      })
    }
  }
  if (block.lateFee && !block.lateFee.waived) {
    const lateRemaining = Math.max(
      0,
      Number(block.lateFee.amount) - Number(block.lateFee.paid),
    )
    if (lateRemaining > 0) {
      drafts.push({
        monthlyLateFeeId: block.lateFee.id,
        label: `Late fee — ${block.label}`,
        amount: Number(lateRemaining.toFixed(2)),
      })
    }
  }
  return drafts
}

export default function HybridPayModal({
  block,
  schoolCode,
  onClose,
  onSuccess,
}: {
  block: MonthlyBlock | null
  schoolCode: string | null
  onClose: () => void
  onSuccess: () => Promise<void> | void
}) {
  const [method, setMethod] = useState("UPI_OFFLINE")
  const [ref, setRef] = useState("")
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState("")
  const [proofUrl, setProofUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [drafts, setDrafts] = useState<AllocationDraft[]>([])
  const [remainingMs, setRemainingMs] = useState(SESSION_MS)
  const expiryRef = useRef<number | null>(null)

  // Fresh payment config fetched the moment the modal opens. The parent's
  // `config` may be stale if the admin updated bank/UPI/QR mid-session — we
  // re-fetch here so the student always sees the latest payment details
  // without needing a hard page refresh.
  const [freshConfig, setFreshConfig] = useState<PublicConfig | null>(null)
  const [loadingConfig, setLoadingConfig] = useState(false)

  // Which payment-method tab is showing inside the "Pay to school" panel.
  // Null until freshConfig resolves; the effect below picks a default in
  // bank → upi → qr priority and respects the student's later clicks.
  const [activeTab, setActiveTab] = useState<"bank" | "upi" | "qr" | null>(null)

  useEffect(() => {
    if (!block) return
    const built = buildAllocationDrafts(block)
    setDrafts(built)
    setMethod("UPI_OFFLINE")
    setRef("")
    setPaidAt(new Date().toISOString().slice(0, 10))
    setNotes("")
    setProofUrl(null)
    expiryRef.current = Date.now() + SESSION_MS
    setRemainingMs(SESSION_MS)
  }, [block])

  // Amount is fixed: always equals the sum of unpaid allocations in this
  // month. The student cannot under/over-pay — partial relief must come
  // from a school-side waiver, not from changing this number.
  const totalAmount = drafts.reduce((s, d) => s + d.amount, 0)

  // Whenever a fresh payment-config arrives, ensure `activeTab` points at a
  // method that's actually configured. Picks bank > upi > qr by default,
  // but preserves the student's current selection if it's still valid.
  useEffect(() => {
    if (!freshConfig) return
    const hasBank = Boolean(freshConfig.active_bank_account)
    const hasUpi = Boolean(freshConfig.active_upi_account)
    const hasQr = Boolean(freshConfig.active_qr_code)
    const stillValid =
      (activeTab === "bank" && hasBank) ||
      (activeTab === "upi" && hasUpi) ||
      (activeTab === "qr" && hasQr)
    if (stillValid) return
    if (hasBank) setActiveTab("bank")
    else if (hasUpi) setActiveTab("upi")
    else if (hasQr) setActiveTab("qr")
    else setActiveTab(null)
  }, [freshConfig, activeTab])

  // Fetch fresh payment-config on every open so bank/UPI/QR shown to the
  // student is whatever the admin saved most recently.
  useEffect(() => {
    if (!block || !schoolCode) {
      setFreshConfig(null)
      return
    }
    let cancelled = false
    setLoadingConfig(true)
    void (async () => {
      try {
        const res = await fetch(`/api/schools/${schoolCode}/payment-config`, {
          cache: "no-store",
        })
        if (!res.ok) {
          toast.error("Could not load latest payment details — please retry")
          return
        }
        const data = (await res.json()) as PublicConfig
        if (!cancelled) setFreshConfig(data)
      } catch {
        if (!cancelled) toast.error("Network error loading payment details")
      } finally {
        if (!cancelled) setLoadingConfig(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [block, schoolCode])

  // 2-minute session timer
  useEffect(() => {
    if (!block) return
    const interval = setInterval(() => {
      if (!expiryRef.current) return
      const remaining = expiryRef.current - Date.now()
      setRemainingMs(remaining)
      if (remaining <= 0) {
        clearInterval(interval)
        toast.error("Payment session expired — please retry")
        onClose()
      }
    }, 500)
    return () => clearInterval(interval)
  }, [block, onClose])

  if (!block) return null

  async function upload(file: File) {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/upload/payment-proof", { method: "POST", body: fd })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.message ?? "Upload failed")
        return
      }
      const data = (await res.json()) as { url: string }
      setProofUrl(data.url)
      // Bump the timer by 60 s on a successful upload so the user isn't punished for slow connections
      if (expiryRef.current) {
        expiryRef.current = Math.max(expiryRef.current, Date.now() + 60_000)
      }
      toast.success("Proof uploaded")
    } finally {
      setUploading(false)
    }
  }

  async function submit() {
    if (!proofUrl) {
      toast.error("Please upload payment proof")
      return
    }
    if (ref.trim().length < 6) {
      toast.error("Reference must be at least 6 characters")
      return
    }
    if (!(totalAmount > 0)) {
      toast.error("Nothing to pay for in this month")
      return
    }
    if (drafts.length === 0) {
      toast.error("Nothing to pay for in this month")
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        amount: Number(totalAmount.toFixed(2)),
        method,
        externalTxnRef: ref,
        proofUrl,
        paidAt: new Date(paidAt).toISOString(),
        notes: notes || null,
        allocations: drafts.map((d) => ({
          ledgerId: d.ledgerId,
          monthlyLateFeeId: d.monthlyLateFeeId,
          amountApplied: Number(d.amount.toFixed(2)),
        })),
      }
      const res = await fetch("/api/fees/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.message ?? "Failed to submit")
        return
      }
      toast.success("Submitted for verification — you'll be notified once approved.")
      await onSuccess()
    } finally {
      setSubmitting(false)
    }
  }

  const bank = freshConfig?.active_bank_account ?? null
  const upi = freshConfig?.active_upi_account ?? null
  const qr = freshConfig?.active_qr_code ?? null
  const noPaymentMethodConfigured =
    !loadingConfig && freshConfig != null && !bank && !upi && !qr

  const expiring = remainingMs <= 30_000

  return (
    <Dialog open={Boolean(block)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>Pay fees — {block.label}</span>
            <span
              className={`flex items-center gap-1 text-xs font-mono ${
                expiring ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              {formatMmSs(remainingMs)}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          {loadingConfig ? (
            <div className="rounded-md border border-border bg-muted/30 p-3 text-xs flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Fetching latest payment details…
            </div>
          ) : noPaymentMethodConfigured ? (
            <div className="rounded-md border border-amber-300 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
              The school hasn&apos;t configured any payment methods yet. Please reach out to the office.
            </div>
          ) : (
            <div className="rounded-md border border-border bg-muted/30 p-3 text-xs space-y-2">
              <h4 className="font-semibold text-sm">
                Pay to School through the following details:
              </h4>

              <div className="flex flex-wrap gap-2">
                {bank && (
                  <PayMethodTab
                    label="Bank Details"
                    active={activeTab === "bank"}
                    onClick={() => setActiveTab("bank")}
                  />
                )}
                {upi && (
                  <PayMethodTab
                    label="UPI ID"
                    active={activeTab === "upi"}
                    onClick={() => setActiveTab("upi")}
                  />
                )}
                {qr && (
                  <PayMethodTab
                    label="QR Code"
                    active={activeTab === "qr"}
                    onClick={() => setActiveTab("qr")}
                  />
                )}
              </div>

              {activeTab === "bank" && bank && (
                <div className="space-y-1 pt-1">
                  <CopyableField label="A/C holder" value={bank.account_holder} />
                  <CopyableField label="Bank" value={bank.bank_name} />
                  <CopyableField label="A/C no" value={bank.account_number} mono />
                  <CopyableField label="IFSC" value={bank.ifsc} mono />
                  {bank.branch && (
                    <div>
                      <span className="text-muted-foreground">Branch: </span>
                      {bank.branch}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "upi" && upi && (
                <div className="space-y-1 pt-1">
                  <CopyableField label="UPI ID" value={upi.upi_id} mono />
                  {upi.label && (
                    <div className="text-muted-foreground italic">{upi.label}</div>
                  )}
                </div>
              )}

              {activeTab === "qr" && qr && (
                <div className="space-y-1 pt-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qr.image_url}
                    alt={qr.caption}
                    className="h-32 w-32 rounded border"
                  />
                  <p className="text-xs text-muted-foreground italic">{qr.caption}</p>
                </div>
              )}
            </div>
          )}

          <div className="rounded-md border border-border bg-card p-3 text-xs space-y-1">
            <div className="font-semibold text-sm mb-1">Paying for</div>
            {drafts.length === 0 ? (
              <p className="text-muted-foreground italic">Nothing outstanding.</p>
            ) : (
              drafts.map((d, i) => (
                <div key={`${d.ledgerId ?? d.monthlyLateFeeId}-${i}`} className="flex justify-between">
                  <span>{d.label}</span>
                  <span className="font-mono">₹{d.amount.toFixed(2)}</span>
                </div>
              ))
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium">Amount to pay</label>
              <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted/40 px-3 py-2 text-sm font-mono font-semibold">
                ₹{totalAmount.toFixed(2)}
              </div>
            </div>
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
              <label className="text-xs font-medium">
                Transaction reference (UPI ref / cheque no)
              </label>
              <Input
                value={ref}
                onChange={(e) => setRef(e.target.value)}
                placeholder="123456789012"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Paid date</label>
              <Input
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Notes (optional)</label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium">
              Payment proof (screenshot / receipt PDF, max 3MB)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void upload(f)
                }}
                className="text-xs"
              />
              {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
              {proofUrl && (
                <a
                  href={proofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-emerald-700 dark:text-emerald-400 underline"
                >
                  ✓ Uploaded
                </a>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={submitting || !proofUrl}>
              {submitting ? (
                "Submitting…"
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-1" /> Submit for verification
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function PayMethodTab({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "border-foreground bg-card text-foreground"
          : "border-border bg-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  )
}

function CopyableField({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      toast.success("Copied")
    } catch {
      toast.error("Couldn't copy — please copy manually")
    }
  }
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">{label}:</span>
      <span className={mono ? "font-mono" : ""}>{value}</span>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy ${label}`}
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        <Copy className="h-3 w-3" />
      </button>
    </div>
  )
}
