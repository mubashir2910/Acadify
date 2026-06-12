"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

type Summary = {
  school: {
    id: string
    schoolCode: string
    schoolName: string
    currency: string
    logo_url: string | null
    motto: string | null
    brand_color: string
  }
  paymentConfig: {
    payment_mode: "FULL_MANUAL" | "FULL_ONLINE" | "HYBRID" | null
    currency: string
    gateway_provider: string | null
    gateway_key_id: string | null
    default_late_fee_enabled: boolean
    default_late_fee_type: "FIXED" | "PERCENT" | null
    default_late_fee_value: string | null
    default_late_fee_grace_day_of_month: number | null
    default_late_fee_frequency: "MONTHLY" | "DAILY" | "ONE_TIME" | null
    updated_at: string
  } | null
  bankAccounts: Array<{
    id: string
    label: string | null
    account_holder: string
    bank_name: string
    account_number: string
    ifsc: string
    branch: string | null
    is_active: boolean
  }>
  upiAccounts: Array<{ id: string; upi_id: string; label: string | null; is_active: boolean }>
  qrCodes: Array<{
    id: string
    image_url: string
    caption: string
    label: string | null
    is_active: boolean
    bank_account: { id: string; label: string | null; bank_name: string } | null
  }>
  structures: Array<{
    id: string
    class: string
    section: string | null
    name: string
    version: number
    is_active: boolean
    session: { id: string; name: string; is_current: boolean }
    fee_heads: Array<{
      id: string
      name: string
      amount: string
      frequency: string
      category: string
      applied_months: Array<{ period_year: number; period_month: number }>
    }>
  }>
  counts: {
    collectedTotal: number
    transactionsVerified: number
    pendingVerifications: number
    outstandingFromLedger: number
  }
}

type AuditEntry = {
  id: string
  action: string
  entity_type: string
  entity_id: string
  reason: string | null
  previous_value: unknown
  new_value: unknown
  created_at: string
  actor: { id: string; name: string; role: string }
}

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

const TABS = [
  { id: "current", label: "Current Config" },
  { id: "structures", label: "Fee Structures" },
  { id: "audit", label: "Audit Log" },
] as const

type TabId = (typeof TABS)[number]["id"]

export default function SuperAdminFeesSection({ schoolCode }: { schoolCode: string }) {
  const [tab, setTab] = useState<TabId>("current")
  const [summary, setSummary] = useState<Summary | null>(null)
  const [audit, setAudit] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingAudit, setLoadingAudit] = useState(false)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/super-admin/schools/${schoolCode}/fees-summary`)
        if (res.ok) setSummary(await res.json())
      } finally {
        setLoading(false)
      }
    })()
  }, [schoolCode])

  useEffect(() => {
    if (tab !== "audit") return
    void (async () => {
      setLoadingAudit(true)
      try {
        const res = await fetch(`/api/fees/audit?schoolCode=${schoolCode}&pageSize=100`)
        if (res.ok) {
          const data = await res.json()
          setAudit(data.items ?? [])
        }
      } finally {
        setLoadingAudit(false)
      }
    })()
  }, [tab, schoolCode])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading fees data…
      </div>
    )
  }
  if (!summary) {
    return <p className="text-sm text-muted-foreground">No data available.</p>
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Link
            href={`/super-admins/${schoolCode}`}
            className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to school
          </Link>
          <h1 className="text-xl font-bold mt-1">
            {summary.school.schoolName} — Fees Overview
          </h1>
          {summary.school.motto && (
            <p className="text-sm italic text-muted-foreground">{summary.school.motto}</p>
          )}
        </div>
        <div className="text-right text-xs text-muted-foreground">
          Code: <span className="font-mono">{summary.school.schoolCode}</span>
          <br />
          Currency: {summary.school.currency}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <StatCard label="Collected" value={`₹${summary.counts.collectedTotal.toFixed(2)}`} tone="emerald" />
        <StatCard
          label="Outstanding (ledger)"
          value={`₹${summary.counts.outstandingFromLedger.toFixed(2)}`}
          tone="red"
        />
        <StatCard label="Verified Txns" value={summary.counts.transactionsVerified} />
        <StatCard label="Pending Verifications" value={summary.counts.pendingVerifications} tone="amber" />
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "px-3 py-1.5 text-sm rounded-md",
              tab === t.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "current" && <CurrentConfigTab summary={summary} />}
      {tab === "structures" && <FeeStructuresTab structures={summary.structures} />}
      {tab === "audit" && <AuditLogTab audit={audit} loading={loadingAudit} />}
    </div>
  )
}

function StatCard({
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
      ? "text-emerald-700 dark:text-emerald-400"
      : tone === "red"
        ? "text-red-700 dark:text-red-400"
        : tone === "amber"
          ? "text-amber-700 dark:text-amber-400"
          : "text-foreground"
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-xl font-bold ${color} font-mono`}>{value}</div>
    </div>
  )
}

