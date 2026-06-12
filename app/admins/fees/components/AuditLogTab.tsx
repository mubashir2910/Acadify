"use client"

import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const PAGE_SIZE = 25

type LogEntry = {
  id: string
  action: string
  entity_type: string
  entity_id: string
  reason: string | null
  created_at: string
  actor: { id: string; name: string; role: string } | null
  previous_value: unknown
  new_value: unknown
  studentName: string | null
  entitySummary: string | null
  amount: string | null
}

const ENTITY_LABELS: Record<string, string> = {
  TRANSACTION: "Payment",
  LEDGER: "Ledger",
  STRUCTURE: "Structure",
  WAIVER: "Waiver",
  MONTHLY_LATE_FEE: "Late Fee",
  PAYMENT_CONFIG: "Payment Config",
  SESSION: "Session",
  SCHOOL_BRANDING: "Branding",
  BANK_ACCOUNT: "Bank Account",
  UPI_ACCOUNT: "UPI Account",
  QR_CODE: "QR Code",
}

// Builds a one-line human description from a structured audit row. Always
// prefers data already in `studentName` / `entitySummary` / `amount`; falls
// back to the JSON payload for fields we didn't enrich on the server.
function describe(l: LogEntry): string {
  const who = l.studentName ?? "—"
  const where = l.entitySummary
  const nv = (l.new_value ?? {}) as Record<string, unknown>

  switch (l.action) {
    case "CREATE_WAIVER": {
      const type = String(nv.type ?? "AMOUNT")
      const value = nv.value != null ? Number(nv.value) : null
      const valStr =
        value == null
          ? "—"
          : type === "PERCENT"
            ? `${value}%`
            : `₹${value.toFixed(2)}`
      return `Waived ${valStr} for ${who}${where ? ` — ${where}` : ""}`
    }
    case "REMOVE_WAIVER":
      return `Removed waiver for ${who}${where ? ` — ${where}` : ""}`
    case "WAIVE_MONTHLY_LATE_FEE": {
      const type = String(nv.type ?? "AMOUNT")
      const value = nv.value != null ? Number(nv.value) : null
      const wa = nv.waiver_amount != null ? Number(nv.waiver_amount) : null
      const valStr =
        value != null
          ? type === "PERCENT"
            ? `${value}%`
            : `₹${value.toFixed(2)}`
          : wa != null
            ? `₹${wa.toFixed(2)}`
            : "—"
      return `Waived ${valStr} late fee for ${who}${where ? ` — ${where}` : ""}`
    }
    case "ACCRUE_MONTHLY_LATE_FEE": {
      const delta = nv.delta != null ? Number(nv.delta).toFixed(2) : null
      return `Late fee accrued${delta ? ` (₹${delta})` : ""} for ${who}${where ? ` — ${where}` : ""}`
    }
    case "CREATE_TRANSACTION":
      return `Payment of ₹${l.amount ? Number(l.amount).toFixed(2) : "?"} recorded for ${who}`
    case "VERIFY_TRANSACTION":
      return `Payment of ₹${l.amount ? Number(l.amount).toFixed(2) : "?"} verified for ${who}`
    case "REJECT_TRANSACTION":
      return `Payment of ₹${l.amount ? Number(l.amount).toFixed(2) : "?"} rejected for ${who}`
    case "EDIT_TRANSACTION":
      return `Payment of ₹${l.amount ? Number(l.amount).toFixed(2) : "?"} edited for ${who}`
    case "REFUND_TRANSACTION":
      return `Payment of ₹${l.amount ? Number(l.amount).toFixed(2) : "?"} refunded for ${who}`
    case "EDIT_LEDGER":
      return `Ledger row edited for ${who}${where ? ` — ${where}` : ""}`
    case "WAIVE_LEDGER":
      return `Ledger row waived for ${who}${where ? ` — ${where}` : ""}`
    case "CREATE_STRUCTURE":
      return "Fee structure created"
    case "UPDATE_STRUCTURE":
      return "Fee structure updated"
    case "DELETE_STRUCTURE":
      return "Fee structure deleted"
    case "GENERATE_LEDGER":
      return "Ledger generated"
    case "UPDATE_PAYMENT_CONFIG":
      return "Payment configuration updated"
    case "UPDATE_SCHOOL_BRANDING":
      return "School branding updated"
    case "UPDATE_SESSION":
      return "Session updated"
    default:
      return l.action.replace(/_/g, " ").toLowerCase()
  }
}

export default function AuditLogTab() {
  const [items, setItems] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [entityType, setEntityType] = useState("")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const totalPages = total === 0 ? 0 : Math.ceil(total / PAGE_SIZE)

  async function load(targetPage: number = page) {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (entityType) params.set("entityType", entityType)
      params.set("page", String(targetPage))
      params.set("pageSize", String(PAGE_SIZE))
      const res = await fetch(`/api/fees/audit?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setItems(data.items ?? [])
        setTotal(Number(data.total ?? 0))
      }
    } finally {
      setLoading(false)
    }
  }

  // Reset page when filter changes, then reload.
  useEffect(() => {
    setPage(1)
    void load(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType])

  // Reload when the user navigates pages (skip the initial mount; the
  // entityType effect above handles that path).
  useEffect(() => {
    void load(page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium">Entity type</label>
          <select
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
          >
            <option value="">All</option>
            <option value="TRANSACTION">Payments</option>
            <option value="WAIVER">Waivers</option>
            <option value="MONTHLY_LATE_FEE">Late Fees</option>
            <option value="LEDGER">Ledger</option>
            <option value="STRUCTURE">Structures</option>
            <option value="PAYMENT_CONFIG">Payment Config</option>
            <option value="SESSION">Sessions</option>
          </select>
        </div>
        <Button variant="outline" onClick={() => load(page)} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
        </Button>
      </div>

      {total > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-muted-foreground">
          <span>
            Page {page} of {Math.max(1, totalPages)} · {total}{" "}
            {total === 1 ? "entry" : "entries"}
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-2">
                {page} / {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6">No audit entries.</p>
      ) : (
        <div className="space-y-2">
          {items.map((l) => (
            <div
              key={l.id}
              className="rounded-md border border-border bg-card p-3 text-sm flex items-start gap-3"
            >
              <Badge variant="outline" className="shrink-0">
                {ENTITY_LABELS[l.entity_type] ?? l.entity_type}
              </Badge>
              <div className="flex-1 min-w-0">
                <div className="break-words">{describe(l)}</div>
                {l.reason && (
                  <div className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                    Reason: {l.reason}
                  </div>
                )}
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  by {l.actor?.name ?? "system"}
                  {l.actor?.role ? ` (${l.actor.role})` : ""}
                </div>
              </div>
              <span className="text-[11px] text-muted-foreground shrink-0 whitespace-nowrap pt-0.5">
                {new Date(l.created_at).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
