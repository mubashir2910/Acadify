"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Loader2, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import MonthMarkPaidModal, { type MonthPaymentContext } from "./MonthMarkPaidModal"
import WaiverModal, { type WaiverTarget } from "./WaiverModal"
import WaiveLateFeeModal, { type MonthlyLateFeeRow } from "./WaiveLateFeeModal"

type AdminRow = {
  studentId: string
  studentName: string
  username: string
  class: string
  section: string
  rollNo: string
  year: number
  month: number
  label: string
  status: "PAID" | "PARTIAL" | "PENDING" | "OVERDUE" | "EMPTY"
  totalExpected: string
  totalWaiver: string
  totalPaid: string
  totalDue: string
  lateAmount: string
  latePaid: string
  lateWaiverAmount: string
  lateWaiverReason: string | null
  lateWaived: boolean
  lateFeeId: string | null
  dueDate: string | null
}

type Summary = {
  totalExpected: string
  totalCollected: string
  totalOutstanding: string
  totalWaived: string
  totalExpectedAnnual: string
  totalLateExpected: string
  totalLateWaived: string
  totalLateOutstanding: string
  totalLateCollected: string
  studentsCount: number
  monthsCount: number
}

type Pagination = {
  page: number
  pageSize: number
  totalStudents: number
  totalPages: number
}

type Session = { id: string; name: string; is_current: boolean }
type ClassGroup = { class: string; sections: string[] }
type PaymentMode = "FULL_MANUAL" | "FULL_ONLINE" | "HYBRID"

type LedgerDetail = {
  id: string
  fee_head_id: string | null
  head_name_snapshot: string
  period_label: string
  expected_amount: string
  waiver_amount: string
  waiver_reason: string | null
  paid_amount: string
  status: string
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  PAID: "default",
  PARTIAL: "secondary",
  PENDING: "outline",
  OVERDUE: "destructive",
  EMPTY: "outline",
}

