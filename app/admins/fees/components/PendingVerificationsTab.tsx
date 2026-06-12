"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

type PendingAllocation = {
  ledger: { head_name_snapshot: string; period_label: string } | null
  monthly_late_fee: { period_year: number; period_month: number } | null
}

type PendingTxn = {
  id: string
  receipt_no: string
  amount: string
  method: string
  external_txn_ref: string | null
  proof_url: string | null
  paid_at: string
  created_at: string
  student: {
    class: string
    section: string
    roll_no: string
    user: { name: string; username: string }
  }
  allocations: PendingAllocation[]
}

function describeAllocation(a: PendingAllocation): string {
  if (a.ledger) {
    return `${a.ledger.head_name_snapshot} — ${a.ledger.period_label}`
  }
  if (a.monthly_late_fee) {
    const m = a.monthly_late_fee.period_month
    const label =
      m >= 1 && m <= 12
        ? `${MONTH_LABELS[m - 1]} ${a.monthly_late_fee.period_year}`
        : `${a.monthly_late_fee.period_year}-${m}`
    return `Late Fee — ${label}`
  }
  return "Unknown allocation"
}

export default function PendingVerificationsTab() {
  const [items, setItems] = useState<PendingTxn[]>([])
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState<string | null>(null)
  const [approvingFor, setApprovingFor] = useState<PendingTxn | null>(null)
  const [rejectingFor, setRejectingFor] = useState<PendingTxn | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch("/api/fees/transactions/pending")
      if (res.ok) {
        const data = await res.json()
        setItems(data.items ?? [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function approve(id: string) {
    setVerifying(id)
    try {
      const res = await fetch(`/api/fees/transactions/${id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.message ?? "Failed to verify")
        return
      }
      toast.success("Verified")
      await load()
    } finally {
      setVerifying(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Review and approve/reject payment proofs uploaded by parents.
        </p>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6">
          No pending verifications. 🎉
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((t) => (
            <div
              key={t.id}
              className="rounded-md border border-border bg-card p-4 space-y-3"
            >
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div>
                  <div className="font-medium">{t.student.user.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {t.student.user.username} · {t.student.class}-{t.student.section}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Receipt: {t.receipt_no} · Submitted{" "}
                    {new Date(t.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold font-mono">
                    ₹{Number(t.amount).toFixed(2)}
                  </div>
                  <Badge variant="secondary">{t.method}</Badge>
                </div>
              </div>

              <div className="text-xs">
                <div className="font-medium mb-1">Allocations:</div>
                <ul className="list-disc list-inside text-muted-foreground">
                  {t.allocations.map((a, i) => (
                    <li key={i}>{describeAllocation(a)}</li>
                  ))}
                </ul>
              </div>

              {t.external_txn_ref && (
                <div className="text-xs">
                  <span className="font-medium">Reference: </span>
                  <span className="font-mono">{t.external_txn_ref}</span>
                </div>
              )}

              {t.proof_url && (
                <div>
                  <a
                    href={t.proof_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 dark:text-blue-400 underline"
                  >
                    View payment proof →
                  </a>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRejectingFor(t)}
                >
                  Reject
                </Button>
                <Button
                  size="sm"
                  onClick={() => setApprovingFor(t)}
                  disabled={verifying === t.id}
                >
                  Approve
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ApproveConfirmModal
        txn={approvingFor}
        submitting={Boolean(approvingFor && verifying === approvingFor.id)}
        onCancel={() => setApprovingFor(null)}
        onConfirm={async () => {
          if (!approvingFor) return
          const id = approvingFor.id
          // Close the modal immediately so the approving spinner shows on
          // the row's Approve button (parent state). The actual API call
          // continues in the background.
          setApprovingFor(null)
          await approve(id)
        }}
      />

      <RejectModal
        txn={rejectingFor}
        onClose={() => setRejectingFor(null)}
        onSuccess={async () => {
          setRejectingFor(null)
          await load()
        }}
      />
    </div>
  )
}

function ApproveConfirmModal({
  txn,
  submitting,
  onCancel,
  onConfirm,
}: {
  txn: PendingTxn | null
  submitting: boolean
  onCancel: () => void
  onConfirm: () => Promise<void> | void
}) {
  if (!txn) return null

  return (
    <Dialog open={Boolean(txn)} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve this payment?</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Approving marks the transaction VERIFIED and applies it to the
            student's ledger — this is hard to undo. Please confirm the
            details below match the payment proof.
          </p>

          <div className="rounded bg-muted/40 p-3 text-xs space-y-0.5">
            <div className="font-semibold text-sm">{txn.student.user.name}</div>
            <div className="text-muted-foreground">
              {txn.student.user.username} · Class {txn.student.class}-
              {txn.student.section} · Roll {txn.student.roll_no}
            </div>
            <div className="text-muted-foreground">
              Amount: <span className="font-mono">₹{Number(txn.amount).toFixed(2)}</span> ·{" "}
              {txn.method}
              {txn.external_txn_ref && (
                <> · Ref <span className="font-mono">{txn.external_txn_ref}</span></>
              )}
            </div>
            <div className="text-muted-foreground">
              Receipt: <span className="font-mono">{txn.receipt_no}</span>
            </div>
          </div>

          <div className="text-xs">
            <div className="font-medium mb-1">Will allocate to:</div>
            <ul className="list-disc list-inside text-muted-foreground">
              {txn.allocations.map((a, i) => (
                <li key={i}>{describeAllocation(a)}</li>
              ))}
            </ul>
          </div>

          {txn.proof_url && (
            <a
              href={txn.proof_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 dark:text-blue-400 underline"
            >
              View payment proof →
            </a>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={onCancel} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              loading={submitting}
              loadingText="Approving…"
            >
              Confirm &amp; Approve
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function RejectModal({
  txn,
  onClose,
  onSuccess,
}: {
  txn: PendingTxn | null
  onClose: () => void
  onSuccess: () => Promise<void> | void
}) {
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (txn) setReason("")
  }, [txn])

  if (!txn) return null

  async function submit() {
    if (!txn) return
    if (reason.trim().length < 5) {
      toast.error("Reason must be at least 5 characters")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/fees/transactions/${txn.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.message ?? "Failed to reject")
        return
      }
      toast.success("Rejected — parent will see the reason")
      await onSuccess()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={Boolean(txn)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject Payment</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground text-xs">
            The reason is visible to the parent — be specific.
          </p>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for rejection"
          />
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={submit}
              loading={submitting}
              loadingText="Rejecting…"
            >
              Reject
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
