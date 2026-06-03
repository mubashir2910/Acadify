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
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

type Txn = {
  id: string
  receipt_no: string
  amount: string
  method: string
  status: string
  paid_at: string
  external_txn_ref: string | null
  proof_url: string | null
  rejection_reason: string | null
  student: {
    class: string
    section: string
    user: { name: string; username: string }
  }
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  VERIFIED: "default",
  PENDING_VERIFICATION: "secondary",
  REJECTED: "destructive",
  REFUNDED: "outline",
  CANCELLED: "outline",
}

export default function TransactionsTab() {
  const [items, setItems] = useState<Txn[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("")
  const [rejectionFor, setRejectionFor] = useState<Txn | null>(null)

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (status) params.set("status", status)
      params.set("pageSize", "200")
      const res = await fetch(`/api/fees/transactions?${params.toString()}`)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

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
      const blob = new Blob([arr], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <label className="text-xs font-medium">Search</label>
          <Input
            placeholder="Receipt / student / ref"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Status</label>
          <select
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All</option>
            <option value="VERIFIED">Verified</option>
            <option value="PENDING_VERIFICATION">Pending</option>
            <option value="REJECTED">Rejected</option>
            <option value="REFUNDED">Refunded</option>
          </select>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6">No transactions found.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left px-3 py-2">Receipt</th>
                <th className="text-left px-3 py-2">Date</th>
                <th className="text-left px-3 py-2">Student</th>
                <th className="text-right px-3 py-2">Amount</th>
                <th className="text-left px-3 py-2">Method</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr key={t.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-3 py-2 font-mono text-xs">{t.receipt_no}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {new Date(t.paid_at).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{t.student.user.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.student.class}-{t.student.section}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    ₹{Number(t.amount).toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{t.method}</td>
                  <td className="px-3 py-2">
                    <Badge variant={STATUS_VARIANT[t.status] ?? "outline"}>
                      {t.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    {t.status === "VERIFIED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadReceipt(t.id)}
                      >
                        Receipt
                      </Button>
                    )}
                    {t.status === "REJECTED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRejectionFor(t)}
                      >
                        Reason
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <RejectionDetailsModal
        txn={rejectionFor}
        onClose={() => setRejectionFor(null)}
      />
    </div>
  )
}

function RejectionDetailsModal({
  txn,
  onClose,
}: {
  txn: Txn | null
  onClose: () => void
}) {
  if (!txn) return null
  const proofUrl = txn.proof_url
  // Guess content type from extension so we know whether to inline an
  // <img> preview or just link to the PDF / unknown file.
  const isImage = proofUrl
    ? /\.(png|jpe?g|gif|webp|bmp)(\?|#|$)/i.test(proofUrl)
    : false
  const isPdf = proofUrl ? /\.pdf(\?|#|$)/i.test(proofUrl) : false

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rejected payment — {txn.receipt_no}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="rounded bg-muted/40 p-3 text-xs space-y-0.5">
            <div className="font-semibold text-sm">{txn.student.user.name}</div>
            <div className="text-muted-foreground">
              {txn.student.class}-{txn.student.section} · {txn.student.user.username}
            </div>
            <div className="text-muted-foreground">
              Amount: ₹{Number(txn.amount).toFixed(2)} · {txn.method}
              {txn.external_txn_ref && ` · Ref ${txn.external_txn_ref}`}
            </div>
            <div className="text-muted-foreground">
              Submitted {new Date(txn.paid_at).toLocaleDateString()}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Rejection reason
            </div>
            <div className="rounded border border-destructive/30 bg-destructive/10 p-3 text-destructive">
              {txn.rejection_reason?.trim() || "No reason recorded."}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Payment proof uploaded by student
            </div>
            {!proofUrl ? (
              <p className="text-xs text-muted-foreground italic">
                No proof file was attached to this submission.
              </p>
            ) : isImage ? (
              <div className="space-y-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={proofUrl}
                  alt="Payment proof"
                  className="max-h-80 w-auto rounded border border-border"
                />
                <a
                  href={proofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary underline-offset-2 hover:underline"
                >
                  Open full size in new tab ↗
                </a>
              </div>
            ) : isPdf ? (
              <a
                href={proofUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-xs text-primary underline-offset-2 hover:underline"
              >
                Open uploaded PDF in new tab ↗
              </a>
            ) : (
              <a
                href={proofUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-xs text-primary underline-offset-2 hover:underline"
              >
                Open uploaded file in new tab ↗
              </a>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
