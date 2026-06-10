"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { CheckCircle2, Loader2, Pencil, Plus, Star, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"

type Config = {
  payment_mode?: "FULL_MANUAL" | "FULL_ONLINE" | "HYBRID" | null
  currency?: string
  default_late_fee_enabled?: boolean
  default_late_fee_type?: "FIXED" | "PERCENT" | null
  default_late_fee_value?: string | number | null
  default_late_fee_grace_day_of_month?: number | null
  default_late_fee_frequency?: "MONTHLY" | "DAILY" | "ONE_TIME" | null
}

type BankAccount = {
  id: string
  label: string | null
  account_holder: string
  bank_name: string
  account_number: string
  ifsc: string
  branch: string | null
  account_type: string | null
  is_active: boolean
}

type UpiAccount = {
  id: string
  upi_id: string
  label: string | null
  is_active: boolean
}

type QrCode = {
  id: string
  image_url: string
  caption: string
  label: string | null
  bank_account_id: string | null
  is_active: boolean
}

const EMPTY_CONFIG: Config = {
  payment_mode: "FULL_MANUAL",
  currency: "INR",
  default_late_fee_enabled: false,
  default_late_fee_type: null,
  default_late_fee_value: null,
  default_late_fee_grace_day_of_month: null,
  default_late_fee_frequency: "MONTHLY",
}