function CurrentConfigTab({ summary }: { summary: Summary }) {
  const cfg = summary.paymentConfig
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-card p-4 space-y-2">
        <h3 className="text-sm font-semibold">Payment Mode & Policy</h3>
        {!cfg ? (
          <p className="text-sm text-muted-foreground">
            No payment configuration set yet.
          </p>
        ) : (
          <dl className="grid gap-2 md:grid-cols-2 text-sm">
            <Row label="Payment Mode" value={cfg.payment_mode ?? "—"} />
            <Row label="Currency" value={cfg.currency} />
            <Row label="Gateway" value={cfg.gateway_provider ?? "Not configured"} />
            <Row label="Last updated" value={new Date(cfg.updated_at).toLocaleString()} />
            <Row label="Late fee enabled" value={cfg.default_late_fee_enabled ? "Yes" : "No"} />
            {cfg.default_late_fee_enabled && (
              <>
                <Row label="Late fee type" value={cfg.default_late_fee_type ?? "—"} />
                <Row label="Late fee value" value={cfg.default_late_fee_value ?? "—"} />
                <Row label="Grace day" value={cfg.default_late_fee_grace_day_of_month?.toString() ?? "—"} />
                <Row label="Accrual" value={cfg.default_late_fee_frequency ?? "MONTHLY"} />
              </>
            )}
          </dl>
        )}
      </div>

      <div className="rounded-md border border-border bg-card p-4 space-y-2">
        <h3 className="text-sm font-semibold">Bank Accounts ({summary.bankAccounts.length})</h3>
        {summary.bankAccounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No bank accounts added.</p>
        ) : (
          <ul className="space-y-2">
            {summary.bankAccounts.map((b) => (
              <li
                key={b.id}
                className={`rounded border p-3 text-sm ${b.is_active ? "border-emerald-500/40 bg-emerald-500/10" : "border-border bg-muted/20"}`}
              >
                <div className="font-medium flex items-center gap-2">
                  {b.label || b.bank_name}
                  {b.is_active && <Badge>Active</Badge>}
                </div>
                <div className="text-xs text-muted-foreground">
                  {b.account_holder} · {b.bank_name} · {b.ifsc}
                </div>
                <div className="text-xs font-mono text-muted-foreground">
                  A/C ****{b.account_number.slice(-4)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-md border border-border bg-card p-4 space-y-2">
        <h3 className="text-sm font-semibold">UPI IDs ({summary.upiAccounts.length})</h3>
        {summary.upiAccounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No UPI IDs.</p>
        ) : (
          <ul className="space-y-2">
            {summary.upiAccounts.map((u) => (
              <li
                key={u.id}
                className={`rounded border p-3 text-sm ${u.is_active ? "border-emerald-500/40 bg-emerald-500/10" : "border-border bg-muted/20"}`}
              >
                <div className="font-medium flex items-center gap-2">
                  {u.label || u.upi_id}
                  {u.is_active && <Badge>Active</Badge>}
                </div>
                <div className="text-xs font-mono text-muted-foreground">{u.upi_id}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-md border border-border bg-card p-4 space-y-2">
        <h3 className="text-sm font-semibold">QR Codes ({summary.qrCodes.length})</h3>
        {summary.qrCodes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No QR codes.</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {summary.qrCodes.map((q) => (
              <li
                key={q.id}
                className={`flex gap-3 rounded border p-3 text-sm ${q.is_active ? "border-emerald-500/40 bg-emerald-500/10" : "border-border bg-muted/20"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={q.image_url} alt={q.caption} className="size-20 rounded border object-cover" />
                <div className="flex-1">
                  <div className="font-medium flex items-center gap-2">
                    {q.label || q.caption.slice(0, 30)}
                    {q.is_active && <Badge>Active</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{q.caption}</p>
                  {q.bank_account && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Linked to {q.bank_account.label || q.bank_account.bank_name}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function FeeStructuresTab({ structures }: { structures: Summary["structures"] }) {
  if (structures.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">No fee structures created.</p>
  }
  return (
    <div className="space-y-3">
      {structures.map((s) => (
        <div key={s.id} className="rounded-md border border-border bg-card p-4 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{s.name}</span>
                <Badge variant="outline">v{s.version}</Badge>
                {s.is_active ? <Badge>Active</Badge> : <Badge variant="secondary">Archived</Badge>}
                {s.session.is_current && (
                  <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 dark:text-emerald-400">
                    Current session
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Class {s.class}{s.section ? ` / ${s.section}` : " (all sections)"} · {s.session.name}
              </p>
            </div>
          </div>
          <ul className="text-xs space-y-1">
            {s.fee_heads.map((h) => {
              const hasApplied = h.applied_months?.length > 0
              const cadence = hasApplied
                ? h.applied_months
                    .map((m) => `${MONTH_SHORT[m.period_month - 1]} ${m.period_year}`)
                    .join(", ")
                : h.frequency
              return (
                <li key={h.id} className="flex justify-between border-b border-border/60 py-1">
                  <span>
                    {h.name}{" "}
                    <span className="text-muted-foreground">({h.category} · {cadence})</span>
                  </span>
                  <span className="font-mono">₹{Number(h.amount).toFixed(2)}</span>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}

function AuditLogTab({ audit, loading }: { audit: AuditEntry[]; loading: boolean }) {
  const grouped = useMemo(() => audit, [audit])
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading audit log…
      </div>
    )
  }
  if (grouped.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">No audit entries.</p>
  }
  return (
    <div className="space-y-2">
      {grouped.map((entry) => (
        <details
          key={entry.id}
          className="rounded-md border border-border bg-card p-3 text-sm group"
        >
          <summary className="flex items-center justify-between cursor-pointer gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{entry.action}</Badge>
              <Badge variant="outline">{entry.entity_type}</Badge>
              <span className="text-xs text-muted-foreground">
                by {entry.actor?.name ?? "system"} ({entry.actor?.role ?? "—"})
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {new Date(entry.created_at).toLocaleString()}
            </span>
          </summary>
          {entry.reason && (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 rounded p-2">
              Reason: {entry.reason}
            </p>
          )}
          <div className="mt-2 grid gap-2 md:grid-cols-2 text-xs">
            <pre className="rounded bg-muted/30 p-2 overflow-x-auto">
              <div className="text-muted-foreground text-[10px] uppercase tracking-wider mb-1">previous</div>
              {JSON.stringify(entry.previous_value, null, 2)}
            </pre>
            <pre className="rounded bg-muted/30 p-2 overflow-x-auto">
              <div className="text-muted-foreground text-[10px] uppercase tracking-wider mb-1">new</div>
              {JSON.stringify(entry.new_value, null, 2)}
            </pre>
          </div>
        </details>
      ))}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between gap-2 py-1 border-b border-border/60">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
