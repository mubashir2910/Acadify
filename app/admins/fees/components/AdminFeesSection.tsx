"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import SessionsTab from "./SessionsTab"
import StructuresTab from "./StructuresTab"
import LedgerTab from "./LedgerTab"
import TransactionsTab from "./TransactionsTab"
import ExportsTab from "./ExportsTab"
import AuditLogTab from "./AuditLogTab"
import PaymentConfigSection from "./PaymentConfigSection"

// Pending Verifications is intentionally NOT a tab here — it lives as a
// dedicated sidebar nav item (/fees/pending) so the badge is always visible.
const TABS = [
  { id: "ledger", label: "Ledger" },
  { id: "structures", label: "Structures" },
  { id: "sessions", label: "Sessions" },
  { id: "transactions", label: "Transactions" },
  { id: "exports", label: "Exports" },
  { id: "audit", label: "Audit Log" },
  { id: "settings", label: "Payment Settings" },
] as const

type TabId = (typeof TABS)[number]["id"]

export default function AdminFeesSection() {
  const [active, setActive] = useState<TabId>("ledger")

  return (
    <div className="space-y-4">
      {/* Tabs nav */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-2 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={cn(
              "px-3 py-1.5 text-sm rounded-md whitespace-nowrap transition-colors",
              active === t.id
                ? "bg-slate-900 text-white"
                : "bg-muted text-muted-foreground hover:bg-muted",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        {active === "ledger" && <LedgerTab />}
        {active === "structures" && <StructuresTab />}
        {active === "sessions" && <SessionsTab />}
        {active === "transactions" && <TransactionsTab />}
        {active === "exports" && <ExportsTab />}
        {active === "audit" && <AuditLogTab />}
        {active === "settings" && <PaymentConfigSection />}
      </div>
    </div>
  )
}
