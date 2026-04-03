"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import ImportStudentsModal from "../../components/ImportStudentsModal"
import ImportTeachersModal from "../../components/ImportTeachersModal"
import SubscriptionModal from "./SubscriptionModal"
import type { School } from "../../components/SchoolCard"

const STATUS_STYLES: Record<string, string> = {
  TRIAL: "bg-yellow-100 text-yellow-800",
  ACTIVE: "bg-green-100 text-green-800",
  SUSPENDED: "bg-red-100 text-red-800",
  CANCELLED: "bg-gray-100 text-gray-600",
}

interface SchoolManageSectionProps {
  schoolCode: string
}

export default function SchoolManageSection({ schoolCode }: SchoolManageSectionProps) {
  const router = useRouter()
  const [school, setSchool] = useState<School | null>(null)
  const [loading, setLoading] = useState(true)
  const [importStudentsOpen, setImportStudentsOpen] = useState(false)
  const [importTeachersOpen, setImportTeachersOpen] = useState(false)
  const [subscriptionOpen, setSubscriptionOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [sessionDate, setSessionDate] = useState<Date | undefined>(undefined)
  const [savingSession, setSavingSession] = useState(false)
  const [sessionError, setSessionError] = useState<string | null>(null)

  const fetchSchool = useCallback(async () => {
    const res = await fetch(`/api/schools/${schoolCode}`)
    if (res.ok) {
      const data = await res.json()
      setSchool(data)
      if (data.session_started_on) {
        setSessionDate(new Date(data.session_started_on))
      }
    }
    setLoading(false)
  }, [schoolCode])

  useEffect(() => {
    fetchSchool()
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
      fetchSchool()
    } catch (err) {
      setSessionError(err instanceof Error ? err.message : "Failed to update")
    } finally {
      setSavingSession(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>
  }

  if (!school) {
    return <p className="text-sm text-destructive">School not found.</p>
  }

  const statusStyle = STATUS_STYLES[school.subscription_status ?? ""] ?? "bg-gray-100 text-gray-600"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="sm">
          <Link href="/super-admins">← Back</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{school.schoolName}</h1>
          <p className="text-sm text-muted-foreground font-mono">{school.schoolCode}</p>
        </div>
      </div>

      {/* Subscription Info */}
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Subscription</h2>
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyle}`}>
            {school.subscription_status ?? "TRIAL"}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {school.trial_ends_at && (
            <div>
              <p className="text-muted-foreground">Trial Ends</p>
              <p className="font-medium">{new Date(school.trial_ends_at).toLocaleDateString()}</p>
            </div>
          )}
          {school.subscription_ends_at && (
            <div>
              <p className="text-muted-foreground">Subscription Ends</p>
              <p className="font-medium">{new Date(school.subscription_ends_at).toLocaleDateString()}</p>
            </div>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={() => setSubscriptionOpen(true)}>
          Manage Subscription
        </Button>
      </div>

      {/* Session Start Date */}
      <div className="rounded-lg border p-4 space-y-3">
        <h2 className="text-sm font-semibold">Session Start Date</h2>
        <p className="text-xs text-muted-foreground">
          Attendance calculations start from this date. Set this when the school begins using the attendance system.
        </p>
        <div className="flex items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "w-[200px] justify-start text-left font-normal",
                  !sessionDate && "text-muted-foreground"
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
            onClick={handleSessionDateSave}
            disabled={!sessionDate || savingSession}
          >
            {savingSession ? "Saving..." : "Save"}
          </Button>
        </div>
        {school.session_started_on && (
          <p className="text-xs text-muted-foreground">
            Current: {new Date(school.session_started_on).toLocaleDateString()}
          </p>
        )}
        {sessionError && (
          <p className="text-sm text-destructive">{sessionError}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button size="sm" onClick={() => setImportStudentsOpen(true)}>
          Import Students
        </Button>
        <Button size="sm" variant="outline" onClick={() => setImportTeachersOpen(true)}>
          Import Teachers
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={`/super-admins/${schoolCode}/details`}>Student Details</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={`/super-admins/${schoolCode}/teachers`}>Teacher Details</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={`/super-admins/${schoolCode}/admin`}>Admin Details</Link>
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? "Deleting..." : "Delete School"}
        </Button>
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
            fetchSchool()
          }}
        />
      )}
    </div>
  )
}