export default function PaymentConfigSection() {
  const [schoolCode, setSchoolCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [config, setConfig] = useState<Config | null>(null)
  const [banks, setBanks] = useState<BankAccount[]>([])
  const [upis, setUpis] = useState<UpiAccount[]>([])
  const [qrs, setQrs] = useState<QrCode[]>([])

  const reloadAccounts = useCallback(async (code: string) => {
    const [b, u, q] = await Promise.all([
      fetch(`/api/schools/${code}/bank-accounts`).then((r) => (r.ok ? r.json() : { items: [] })),
      fetch(`/api/schools/${code}/upi-accounts`).then((r) => (r.ok ? r.json() : { items: [] })),
      fetch(`/api/schools/${code}/qr-codes`).then((r) => (r.ok ? r.json() : { items: [] })),
    ])
    setBanks(b.items ?? [])
    setUpis(u.items ?? [])
    setQrs(q.items ?? [])
  }, [])

  // Auto-load admin's schoolCode from /api/profile on mount, then fetch the
  // school's payment config + accounts. No manual school-code entry — admins
  // can only manage their own school here.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const profileRes = await fetch("/api/profile")
        if (!profileRes.ok) {
          setLoadError("Could not load your profile. Please refresh and try again.")
          setLoading(false)
          return
        }
        const profile = await profileRes.json()
        const code: string | undefined = profile?.schoolUsers?.[0]?.school?.schoolCode
        if (!code) {
          setLoadError("Your account is not linked to a school.")
          setLoading(false)
          return
        }
        if (cancelled) return
        setSchoolCode(code)

        const cfgRes = await fetch(`/api/schools/${code}/payment-config`)
        if (!cfgRes.ok) {
          const err = await cfgRes.json().catch(() => ({}))
          setLoadError(err.message ?? "Could not load payment config")
          setLoading(false)
          return
        }
        const data = (await cfgRes.json()) as Config & { paymentMode?: string | null }
        if (cancelled) return
        // GET returns { paymentMode: null } when no row exists — render an
        // editable empty form so the admin can save the first config.
        const hasRow = data && (data.payment_mode || data.currency)
        setConfig(hasRow ? data : { ...EMPTY_CONFIG })

        await reloadAccounts(code)
      } catch {
        if (!cancelled) setLoadError("Network error while loading payment settings.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [reloadAccounts])

  async function save() {
    if (!schoolCode || !config) return
    setSaving(true)
    try {
      const payload = {
        paymentMode: config.payment_mode ?? "FULL_MANUAL",
        currency: config.currency ?? "INR",
        defaultLateFeeEnabled: config.default_late_fee_enabled ?? false,
        defaultLateFeeType: config.default_late_fee_type ?? null,
        defaultLateFeeValue:
          config.default_late_fee_value != null ? Number(config.default_late_fee_value) : null,
        defaultLateFeeGraceDayOfMonth: config.default_late_fee_grace_day_of_month ?? null,
        defaultLateFeeFrequency: config.default_late_fee_frequency ?? "MONTHLY",
      }
      const res = await fetch(`/api/schools/${schoolCode}/payment-config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.message ?? "Failed to save")
        return
      }
      toast.success("Payment settings saved")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading payment settings…
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
        {loadError}
      </div>
    )
  }

  if (!schoolCode || !config) return null

  function update<K extends keyof Config>(key: K, value: Config[K]) {
    setConfig((c) => (c ? { ...c, [key]: value } : c))
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="space-y-4 rounded-md border border-border bg-card p-4">
        <h3 className="text-sm font-semibold">Mode & Policy</h3>
        <div className="space-y-1">
          <label className="text-sm font-medium">Payment Mode</label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={config.payment_mode ?? "FULL_MANUAL"}
            onChange={(e) => update("payment_mode", e.target.value as Config["payment_mode"])}
          >
            <option value="FULL_MANUAL">Full Manual</option>
            <option value="HYBRID">Hybrid</option>
            <option value="FULL_ONLINE">Full Online (coming soon)</option>
          </select>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">Currency</label>
            <Input
              value={config.currency ?? "INR"}
              onChange={(e) => update("currency", e.target.value)}
            />
          </div>
        </div>

        <div className="rounded-md border border-border bg-muted/30 p-3 space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={Boolean(config.default_late_fee_enabled)}
              onChange={(e) => update("default_late_fee_enabled", e.target.checked)}
            />
            Enable default late fee
          </label>
          <p className="text-xs text-muted-foreground">
            Late fee is applied per month block (sum of all fee heads for that student × month), not per fee head.
          </p>
          {config.default_late_fee_enabled && (
            <div className="space-y-3 pl-6">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Type</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={config.default_late_fee_type ?? "FIXED"}
                    onChange={(e) =>
                      update("default_late_fee_type", e.target.value as "FIXED" | "PERCENT")
                    }
                  >
                    <option value="FIXED">Fixed</option>
                    <option value="PERCENT">Percent</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Value</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={config.default_late_fee_value?.toString() ?? ""}
                    onChange={(e) => update("default_late_fee_value", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Grace day of month</label>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    value={config.default_late_fee_grace_day_of_month ?? ""}
                    onChange={(e) =>
                      update(
                        "default_late_fee_grace_day_of_month",
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Frequency</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={config.default_late_fee_frequency ?? "MONTHLY"}
                    onChange={(e) =>
                      update(
                        "default_late_fee_frequency",
                        e.target.value as "MONTHLY" | "DAILY" | "ONE_TIME",
                      )
                    }
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="DAILY">Daily</option>
                    <option value="ONE_TIME">One-time</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        <Button onClick={save} loading={saving} loadingText="Saving…">
          Save Mode & Policy
        </Button>
      </div>

      <BankAccountsManager
        schoolCode={schoolCode}
        items={banks}
        reload={() => reloadAccounts(schoolCode)}
      />
      <UpiAccountsManager
        schoolCode={schoolCode}
        items={upis}
        reload={() => reloadAccounts(schoolCode)}
      />
      <QrCodesManager
        schoolCode={schoolCode}
        items={qrs}
        banks={banks}
        reload={() => reloadAccounts(schoolCode)}
      />
    </div>
  )
}

// ─── Bank Accounts ────────────────────────────────────────────────────────────

type BankDraft = {
  label: string
  accountHolder: string
  bankName: string
  accountNumber: string
  ifsc: string
  branch: string
  accountType: string
}

function newBankDraft(): BankDraft {
  return {
    label: "",
    accountHolder: "",
    bankName: "",
    accountNumber: "",
    ifsc: "",
    branch: "",
    accountType: "",
  }
}

function BankAccountsManager({
  schoolCode,
  items,
  reload,
}: {
  schoolCode: string
  items: BankAccount[]
  reload: () => Promise<void>
}) {
  const [editing, setEditing] = useState<BankAccount | null>(null)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<BankDraft>(newBankDraft())
  const [saving, setSaving] = useState(false)

  function openCreate() {
    setEditing(null)
    setDraft(newBankDraft())
    setOpen(true)
  }
  function openEdit(b: BankAccount) {
    setEditing(b)
    setDraft({
      label: b.label ?? "",
      accountHolder: b.account_holder,
      bankName: b.bank_name,
      accountNumber: b.account_number,
      ifsc: b.ifsc,
      branch: b.branch ?? "",
      accountType: b.account_type ?? "",
    })
    setOpen(true)
  }

  async function save() {
    setSaving(true)
    try {
      const payload = {
        label: draft.label.trim() || null,
        accountHolder: draft.accountHolder.trim(),
        bankName: draft.bankName.trim(),
        accountNumber: draft.accountNumber.trim(),
        ifsc: draft.ifsc.trim().toUpperCase(),
        branch: draft.branch.trim() || null,
        accountType: draft.accountType.trim() || null,
      }
      const url = editing
        ? `/api/schools/${schoolCode}/bank-accounts/${editing.id}`
        : `/api/schools/${schoolCode}/bank-accounts`
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.message ?? "Failed to save")
        return
      }
      toast.success("Bank account saved")
      setOpen(false)
      await reload()
    } finally {
      setSaving(false)
    }
  }

  async function setActive(id: string) {
    const res = await fetch(`/api/schools/${schoolCode}/bank-accounts/${id}/activate`, {
      method: "POST",
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      toast.error(err.message ?? "Failed to set active")
      return
    }
    toast.success("Active bank account updated")
    await reload()
  }

  async function remove(id: string) {
    if (!confirm("Delete this bank account?")) return
    const res = await fetch(`/api/schools/${schoolCode}/bank-accounts/${id}`, {
      method: "DELETE",
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      toast.error(err.message ?? "Failed to delete")
      return
    }
    toast.success("Deleted")
    await reload()
  }

  return (
    <div className="rounded-md border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Bank Accounts</h3>
          <p className="text-xs text-muted-foreground">
            Up to 5. Only the active account is shown to students.
          </p>
        </div>
        <Button size="sm" onClick={openCreate} disabled={items.length >= 5}>
          <Plus className="h-4 w-4 mr-1" /> Add Bank
        </Button>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No bank accounts yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((b) => (
            <li
              key={b.id}
              className={`flex items-start justify-between gap-2 rounded-md border p-3 ${
                b.is_active ? "border-emerald-300 bg-emerald-500/10/30" : "border-border bg-muted/20"
              }`}
            >
              <div className="text-sm">
                <div className="font-medium flex items-center gap-2">
                  {b.label || b.bank_name}
                  {b.is_active && (
                    <span className="text-xs text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Active
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {b.account_holder} • {b.bank_name} • {b.ifsc}
                </div>
                <div className="text-xs font-mono text-muted-foreground">
                  A/C: ****{b.account_number.slice(-4)}
                </div>
              </div>
              <div className="flex gap-1">
                {!b.is_active && (
                  <Button size="sm" variant="outline" onClick={() => setActive(b.id)}>
                    <Star className="h-3.5 w-3.5 mr-1" /> Set Active
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => openEdit(b)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(b.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={(o) => !o && setOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Bank Account" : "Add Bank Account"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Label (e.g. Main, Hostel)"
              value={draft.label}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
            />
            <Input
              placeholder="Account holder name"
              value={draft.accountHolder}
              onChange={(e) => setDraft({ ...draft, accountHolder: e.target.value })}
            />
            <Input
              placeholder="Bank name"
              value={draft.bankName}
              onChange={(e) => setDraft({ ...draft, bankName: e.target.value })}
            />
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                placeholder="Account number"
                value={draft.accountNumber}
                onChange={(e) => setDraft({ ...draft, accountNumber: e.target.value })}
              />
              <Input
                placeholder="IFSC"
                value={draft.ifsc}
                onChange={(e) =>
                  setDraft({ ...draft, ifsc: e.target.value.toUpperCase() })
                }
                maxLength={11}
                className="uppercase"
              />
            </div>
            <Input
              placeholder="Branch (optional)"
              value={draft.branch}
              onChange={(e) => setDraft({ ...draft, branch: e.target.value })}
            />
            <Input
              placeholder="Account type (e.g. Current, Savings)"
              value={draft.accountType}
              onChange={(e) => setDraft({ ...draft, accountType: e.target.value })}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={save} loading={saving} loadingText="Saving…">
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── UPI Accounts ─────────────────────────────────────────────────────────────

function UpiAccountsManager({
  schoolCode,
  items,
  reload,
}: {
  schoolCode: string
  items: UpiAccount[]
  reload: () => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<UpiAccount | null>(null)
  const [upiId, setUpiId] = useState("")
  const [label, setLabel] = useState("")
  const [saving, setSaving] = useState(false)

  function openCreate() {
    setEditing(null)
    setUpiId("")
    setLabel("")
    setOpen(true)
  }
  function openEdit(u: UpiAccount) {
    setEditing(u)
    setUpiId(u.upi_id)
    setLabel(u.label ?? "")
    setOpen(true)
  }

  async function save() {
    setSaving(true)
    try {
      const url = editing
        ? `/api/schools/${schoolCode}/upi-accounts/${editing.id}`
        : `/api/schools/${schoolCode}/upi-accounts`
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ upiId: upiId.trim(), label: label.trim() || null }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.message ?? "Failed to save")
        return
      }
      toast.success("UPI saved")
      setOpen(false)
      await reload()
    } finally {
      setSaving(false)
    }
  }

  async function setActive(id: string) {
    const res = await fetch(`/api/schools/${schoolCode}/upi-accounts/${id}/activate`, {
      method: "POST",
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      toast.error(err.message ?? "Failed to set active")
      return
    }
    toast.success("Active UPI updated")
    await reload()
  }

  async function remove(id: string) {
    if (!confirm("Delete this UPI?")) return
    const res = await fetch(`/api/schools/${schoolCode}/upi-accounts/${id}`, { method: "DELETE" })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      toast.error(err.message ?? "Failed to delete")
      return
    }
    toast.success("Deleted")
    await reload()
  }

  return (
    <div className="rounded-md border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">UPI IDs</h3>
          <p className="text-xs text-muted-foreground">Up to 5. Active UPI is shown to students.</p>
        </div>
        <Button size="sm" onClick={openCreate} disabled={items.length >= 5}>
          <Plus className="h-4 w-4 mr-1" /> Add UPI
        </Button>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No UPI IDs yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((u) => (
            <li
              key={u.id}
              className={`flex items-start justify-between gap-2 rounded-md border p-3 ${
                u.is_active ? "border-emerald-300 bg-emerald-500/10/30" : "border-border bg-muted/20"
              }`}
            >
              <div className="text-sm">
                <div className="font-medium flex items-center gap-2">
                  {u.label || u.upi_id}
                  {u.is_active && (
                    <span className="text-xs text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Active
                    </span>
                  )}
                </div>
                <div className="text-xs font-mono text-muted-foreground">{u.upi_id}</div>
              </div>
              <div className="flex gap-1">
                {!u.is_active && (
                  <Button size="sm" variant="outline" onClick={() => setActive(u.id)}>
                    <Star className="h-3.5 w-3.5 mr-1" /> Set Active
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => openEdit(u)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(u.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={(o) => !o && setOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit UPI ID" : "Add UPI ID"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="school@bank"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
            />
            <Input
              placeholder="Label (optional)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={save} loading={saving} loadingText="Saving…">
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── QR Codes ─────────────────────────────────────────────────────────────────

function QrCodesManager({
  schoolCode,
  items,
  banks,
  reload,
}: {
  schoolCode: string
  items: QrCode[]
  banks: BankAccount[]
  reload: () => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<QrCode | null>(null)
  const [caption, setCaption] = useState("")
  const [label, setLabel] = useState("")
  const [bankAccountId, setBankAccountId] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function openCreate() {
    setEditing(null)
    setCaption("")
    setLabel("")
    setBankAccountId("")
    setImageUrl("")
    setFile(null)
    setOpen(true)
  }
  function openEdit(q: QrCode) {
    setEditing(q)
    setCaption(q.caption)
    setLabel(q.label ?? "")
    setBankAccountId(q.bank_account_id ?? "")
    setImageUrl(q.image_url)
    setFile(null)
    setOpen(true)
  }

  async function uploadIfNeeded(): Promise<string | null> {
    if (!file) return imageUrl || null
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("schoolCode", schoolCode)
      const res = await fetch("/api/upload/qr-code", { method: "POST", body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.url) {
        toast.error(data?.message ?? "Upload failed")
        return null
      }
      return data.url
    } finally {
      setUploading(false)
    }
  }

  async function save() {
    if (!caption.trim()) {
      toast.error("Caption is required")
      return
    }
    setSaving(true)
    try {
      const finalUrl = await uploadIfNeeded()
      if (!finalUrl) {
        toast.error("QR image is required")
        return
      }
      const payload = {
        imageUrl: finalUrl,
        caption: caption.trim(),
        label: label.trim() || null,
        bankAccountId: bankAccountId || null,
      }
      const url = editing
        ? `/api/schools/${schoolCode}/qr-codes/${editing.id}`
        : `/api/schools/${schoolCode}/qr-codes`
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.message ?? "Failed to save")
        return
      }
      toast.success("QR saved")
      setOpen(false)
      if (fileRef.current) fileRef.current.value = ""
      setFile(null)
      await reload()
    } finally {
      setSaving(false)
    }
  }

  async function setActive(id: string) {
    const res = await fetch(`/api/schools/${schoolCode}/qr-codes/${id}/activate`, { method: "POST" })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      toast.error(err.message ?? "Failed to set active")
      return
    }
    toast.success("Active QR updated")
    await reload()
  }

  async function remove(id: string) {
    if (!confirm("Delete this QR code?")) return
    const res = await fetch(`/api/schools/${schoolCode}/qr-codes/${id}`, { method: "DELETE" })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      toast.error(err.message ?? "Failed to delete")
      return
    }
    toast.success("Deleted")
    await reload()
  }

  return (
    <div className="rounded-md border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">QR Codes</h3>
          <p className="text-xs text-muted-foreground">
            Up to 5. Caption explains which bank/UPI this QR points to.
          </p>
        </div>
        <Button size="sm" onClick={openCreate} disabled={items.length >= 5}>
          <Plus className="h-4 w-4 mr-1" /> Add QR
        </Button>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No QR codes yet.</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {items.map((q) => (
            <li
              key={q.id}
              className={`flex gap-3 rounded-md border p-3 ${
                q.is_active ? "border-emerald-300 bg-emerald-500/10/30" : "border-border bg-muted/20"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={q.image_url} alt={q.caption} className="size-20 rounded border object-cover" />
              <div className="flex-1 space-y-1 text-sm">
                <div className="font-medium flex items-center gap-2">
                  {q.label || q.caption.slice(0, 30)}
                  {q.is_active && (
                    <span className="text-xs text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{q.caption}</p>
                <div className="flex gap-1 pt-1">
                  {!q.is_active && (
                    <Button size="sm" variant="outline" onClick={() => setActive(q.id)}>
                      <Star className="h-3.5 w-3.5 mr-1" /> Set Active
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => openEdit(q)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(q.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={(o) => !o && setOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit QR Code" : "Add QR Code"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">QR image</label>
              <div className="flex items-center gap-3">
                {(file || imageUrl) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={file ? URL.createObjectURL(file) : imageUrl}
                    alt="QR preview"
                    className="size-20 rounded border object-cover"
                  />
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="text-sm"
                />
              </div>
              <p className="text-xs text-muted-foreground">PNG/JPG/WebP, max 2MB.</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Caption (required)</label>
              <Textarea
                placeholder="e.g. 'Scan this QR to pay to the Main bank account (HDFC, ****1234)'"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                maxLength={200}
              />
            </div>
            <Input
              placeholder="Label (optional)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
            <div className="space-y-1">
              <label className="text-xs font-medium">Linked bank account (optional)</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={bankAccountId}
                onChange={(e) => setBankAccountId(e.target.value)}
              >
                <option value="">None</option>
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label || b.bank_name} (****{b.account_number.slice(-4)})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={save}
                loading={saving || uploading}
                loadingText={uploading ? "Uploading…" : "Saving…"}
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
