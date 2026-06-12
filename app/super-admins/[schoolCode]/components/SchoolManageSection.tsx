"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import {
  ArrowLeft,
  CalendarIcon,
  GraduationCap,
  Users,
  ShieldCheck,
  ClipboardCheck,
  Trash2,
  Upload,
  Wallet,
  Palette,
  KeyRound,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  CardSkeleton,
  PageHeaderSkeleton,
  StatCardSkeleton,
} from "@/components/ui/skeletons"
import { cn } from "@/lib/utils"
import ImportStudentsModal from "../../components/ImportStudentsModal"
import ImportTeachersModal from "../../components/ImportTeachersModal"
import SubscriptionModal from "./SubscriptionModal"
import SubscriptionHistory from "./SubscriptionHistory"
import EditBrandingModal from "./EditBrandingModal"
import ChangeSchoolCodeModal from "./ChangeSchoolCodeModal"
import type { School } from "../../components/SchoolCard"

const STATUS_STYLES: Record<string, string> = {
  TRIAL: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
  ACTIVE: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  SUSPENDED: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30",
  CANCELLED: "bg-muted text-muted-foreground border-border",
}

type SchoolStats = {
  students: { total: number; active: number }
  teachers: { total: number; active: number }
  admins: number
  pendingFeeVerifications: number
  daysSinceCreated: number
  sessionStartedOn: string | null
}

interface SchoolManageSectionProps {
  schoolCode: string
}

