"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, Loader2, Lock, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { monthOptionsFrom, formatMonthLabel, type MonthOption } from "@/lib/month-options"

type Session = { id: string; name: string; is_current: boolean; start_date?: string }
type AppliedMonth = { period_year: number; period_month: number; due_day: number | null }
type FeeHead = {
  id: string
  name: string
  category: string
  frequency: string
  amount: string
  due_day_of_month: number | null
  due_month: number | null
  applied_months: AppliedMonth[]
}
type Structure = {
  id: string
  class: string
  section: string | null
  name: string
  version: number
  is_active: boolean
  session: { id: string; name: string; is_current: boolean }
  fee_heads: FeeHead[]
  ledger_row_count: number
  paid_ledger_count: number
  waiver_count: number
}
type ClassGroup = { class: string; sections: string[] }

type DraftHead = {
  name: string
  category: string
  frequency: string
  amount: string
  dueDayOfMonth: string
  dueMonth: string
  // keys of selected months from the dropdown (format: YYYY-MM)
  appliedMonthKeys: string[]
}

const CATEGORIES = [
  "TUITION",
  "TRANSPORT",
  "LAB",
  "LIBRARY",
  "EXAM",
  "SESSION",
  "ACTIVITY",
  "MISC",
]
const FREQS = ["MONTHLY", "QUARTERLY", "HALF_YEARLY", "ANNUAL"]

function newHead(): DraftHead {
  return {
    name: "",
    category: "TUITION",
    frequency: "MONTHLY",
    amount: "",
    dueDayOfMonth: "5",
    dueMonth: "",
    appliedMonthKeys: [],
  }
}