export default function LedgerTab() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [classes, setClasses] = useState<ClassGroup[]>([])
  const [sessionId, setSessionId] = useState<string>("")
  const [cls, setCls] = useState("")
  const [section, setSection] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize] = useState(25)
  const [rows, setRows] = useState<AdminRow[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [paymentMode, setPaymentMode] = useState<PaymentMode | null>(null)
  const [loading, setLoading] = useState(true)

  const [breakdownFor, setBreakdownFor] = useState<AdminRow | null>(null)
  const [breakdownRows, setBreakdownRows] = useState<LedgerDetail[] | null>(null)
  const [breakdownLoading, setBreakdownLoading] = useState(false)
  const [monthPayContext, setMonthPayContext] = useState<MonthPaymentContext | null>(null)
  const [waiverTarget, setWaiverTarget] = useState<WaiverTarget | null>(null)
  const [waiveLateFor, setWaiveLateFor] = useState<MonthlyLateFeeRow | null>(null)

  const selectedClassGroup = useMemo(
    () => classes.find((c) => c.class === cls),
    [classes, cls],
  )

  async function load(opts?: { resetPage?: boolean }): Promise<AdminRow[]> {
    setLoading(true)
    const pg = opts?.resetPage ? 1 : page
    if (opts?.resetPage) setPage(1)
    try {
      const p = new URLSearchParams()
      if (sessionId) p.set("sessionId", sessionId)
      if (cls) p.set("class", cls)
      if (section) p.set("section", section)
      if (statusFilter) p.set("status", statusFilter)
      if (search) p.set("search", search)
      p.set("page", String(pg))
      p.set("pageSize", String(pageSize))
      const res = await fetch(`/api/fees/monthly-blocks/admin?${p.toString()}`)
      if (res.ok) {
        const data = await res.json()
        const nextRows: AdminRow[] = data.rows ?? []
        setRows(nextRows)
        setSummary(data.summary ?? null)
        setPagination(data.pagination ?? null)
        return nextRows
      }
      const err = await res.json().catch(() => ({}))
      toast.error(err.message ?? "Failed to load")
      return []
    } finally {
      setLoading(false)
    }
  }

  // Used by all mutation success callbacks: reload the table, then if the
  // breakdown dialog is open, swap `breakdownFor` to the freshly-loaded row
  // so the dialog's "Month total due" updates instantly. Critically, we pass
  // the fresh `match` into openBreakdown — passing the closure-captured
  // `breakdownFor` would let openBreakdown's internal `setBreakdownFor(row)`
  // overwrite the just-updated state with the stale row.
  async function refreshAfterMutation() {
    const nextRows = await load()
    if (breakdownFor) {
      const match = nextRows.find(
        (r) =>
          r.studentId === breakdownFor.studentId &&
          r.year === breakdownFor.year &&
          r.month === breakdownFor.month,
      )
      await openBreakdown(match ?? breakdownFor)
    }
  }

  // Initial: load sessions, classes, payment-mode (for row-level Mark Paid
  // visibility), then load the ledger.
  useEffect(() => {
    void (async () => {
      const [sRes, cRes, profileRes] = await Promise.all([
        fetch("/api/sessions"),
        fetch("/api/admin/classes"),
        fetch("/api/profile"),
      ])
      if (sRes.ok) setSessions(await sRes.json())
      if (cRes.ok) setClasses((await cRes.json()).classes ?? [])
      if (profileRes.ok) {
        const prof = await profileRes.json()
        const code: string | undefined = prof?.schoolUsers?.[0]?.school?.schoolCode
        if (code) {
          const cfgRes = await fetch(`/api/schools/${code}/payment-config`)
          if (cfgRes.ok) {
            const cfg = await cfgRes.json()
            const mode = cfg?.payment_mode ?? cfg?.paymentMode ?? null
            if (mode === "FULL_MANUAL" || mode === "HYBRID" || mode === "FULL_ONLINE") {
              setPaymentMode(mode)
            }
          }
        }
      }
      void load()
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reload whenever page changes (but not on filter changes — those reset page
  // via load({ resetPage: true }) which also flips the page state).
  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  async function openBreakdown(row: AdminRow) {
    setBreakdownFor(row)
    setBreakdownRows(null)
    setBreakdownLoading(true)
    try {
      const p = new URLSearchParams()
      p.set("studentId", row.studentId)
      const res = await fetch(`/api/fees/monthly-blocks?${p.toString()}`)
      if (!res.ok) {
        toast.error("Failed to load breakdown")
        return
      }
      const data = await res.json()
      const block = (data.blocks ?? []).find(
        (b: { year: number; month: number }) => b.year === row.year && b.month === row.month,
      )
      if (block) {
        setBreakdownRows(
          (block.ledgerRows ?? []).map((r: LedgerDetail) => ({
            id: r.id,
            fee_head_id: r.fee_head_id ?? null,
            head_name_snapshot: r.head_name_snapshot,
            period_label: r.period_label,
            expected_amount: String((r as unknown as { expected: string }).expected ?? r.expected_amount ?? "0"),
            waiver_amount: String((r as unknown as { waiver: string }).waiver ?? r.waiver_amount ?? "0"),
            waiver_reason:
              (r as unknown as { waiverReason: string | null }).waiverReason ??
              r.waiver_reason ??
              null,
            paid_amount: String((r as unknown as { paid: string }).paid ?? r.paid_amount ?? "0"),
            status: r.status,
          })),
        )
      } else {
        setBreakdownRows([])
      }
    } finally {
      setBreakdownLoading(false)
    }
  }

  // Always hide EMPTY rows — pre-empty months have nothing to do.
  const visibleRows = useMemo(
    () => rows.filter((r) => r.status !== "EMPTY"),
    [rows],
  )

  function openMonthMarkPaid(row: AdminRow) {
    setMonthPayContext({
      studentId: row.studentId,
      studentName: row.studentName,
      studentClass: row.class,
      studentSection: row.section,
      year: row.year,
      month: row.month,
      label: row.label,
    })
  }

  function openLateFeeWaive(row: AdminRow) {
    if (!row.lateFeeId) return
    setWaiveLateFor({
      id: row.lateFeeId,
      period_year: row.year,
      period_month: row.month,
      amount: row.lateAmount,
      paid: row.latePaid,
      waiverAmount: row.lateWaiverAmount,
      student: { user: { name: row.studentName } },
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-6 items-end">
        <div className="space-y-1">
          <label className="text-xs font-medium">Session</label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
          >
            <option value="">Current</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Class</label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:bg-muted"
            value={cls}
            onChange={(e) => {
              setCls(e.target.value)
              setSection("")
            }}
            disabled={classes.length === 0}
          >
            <option value="">All</option>
            {classes.map((c) => (
              <option key={c.class} value={c.class}>
                {c.class}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Section</label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:bg-muted"
            value={section}
            onChange={(e) => setSection(e.target.value)}
            disabled={!selectedClassGroup}
          >
            <option value="">All</option>
            {selectedClassGroup?.sections.map((sect) => (
              <option key={sect} value={sect}>
                {sect}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Status</label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All</option>
            <option value="PENDING">Pending</option>
            <option value="PARTIAL">Partial</option>
            <option value="PAID">Paid</option>
            <option value="OVERDUE">Overdue</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Search</label>
          <Input
            placeholder="Name or ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load({ resetPage: true })}
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={() => load({ resetPage: true })} variant="outline" disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-1" />
                Apply
              </>
            )}
          </Button>
        </div>
      </div>

      {summary && (
        <div className="space-y-2">
          <div className="grid gap-2 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            <SummaryCard label="Expected (Until Now)" value={summary.totalExpected} />
            <SummaryCard label="Collected" value={summary.totalCollected} tone="emerald" />
            <SummaryCard
              label="Total Outstanding"
              value={summary.totalOutstanding}
              tone="red"
            />
            <SummaryCard
              label="Total Waived"
              value={summary.totalWaived}
              tone="emerald"
            />
            <SummaryCard
              label="Expected (Annual)"
              value={summary.totalExpectedAnnual}
            />
          </div>
          <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
            <SummaryCard
              label="Expected Late Fee (Until Now)"
              value={summary.totalLateExpected}
            />
            <SummaryCard
              label="Waived Late Fee"
              value={summary.totalLateWaived}
              tone="emerald"
            />
            <SummaryCard
              label="Late Fee Outstanding"
              value={summary.totalLateOutstanding}
              tone="amber"
            />
            <SummaryCard
              label="Late Fee Collected"
              value={summary.totalLateCollected}
              tone="emerald"
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs text-muted-foreground">
          {pagination && summary
            ? `Page ${pagination.page} of ${Math.max(1, pagination.totalPages)} · ${pagination.totalStudents} students`
            : ""}
        </p>
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              disabled={pagination.page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs px-2">
              {pagination.page} / {pagination.totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={pagination.page >= pagination.totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading ledger…
        </div>
      ) : visibleRows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6">
          No matching month-blocks. Generate the ledger from the Structures tab if you haven&apos;t already.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left px-3 py-2">Student</th>
                <th className="text-left px-3 py-2">Class</th>
                <th className="text-left px-3 py-2">Month</th>
                <th className="text-right px-3 py-2">Expected</th>
                <th className="text-right px-3 py-2">Waiver</th>
                <th className="text-right px-3 py-2">Paid</th>
                <th className="text-right px-3 py-2">Late</th>
                <th className="text-right px-3 py-2">Due</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-center px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((r) => {
                const late = r.lateWaived
                  ? 0
                  : Math.max(
                      0,
                      Number(r.lateAmount) -
                        Number(r.latePaid) -
                        Number(r.lateWaiverAmount ?? 0),
                    )
                const hasOutstanding = Number(r.totalDue) > 0
                const showMarkPaid =
                  hasOutstanding && paymentMode !== "FULL_ONLINE"
                return (
                  <tr
                    key={`${r.studentId}-${r.year}-${r.month}`}
                    className="border-t border-border hover:bg-muted/30"
                  >
                    <td className="px-3 py-2">
                      <div className="font-medium">{r.studentName}</div>
                      <div className="text-xs text-muted-foreground">{r.username}</div>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {r.class}-{r.section}
                    </td>
                    <td className="px-3 py-2">{r.label}</td>
                    <td className="px-3 py-2 text-right font-mono">
                      {Number(r.totalExpected).toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-emerald-600 dark:text-emerald-400">
                      {Number(r.totalWaiver) > 0 ? `-${Number(r.totalWaiver).toFixed(2)}` : "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {Number(r.totalPaid).toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-amber-600 dark:text-amber-400">
                      {late > 0 ? `+${late.toFixed(2)}` : r.lateWaived ? "waived" : "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-semibold">
                      {Number(r.totalDue).toFixed(2)}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={STATUS_VARIANT[r.status] ?? "outline"}>{r.status}</Badge>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-center">
                      <div className="flex justify-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openBreakdown(r)}>
                          Breakdown
                        </Button>
                        {showMarkPaid && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openMonthMarkPaid(r)}
                          >
                            Mark Paid
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {breakdownFor && (
        <BreakdownDialog
          row={breakdownFor}
          rows={breakdownRows}
          loading={breakdownLoading}
          onClose={() => {
            setBreakdownFor(null)
            setBreakdownRows(null)
          }}
          onWaive={(ledger) => {
            if (!ledger.fee_head_id) {
              toast.error("This row is missing a fee head; cannot grant a waiver")
              return
            }
            const resolvedSessionId =
              sessionId || sessions.find((s) => s.is_current)?.id || sessions[0]?.id
            if (!resolvedSessionId) {
              toast.error("No session available — cannot grant waiver")
              return
            }
            setWaiverTarget({
              studentId: breakdownFor.studentId,
              studentName: breakdownFor.studentName,
              sessionId: resolvedSessionId,
              feeHeadId: ledger.fee_head_id,
              feeHeadName: ledger.head_name_snapshot,
              periodYear: breakdownFor.year,
              periodMonth: breakdownFor.month,
              periodLabel: breakdownFor.label,
            })
          }}
          onWaiveLateFee={() => openLateFeeWaive(breakdownFor)}
        />
      )}

      <MonthMarkPaidModal
        context={monthPayContext}
        onClose={() => setMonthPayContext(null)}
        onSuccess={async () => {
          setMonthPayContext(null)
          await refreshAfterMutation()
        }}
      />
      <WaiverModal
        target={waiverTarget}
        onClose={() => setWaiverTarget(null)}
        onSuccess={async () => {
          setWaiverTarget(null)
          await refreshAfterMutation()
        }}
      />
      <WaiveLateFeeModal
        monthlyLateFee={waiveLateFor}
        onClose={() => setWaiveLateFor(null)}
        onSuccess={async () => {
          setWaiveLateFor(null)
          await refreshAfterMutation()
        }}
      />
    </div>
  )
}

function BreakdownDialog({
  row,
  rows,
  loading,
  onClose,
  onWaive,
  onWaiveLateFee,
}: {
  row: AdminRow
  rows: LedgerDetail[] | null
  loading: boolean
  onClose: () => void
  onWaive: (ledger: LedgerDetail) => void
  onWaiveLateFee: () => void
}) {
  const lateOutstanding = row.lateWaived
    ? 0
    : Math.max(
        0,
        Number(row.lateAmount) -
          Number(row.latePaid) -
          Number(row.lateWaiverAmount ?? 0),
      )
  const showLateWaiveButton = Boolean(row.lateFeeId) && lateOutstanding > 0

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-md p-5 max-w-xl w-full max-h-[80vh] overflow-y-auto shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 space-y-1">
          <h3 className="font-semibold">{row.studentName}</h3>
          <p className="text-xs text-muted-foreground">
            {row.class}-{row.section} · {row.username}
          </p>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : !rows || rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No fee heads in this month.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {rows.map((r) => {
              const due = Math.max(
                0,
                Number(r.expected_amount) -
                  Number(r.waiver_amount) -
                  Number(r.paid_amount),
              )
              return (
                <li
                  key={r.id}
                  className="border border-border rounded p-2 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="font-medium">
                      Fees for {row.label}
                      {(rows?.length ?? 0) > 1 && ` — ${r.head_name_snapshot}`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Expected ₹{Number(r.expected_amount).toFixed(2)} · Paid ₹
                      {Number(r.paid_amount).toFixed(2)}
                      {Number(r.waiver_amount) > 0 &&
                        ` · Waiver ₹${Number(r.waiver_amount).toFixed(2)}`}
                    </div>
                    {r.waiver_reason && (
                      <div className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                        <div>Waiver reason:</div>
                        {r.waiver_reason
                          .split("\n")
                          .map((reason) => reason.trim())
                          .filter((reason) => reason.length > 0)
                          .map((reason, idx) => (
                            <div key={idx} className="pl-2">
                              • {reason}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-mono">₹{due.toFixed(2)}</div>
                    <div className="flex gap-1 mt-1 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => onWaive(r)}>
                        Waive
                      </Button>
                    </div>
                  </div>
                </li>
              )
            })}

            {/* Late fee row — appears alongside fee heads, styled amber. */}
            {(Number(row.lateAmount) > 0 || row.lateWaived) && (
              <li className="border border-amber-300 dark:border-amber-700 bg-amber-500/10 rounded p-2 flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-amber-700 dark:text-amber-400">Late Fee</div>
                  <div className="text-xs text-amber-700 dark:text-amber-400/80">
                    Accrued ₹{Number(row.lateAmount).toFixed(2)} · Paid ₹
                    {Number(row.latePaid).toFixed(2)}
                    {Number(row.lateWaiverAmount ?? 0) > 0 &&
                      ` · Waiver ₹${Number(row.lateWaiverAmount).toFixed(2)}`}
                    {row.lateWaived && " · fully waived"}
                  </div>
                  {row.lateWaiverReason && (
                    <div className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                      <div>Late fee waiver reason:</div>
                      {row.lateWaiverReason
                        .split("\n")
                        .map((reason) => reason.trim())
                        .filter((reason) => reason.length > 0)
                        .map((reason, idx) => (
                          <div key={idx} className="pl-2">
                            • {reason}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-mono text-amber-700 dark:text-amber-400">
                    ₹{lateOutstanding.toFixed(2)}
                  </div>
                  <div className="flex gap-1 mt-1 justify-end">
                    {showLateWaiveButton && (
                      <Button size="sm" variant="ghost" onClick={onWaiveLateFee}>
                        Waive Late
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            )}
          </ul>
        )}
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-border text-sm">
          <span className="font-semibold">Month total due</span>
          <span className="font-mono font-bold">
            ₹{Number(row.totalDue).toFixed(2)}
          </span>
        </div>
        <div className="flex justify-end mt-3">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string | number
  tone?: "emerald" | "red" | "amber"
}) {
  const color =
    tone === "emerald"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "red"
        ? "text-red-600 dark:text-red-400"
        : tone === "amber"
          ? "text-amber-600 dark:text-amber-400"
          : "text-foreground"
  const num = typeof value === "string" ? Number(value) : value
  return (
    <div className="rounded-md border border-border bg-card p-2.5">
      <div className="text-[10px] uppercase text-muted-foreground tracking-wider leading-tight">
        {label}
      </div>
      <div className={`text-sm font-bold ${color} font-mono mt-0.5`}>
        ₹{Number.isFinite(num) ? num.toFixed(2) : value}
      </div>
    </div>
  )
}