export default function SchoolManageSection({ schoolCode }: SchoolManageSectionProps) {
  const router = useRouter()
  const [school, setSchool] = useState<School | null>(null)
  const [stats, setStats] = useState<SchoolStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [importStudentsOpen, setImportStudentsOpen] = useState(false)
  const [importTeachersOpen, setImportTeachersOpen] = useState(false)
  const [subscriptionOpen, setSubscriptionOpen] = useState(false)
  const [brandingOpen, setBrandingOpen] = useState(false)
  const [codeChangeOpen, setCodeChangeOpen] = useState(false)
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0)
  const [deleting, setDeleting] = useState(false)
  const [sessionDate, setSessionDate] = useState<Date | undefined>(undefined)
  const [savingSession, setSavingSession] = useState(false)
  const [sessionError, setSessionError] = useState<string | null>(null)

  const fetchSchool = useCallback(async () => {
    const [schoolRes, statsRes] = await Promise.all([
      fetch(`/api/schools/${schoolCode}`),
      fetch(`/api/schools/${schoolCode}/stats`),
    ])
    if (schoolRes.ok) {
      const data = await schoolRes.json()
      setSchool(data)
      if (data.session_started_on) {
        setSessionDate(new Date(data.session_started_on))
      }
    }
    if (statsRes.ok) {
      setStats(await statsRes.json())
    }
    setLoading(false)
  }, [schoolCode])

  useEffect(() => {
    void fetchSchool()
  }, [fetchSchool])

  async function handleDelete() {
    if (!school) return
    if (!confirm(`Delete "${school.schoolName}"? This cannot be undone.`)) return
    setDeleting(true)
    const res = await fetch(`/api/schools/${schoolCode}`, { method: "DELETE" })
    if (res.ok) {
      router.push("/super-admins")
    } else {
      setDeleting(false)
    }
  }

  async function handleSessionDateSave() {
    if (!sessionDate) return
    setSavingSession(true)
    setSessionError(null)
    try {
      const dateStr = format(sessionDate, "yyyy-MM-dd")
      const res = await fetch(`/api/schools/${schoolCode}/session-start`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_started_on: dateStr }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || "Failed to update")
      }
      void fetchSchool()
    } catch (err) {
      setSessionError(err instanceof Error ? err.message : "Failed to update")
    } finally {
      setSavingSession(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeaderSkeleton />
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <CardSkeleton lines={5} />
      </div>
    )
  }

  if (!school) {
    return <p className="text-sm text-destructive">School not found.</p>
  }

  const statusStyle =
    STATUS_STYLES[school.subscription_status ?? ""] ?? "bg-muted text-muted-foreground"

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/super-admins">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold truncate">{school.schoolName}</h1>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${statusStyle}`}
            >
              {school.subscription_status ?? "TRIAL"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground font-mono mt-0.5">
            {school.schoolCode}
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <StatCard
          icon={GraduationCap}
          label="Students"
          primary={stats?.students.active ?? 0}
          secondary={
            stats
              ? `${stats.students.total} total`
              : undefined
          }
          tone="emerald"
        />
        <StatCard
          icon={Users}
          label="Teachers"
          primary={stats?.teachers.active ?? 0}
          secondary={
            stats ? `${stats.teachers.total} total` : undefined
          }
          tone="blue"
        />
        <StatCard
          icon={ShieldCheck}
          label="Admins"
          primary={stats?.admins ?? 0}
          tone="violet"
        />
        <StatCard
          icon={ClipboardCheck}
          label="Days Active"
          primary={stats?.daysSinceCreated ?? 0}
          secondary={
            stats?.pendingFeeVerifications
              ? `${stats.pendingFeeVerifications} fee approvals pending`
              : undefined
          }
          tone="slate"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Subscription card + history (spans 2 cols on lg) */}
        <div className="lg:col-span-2 rounded-lg border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold">Subscription</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Plan status, end date, and full change history.
              </p>
            </div>
            <Button size="sm" onClick={() => setSubscriptionOpen(true)}>
              Manage
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Current Status</p>
              <p className="font-medium">{school.subscription_status ?? "TRIAL"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {school.subscription_status === "ACTIVE"
                  ? "Subscription Ends"
                  : "Trial Ends"}
              </p>
              <p className="font-medium">
                {school.subscription_status === "ACTIVE" && school.subscription_ends_at
                  ? new Date(school.subscription_ends_at).toLocaleDateString()
                  : school.trial_ends_at
                  ? new Date(school.trial_ends_at).toLocaleDateString()
                  : "—"}
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-border">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              History
            </h3>
            <SubscriptionHistory
              schoolCode={schoolCode}
              refreshKey={historyRefreshKey}
            />
          </div>
        </div>

        {/* Session start + Actions */}
        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-5 space-y-3">
            <div>
              <h2 className="text-sm font-semibold">Session Start Date</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Anchors attendance % calculations.
              </p>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !sessionDate && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {sessionDate ? format(sessionDate, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={sessionDate}
                  onSelect={setSessionDate}
                  disabled={(date) => date > new Date()}
                />
              </PopoverContent>
            </Popover>
            <Button
              size="sm"
              className="w-full"
              onClick={handleSessionDateSave}
              disabled={!sessionDate}
              loading={savingSession}
              loadingText="Saving..."
            >
              Save
            </Button>
            {school.session_started_on && (
              <p className="text-[11px] text-muted-foreground">
                Current: {new Date(school.session_started_on).toLocaleDateString()}
              </p>
            )}
            {sessionError && (
              <p className="text-xs text-destructive">{sessionError}</p>
            )}
          </div>

          <div className="rounded-lg border bg-card p-5 space-y-3">
            <h2 className="text-sm font-semibold">People</h2>
            <div className="flex flex-col gap-2">
              <Button asChild size="sm" variant="outline" className="justify-start">
                <Link href={`/super-admins/${schoolCode}/details`}>
                  <GraduationCap className="h-4 w-4 mr-2" /> Students
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="justify-start">
                <Link href={`/super-admins/${schoolCode}/teachers`}>
                  <Users className="h-4 w-4 mr-2" /> Teachers
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="justify-start">
                <Link href={`/super-admins/${schoolCode}/admin`}>
                  <ShieldCheck className="h-4 w-4 mr-2" /> Admins
                </Link>
              </Button>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-5 space-y-3">
            <h2 className="text-sm font-semibold">Fees & Branding</h2>
            <div className="flex flex-col gap-2">
              <Button asChild size="sm" variant="outline" className="justify-start">
                <Link href={`/super-admins/${schoolCode}/fees`}>
                  <Wallet className="h-4 w-4 mr-2" /> View Fees Structure
                </Link>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="justify-start"
                onClick={() => setBrandingOpen(true)}
              >
                <Palette className="h-4 w-4 mr-2" /> Edit Branding
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Imports + danger zone */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-5 space-y-3">
          <h2 className="text-sm font-semibold">Bulk Import</h2>
          <p className="text-xs text-muted-foreground">
            Upload CSVs of students or teachers. Existing users are skipped.
          </p>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" onClick={() => setImportStudentsOpen(true)}>
              <Upload className="h-4 w-4 mr-1.5" /> Import Students
            </Button>
            <Button size="sm" variant="outline" onClick={() => setImportTeachersOpen(true)}>
              <Upload className="h-4 w-4 mr-1.5" /> Import Teachers
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-destructive">Danger Zone</h2>
          <p className="text-xs text-destructive/80">
            Deleting a school removes all students, teachers, attendance, fees,
            and history. This cannot be undone.
          </p>
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCodeChangeOpen(true)}
            >
              <KeyRound className="h-4 w-4 mr-1.5" />
              Change School Code
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDelete}
              loading={deleting}
              loadingText="Deleting..."
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Delete School
            </Button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {importStudentsOpen && (
        <ImportStudentsModal
          school={school}
          onClose={() => setImportStudentsOpen(false)}
        />
      )}
      {importTeachersOpen && (
        <ImportTeachersModal
          school={school}
          onClose={() => setImportTeachersOpen(false)}
        />
      )}
      {subscriptionOpen && (
        <SubscriptionModal
          schoolCode={schoolCode}
          currentStatus={school.subscription_status ?? "TRIAL"}
          onClose={() => setSubscriptionOpen(false)}
          onSuccess={() => {
            setSubscriptionOpen(false)
            setHistoryRefreshKey((k) => k + 1)
            void fetchSchool()
          }}
        />
      )}
      {brandingOpen && (
        <EditBrandingModal
          schoolCode={schoolCode}
          onClose={() => setBrandingOpen(false)}
          onSuccess={() => {
            setBrandingOpen(false)
            void fetchSchool()
          }}
        />
      )}
      {codeChangeOpen && school && (
        <ChangeSchoolCodeModal
          currentSchoolCode={schoolCode}
          schoolName={school.schoolName}
          onClose={() => setCodeChangeOpen(false)}
          onSuccess={(newCode) => {
            setCodeChangeOpen(false)
            router.replace(`/super-admins/${newCode}`)
          }}
        />
      )}
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  primary,
  secondary,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  primary: number | string
  secondary?: string
  tone: "emerald" | "blue" | "violet" | "slate"
}) {
  const toneClasses: Record<typeof tone, string> = {
    emerald: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
    blue: "text-blue-600 dark:text-blue-400 bg-blue-500/10",
    violet: "text-violet-600 dark:text-violet-400 bg-violet-500/10",
    slate: "text-muted-foreground bg-muted",
  }
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2">
        <span className={`rounded-md p-1.5 ${toneClasses[tone]}`}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold mt-2 font-mono">{primary}</p>
      {secondary && (
        <p className="text-[11px] text-muted-foreground mt-0.5">{secondary}</p>
      )}
    </div>
  )
}