export default function StructuresTab() {
  const [structures, setStructures] = useState<Structure[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [classes, setClasses] = useState<ClassGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [generating, setGenerating] = useState<string | null>(null)
  const [lockTarget, setLockTarget] = useState<Structure | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Structure | null>(null)

  async function load() {
    setLoading(true)
    try {
      const [sRes, stRes, cRes] = await Promise.all([
        fetch("/api/sessions"),
        fetch("/api/fees/structures?includeArchived=true"),
        fetch("/api/admin/classes"),
      ])
      if (sRes.ok) setSessions(await sRes.json())
      if (stRes.ok) setStructures(await stRes.json())
      if (cRes.ok) {
        const data = await cRes.json()
        setClasses(data.classes ?? [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function generate(sessionId: string, cls: string, sect: string | null) {
    setGenerating(`${sessionId}-${cls}-${sect ?? "all"}`)
    try {
      const res = await fetch("/api/fees/ledger/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          class: cls,
          section: sect ?? undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.message ?? "Failed to generate ledger")
        return
      }
      const result = (await res.json()) as {
        createdCount: number
        skippedAlreadyExists?: number
        studentsProcessed: number
        skippedStudents?: number
        missingStructureFor?: string[]
      }

      if (result.studentsProcessed === 0) {
        toast.error(
          `No active students found for class ${cls}${sect ? ` / ${sect}` : ""}. Make sure students are imported and ACTIVE.`,
        )
        return
      }
      if (result.createdCount === 0 && (result.skippedAlreadyExists ?? 0) === 0) {
        const missing = result.missingStructureFor?.join(", ")
        toast.error(
          missing
            ? `No structure matched these (class/section): ${missing}. Create a matching structure first.`
            : `Generated 0 rows for ${result.studentsProcessed} students. Check the structure's effective dates and the session date range.`,
          { duration: 8000 },
        )
        return
      }
      if (result.createdCount === 0 && (result.skippedAlreadyExists ?? 0) > 0) {
        toast.success(
          `Already up to date — ${result.skippedAlreadyExists} ledger rows already exist for ${result.studentsProcessed} students.`,
        )
        return
      }
      toast.success(
        `Ledger generated: ${result.createdCount} rows for ${result.studentsProcessed} students${
          result.skippedStudents ? ` (${result.skippedStudents} students skipped)` : ""
        }`,
      )
      // Refresh so the Generate Ledger button transitions to the locked state.
      await load()
    } finally {
      setGenerating(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Define fee heads per (class, optional section) for each academic session. Each fee head can be applied to specific months — perfect for one-off charges like Admission or Session fees.
        </p>
        <Button onClick={() => setShowCreate(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" /> New Structure
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : structures.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6">No structures yet.</p>
      ) : (
        <div className="space-y-3">
          {structures.map((s) => (
            <div
              key={s.id}
              className="rounded-md border border-border bg-card p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{s.name}</span>
                    <Badge variant="outline">v{s.version}</Badge>
                    {s.is_active ? (
                      <Badge>Active</Badge>
                    ) : (
                      <Badge variant="secondary">Archived</Badge>
                    )}
                    {s.session.is_current && (
                      <Badge variant="outline" className="border-emerald-300 text-emerald-700 dark:text-emerald-400">
                        Current session
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Class {s.class}
                    {s.section ? ` / ${s.section}` : " (all sections)"} —{" "}
                    {s.session.name}
                  </p>
                </div>
                <div className="flex gap-2">
                  {s.is_active &&
                    (s.ledger_row_count > 0 ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-emerald-700 dark:text-emerald-400 border-emerald-300 hover:bg-emerald-500/10"
                        onClick={() =>
                          toast.info(
                            `Structure already locked for ${s.session.name} — ${s.ledger_row_count} ledger rows exist.`,
                          )
                        }
                      >
                        <Lock className="h-3.5 w-3.5 mr-1" /> Locked ✓
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={
                          generating === `${s.session.id}-${s.class}-${s.section ?? "all"}`
                        }
                        onClick={() => setLockTarget(s)}
                      >
                        <Lock className="h-3.5 w-3.5 mr-1" /> Lock for Session
                      </Button>
                    ))}
                  {s.is_active && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(s)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                    </Button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="text-left px-2 py-1.5">Head</th>
                      <th className="text-left px-2 py-1.5">Category</th>
                      <th className="text-left px-2 py-1.5">Frequency</th>
                      <th className="text-right px-2 py-1.5">Amount</th>
                      <th className="text-left px-2 py-1.5">Applied Months</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.fee_heads.map((h) => (
                      <tr key={h.id} className="border-t border-border">
                        <td className="px-2 py-1.5 font-medium">{h.name}</td>
                        <td className="px-2 py-1.5 text-muted-foreground">
                          {h.category}
                        </td>
                        <td className="px-2 py-1.5 text-muted-foreground">
                          {h.applied_months?.length ? "Custom" : h.frequency}
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono">
                          ₹{Number(h.amount).toFixed(2)}
                        </td>
                        <td className="px-2 py-1.5 text-muted-foreground">
                          {h.applied_months?.length
                            ? h.applied_months
                                .map((m) => formatMonthLabel(m.period_year, m.period_month))
                                .join(", ")
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateStructureModal
        open={showCreate}
        sessions={sessions}
        classes={classes}
        onClose={() => setShowCreate(false)}
        onCreated={async () => {
          setShowCreate(false)
          await load()
        }}
      />

      <LockStructureModal
        structure={lockTarget}
        sessions={sessions}
        onClose={() => setLockTarget(null)}
        onConfirm={async (sessionId) => {
          if (!lockTarget) return
          const target = lockTarget
          setLockTarget(null)
          await generate(sessionId, target.class, target.section)
        }}
      />

      <DeleteStructureModal
        structure={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onSuccess={async () => {
          setDeleteTarget(null)
          await load()
        }}
      />
    </div>
  )
}

function CreateStructureModal({
  open,
  sessions,
  classes,
  onClose,
  onCreated,
}: {
  open: boolean
  sessions: Session[]
  classes: ClassGroup[]
  onClose: () => void
  onCreated: () => Promise<void> | void
}) {
  const [sessionId, setSessionId] = useState("")
  // Multiple classes can share the same structure definition. Section can
  // only be chosen when exactly one class is selected (sections are
  // class-scoped).
  const [selectedClasses, setSelectedClasses] = useState<string[]>([])
  const [section, setSection] = useState("")
  const [name, setName] = useState("")
  const [effectiveFrom, setEffectiveFrom] = useState("")
  const [heads, setHeads] = useState<DraftHead[]>([newHead()])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open && sessions.length && !sessionId) {
      const current = sessions.find((s) => s.is_current)
      setSessionId(current?.id ?? sessions[0].id)
    }
  }, [open, sessions, sessionId])

  const isMultiClass = selectedClasses.length > 1

  // The section dropdown follows the single selected class; if zero or more
  // than one are selected, there's no meaningful section list to show.
  const sectionSourceGroup = useMemo(
    () =>
      selectedClasses.length === 1
        ? classes.find((c) => c.class === selectedClasses[0])
        : undefined,
    [classes, selectedClasses],
  )

  // Force section to "all" whenever more than one class is selected so the
  // server-side validation can't bounce the submit.
  useEffect(() => {
    if (isMultiClass && section !== "") setSection("")
  }, [isMultiClass, section])

  function toggleClass(c: string) {
    setSelectedClasses((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    )
  }

  const monthOptions: MonthOption[] = useMemo(() => {
    if (!effectiveFrom) return []
    return monthOptionsFrom(effectiveFrom, 12)
  }, [effectiveFrom])

  function updateHead(i: number, patch: Partial<DraftHead>) {
    setHeads((h) => h.map((row, idx) => (idx === i ? { ...row, ...patch } : row)))
  }

  function toggleHeadMonth(i: number, key: string) {
    setHeads((h) =>
      h.map((row, idx) => {
        if (idx !== i) return row
        const set = new Set(row.appliedMonthKeys)
        if (set.has(key)) set.delete(key)
        else set.add(key)
        return { ...row, appliedMonthKeys: Array.from(set).sort() }
      }),
    )
  }

  function removeHead(i: number) {
    setHeads((h) => h.filter((_, idx) => idx !== i))
  }

  async function submit() {
    if (!sessionId || selectedClasses.length === 0 || !name || !effectiveFrom) {
      toast.error("Fill all required fields")
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        sessionId,
        classes: selectedClasses,
        section: isMultiClass ? null : section || null,
        name,
        effectiveFrom,
        feeHeads: heads.map((h) => ({
          name: h.name,
          category: h.category,
          frequency: h.frequency,
          amount: Number(h.amount),
          dueDayOfMonth: h.dueDayOfMonth ? Number(h.dueDayOfMonth) : null,
          dueMonth: h.dueMonth ? Number(h.dueMonth) : null,
          appliedMonths: h.appliedMonthKeys
            .map((key) => {
              const [yearStr, monthStr] = key.split("-")
              return {
                year: Number(yearStr),
                month: Number(monthStr),
                dueDay: h.dueDayOfMonth ? Number(h.dueDayOfMonth) : null,
              }
            })
            .filter((m) => Number.isFinite(m.year) && Number.isFinite(m.month)),
        })),
      }
      const res = await fetch("/api/fees/structures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.message ?? "Failed to create")
        return
      }
      toast.success(
        selectedClasses.length > 1
          ? `Structure created for ${selectedClasses.length} classes`
          : "Structure created",
      )
      setSessionId("")
      setSelectedClasses([])
      setSection("")
      setName("")
      setEffectiveFrom("")
      setHeads([newHead()])
      await onCreated()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Fee Structure</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {sessions.length === 0 && (
            <div className="rounded-md border border-amber-300 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
              No academic sessions yet. Open the <strong>Sessions</strong> tab,
              create one (e.g. <code>2025-26</code> with start/end dates), then
              come back here.
            </div>
          )}
          {classes.length === 0 && (
            <div className="rounded-md border border-amber-300 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
              No active students enrolled yet. Import students first so classes appear in the dropdown.
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium">Session</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:bg-muted disabled:text-muted-foreground"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                disabled={sessions.length === 0}
              >
                <option value="">
                  {sessions.length === 0
                    ? "No sessions — create one first"
                    : "Select session…"}
                </option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.is_current ? "(current)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Structure name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Class 10 Standard"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-medium">Classes</label>
              {classes.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  No active classes yet — import students first.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {classes.map((c) => {
                    const checked = selectedClasses.includes(c.class)
                    return (
                      <label
                        key={c.class}
                        className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs cursor-pointer select-none ${
                          checked
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-background hover:bg-muted/50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="h-3 w-3"
                          checked={checked}
                          onChange={() => toggleClass(c.class)}
                        />
                        {c.class}
                      </label>
                    )
                  })}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Pick one or more classes — the same heads will apply to every
                class you tick.
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Section (optional)</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:bg-muted disabled:text-muted-foreground"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                disabled={isMultiClass || !sectionSourceGroup}
              >
                <option value="">All sections</option>
                {sectionSourceGroup?.sections.map((sect) => (
                  <option key={sect} value={sect}>
                    {sect}
                  </option>
                ))}
              </select>
              {isMultiClass && (
                <p className="text-xs text-muted-foreground">
                  Multiple classes selected — structure applies to all sections of each.
                </p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Effective from</label>
              <Input
                type="date"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Per-head month picker generates 12 months from this date.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Fee Heads</h4>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setHeads((h) => [...h, newHead()])}
              >
                <Plus className="h-4 w-4 mr-1" /> Add Head
              </Button>
            </div>

            {heads.map((h, i) => (
              <div
                key={i}
                className="rounded-md border border-border bg-muted/30 p-3 space-y-3"
              >
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-medium">Name</label>
                    <Input
                      value={h.name}
                      onChange={(e) => updateHead(i, { name: e.target.value })}
                      placeholder="Tuition"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Amount</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={h.amount}
                      onChange={(e) => updateHead(i, { amount: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Category</label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={h.category}
                      onChange={(e) => updateHead(i, { category: e.target.value })}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Frequency</label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:bg-muted"
                      value={h.frequency}
                      onChange={(e) => updateHead(i, { frequency: e.target.value })}
                      disabled={h.appliedMonthKeys.length > 0}
                    >
                      {FREQS.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>
                  {h.frequency === "MONTHLY" ? (
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Due day</label>
                      <Input
                        type="number"
                        min={1}
                        max={28}
                        value={h.dueDayOfMonth}
                        onChange={(e) =>
                          updateHead(i, { dueDayOfMonth: e.target.value })
                        }
                      />
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Due month (1-12)</label>
                      <Input
                        type="number"
                        min={1}
                        max={12}
                        value={h.dueMonth}
                        onChange={(e) => updateHead(i, { dueMonth: e.target.value })}
                      />
                    </div>
                  )}
                  <div className="flex items-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeHead(i)}
                      disabled={heads.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 border-t border-border pt-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium">
                      Apply this head only to specific months (optional)
                    </label>
                    {h.appliedMonthKeys.length > 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-7"
                        onClick={() => updateHead(i, { appliedMonthKeys: [] })}
                      >
                        Clear (use frequency instead)
                      </Button>
                    )}
                  </div>
                  {monthOptions.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      Pick an &quot;Effective from&quot; date above to enable month selection.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {monthOptions.map((m) => {
                        const checked = h.appliedMonthKeys.includes(m.key)
                        return (
                          <label
                            key={m.key}
                            className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs cursor-pointer select-none ${
                              checked
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border bg-background hover:bg-muted/50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="h-3 w-3"
                              checked={checked}
                              onChange={() => toggleHeadMonth(i, m.key)}
                            />
                            {m.label}
                          </label>
                        )
                      })}
                    </div>
                  )}
                  {h.appliedMonthKeys.length > 0 && (
                    <p className="text-xs text-emerald-700 dark:text-emerald-400">
                      Frequency is overridden — this head will only generate ledger rows for the {h.appliedMonthKeys.length} selected month{h.appliedMonthKeys.length === 1 ? "" : "s"}.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={submit}
              disabled={
                sessions.length === 0 ||
                classes.length === 0 ||
                selectedClasses.length === 0
              }
              loading={submitting}
              loadingText="Saving…"
            >
              {selectedClasses.length > 1
                ? `Create for ${selectedClasses.length} classes`
                : "Create"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Lock Structure for Session modal ────────────────────────────────────────
// The session is bound at structure creation today; this dialog surfaces it as
// an explicit confirmation step ("which session am I locking to?") and runs
// the same ledger-generation pipeline behind a clearer label.

function LockStructureModal({
  structure,
  sessions,
  onClose,
  onConfirm,
}: {
  structure: Structure | null
  sessions: Session[]
  onClose: () => void
  onConfirm: (sessionId: string) => Promise<void> | void
}) {
  const [selectedSessionId, setSelectedSessionId] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (structure) setSelectedSessionId(structure.session.id)
  }, [structure])

  if (!structure) return null

  const boundSession = sessions.find((s) => s.id === structure.session.id) ?? structure.session

  return (
    <Dialog open={Boolean(structure)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lock structure for session</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="rounded bg-muted/40 p-3 text-xs">
            <div className="font-semibold">{structure.name}</div>
            <div className="text-muted-foreground">
              Class {structure.class}
              {structure.section ? ` / ${structure.section}` : " (all sections)"}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Session</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              disabled
            >
              <option value={boundSession.id}>
                {boundSession.name}
                {"is_current" in boundSession && boundSession.is_current ? " (current)" : ""}
              </option>
            </select>
            <p className="text-xs text-muted-foreground">
              This structure is bound to {boundSession.name}. Locking generates the
              ledger for every active student in this class/section.
            </p>
          </div>

          <div className="rounded-md border border-amber-300 bg-amber-500/10 dark:bg-amber-900/20 p-2 text-xs text-amber-800 dark:text-amber-300">
            Once locked, ledger rows are created and the structure can&apos;t be
            re-locked without deleting first.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              loading={submitting}
              loadingText="Locking…"
              onClick={async () => {
                setSubmitting(true)
                try {
                  await onConfirm(selectedSessionId || structure.session.id)
                } finally {
                  setSubmitting(false)
                }
              }}
            >
              <Lock className="h-4 w-4 mr-1" /> Lock & Generate Ledger
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Delete Structure modal ──────────────────────────────────────────────────
// Replaces the old soft-delete Archive. Admin chooses: keep the ledger rows
// (recommended; preserves history via head_name_snapshot) or delete them too
// (only allowed when no ledger has been paid or has an active waiver).

function DeleteStructureModal({
  structure,
  onClose,
  onSuccess,
}: {
  structure: Structure | null
  onClose: () => void
  onSuccess: () => Promise<void> | void
}) {
  const [mode, setMode] = useState<"KEEP" | "DELETE_LEDGERS">("KEEP")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (structure) setMode("KEEP")
  }, [structure])

  if (!structure) return null

  const safeToDeleteLedgers =
    structure.paid_ledger_count === 0 && structure.waiver_count === 0
  const hasLedgers = structure.ledger_row_count > 0

  async function submit() {
    if (!structure) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/fees/structures/${structure.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleteLedgers: mode === "DELETE_LEDGERS" }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.message ?? "Failed to delete")
        return
      }
      toast.success(
        mode === "DELETE_LEDGERS"
          ? "Structure and ledger rows deleted"
          : "Structure deleted — ledger rows kept",
      )
      await onSuccess()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={Boolean(structure)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" /> Delete this structure?
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="rounded bg-muted/40 p-3 text-xs">
            <div className="font-semibold">{structure.name}</div>
            <div className="text-muted-foreground">
              Class {structure.class}
              {structure.section ? ` / ${structure.section}` : " (all sections)"} ·{" "}
              {structure.session.name}
            </div>
          </div>

          {hasLedgers && (
            <div className="rounded-md border border-border bg-muted/20 p-3 text-xs space-y-1">
              <div>
                <span className="font-medium">{structure.ledger_row_count}</span>{" "}
                ledger row{structure.ledger_row_count === 1 ? "" : "s"} were generated
                from this structure.
              </div>
              {structure.paid_ledger_count > 0 && (
                <div className="text-destructive">
                  ⚠ {structure.paid_ledger_count} have payments against them.
                </div>
              )}
              {structure.waiver_count > 0 && (
                <div className="text-destructive">
                  ⚠ {structure.waiver_count} active waiver
                  {structure.waiver_count === 1 ? "" : "s"} reference this structure.
                </div>
              )}
            </div>
          )}

          {hasLedgers && (
            <div className="space-y-2">
              <div className="text-xs font-medium">What should happen to the ledger rows?</div>
              <label className="flex items-start gap-2 cursor-pointer rounded-md border border-border p-2 hover:bg-muted/40">
                <input
                  type="radio"
                  className="mt-0.5"
                  name="delete-mode"
                  value="KEEP"
                  checked={mode === "KEEP"}
                  onChange={() => setMode("KEEP")}
                />
                <div className="text-xs">
                  <div className="font-semibold">Keep ledger rows</div>
                  <div className="text-muted-foreground">
                    Structure is removed, but the rows survive (head names are
                    preserved). Recommended — keeps all history and reports intact.
                  </div>
                </div>
              </label>
              <label
                className={`flex items-start gap-2 rounded-md border p-2 ${
                  safeToDeleteLedgers
                    ? "cursor-pointer border-border hover:bg-muted/40"
                    : "border-border bg-muted/20 opacity-60 cursor-not-allowed"
                }`}
              >
                <input
                  type="radio"
                  className="mt-0.5"
                  name="delete-mode"
                  value="DELETE_LEDGERS"
                  checked={mode === "DELETE_LEDGERS"}
                  onChange={() => safeToDeleteLedgers && setMode("DELETE_LEDGERS")}
                  disabled={!safeToDeleteLedgers}
                />
                <div className="text-xs">
                  <div className="font-semibold">Delete ledger rows too</div>
                  <div className="text-muted-foreground">
                    {safeToDeleteLedgers
                      ? "Wipes the rows generated by this structure. Allowed because no row has been paid or waived."
                      : "Disabled — some ledger rows already have payments or active waivers."}
                  </div>
                </div>
              </label>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={submit}
              loading={submitting}
              loadingText="Deleting…"
            >
              <Trash2 className="h-4 w-4 mr-1" /> Delete Structure
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
