"use client"

import { useCallback, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { format } from "date-fns"
import { UserPlus, GraduationCap } from "lucide-react"
import { DashboardGreeting } from "@/components/dashboard-greeting"
import AdminQuickStats from "./AdminQuickStats"
import AdminAttendanceChart from "./AdminAttendanceChart"
import AddStudentModal from "./AddStudentModal"
import AddTeacherModal from "./AddTeacherModal"
import RecentEnrollmentsTable, { type EnrollmentRow } from "./RecentEnrollmentsTable"
import TeacherTodaySchedule from "@/app/teacher/components/TeacherTodaySchedule"
import { Button } from "@/components/ui/button"
import { StatCardSkeleton } from "@/components/ui/skeletons"
import { DataErrorState } from "@/components/ui/data-error-state"
import type { AttendanceSummaryStats, ClassAttendanceSummary } from "@/schemas/attendance.schema"
import type { CreateStudentResult } from "@/schemas/student.schema"
import type { CreateTeacherResult } from "@/schemas/teacher.schema"

interface AdminAttendanceData {
  summary: AttendanceSummaryStats
  classes: ClassAttendanceSummary[]
}

export default function AdminDashboard() {
  const { data: session } = useSession()
  const [attendanceData, setAttendanceData] = useState<AdminAttendanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addStudentOpen, setAddStudentOpen] = useState(false)
  const [addTeacherOpen, setAddTeacherOpen] = useState(false)
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([])
  // Show Today's Schedule widget only when the admin actually has teaching
  // duties (class-teacher or any timetable subject). Pure admins see no change.
  const [showTodaySchedule, setShowTodaySchedule] = useState(false)

  const today = format(new Date(), "yyyy-MM-dd")

  const fetchAttendance = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/attendance?date=${today}`)
      if (!res.ok) throw new Error("Failed to fetch")
      setAttendanceData(await res.json())
    } catch {
      setError("Could not load attendance data.")
    } finally {
      setLoading(false)
    }
  }, [today])

  useEffect(() => {
    fetchAttendance()
  }, [fetchAttendance])

  useEffect(() => {
    fetch("/api/admin/teaching-context")
      .then((r) => (r.ok ? r.json() : null))
      .then((ctx) =>
        setShowTodaySchedule(
          Boolean(ctx?.isClassTeacher) || Boolean(ctx?.hasTimetable),
        ),
      )
      .catch(() => {/* non-critical */})
  }, [])

  function handleStudentSuccess(result: CreateStudentResult) {
    setEnrollments((prev) =>
      [
        {
          type: "Student" as const,
          id: result.username,
          name: result.name,
          class: result.class,
          section: result.section,
          roll_no: result.roll_no,
          temporaryPassword: result.temporaryPassword,
        },
        ...prev,
      ].slice(0, 10)
    )
  }

  function handleTeacherSuccess(result: CreateTeacherResult) {
    setEnrollments((prev) =>
      [
        {
          type: "Teacher" as const,
          id: result.employeeId,
          name: result.name,
          temporaryPassword: result.temporaryPassword,
        },
        ...prev,
      ].slice(0, 10)
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <DashboardGreeting
        name={session?.user?.name ?? "Admin"}
        subtitle="Here's an overview of your school today."
      />

      {showTodaySchedule && (
        <TeacherTodaySchedule title="Today's Assigned Classes" />
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      ) : error ? (
        <DataErrorState
          title="Couldn't load attendance data"
          description="Something went wrong on our side."
          onRetry={fetchAttendance}
        />
      ) : attendanceData ? (
        <AdminQuickStats
          totalStudents={attendanceData.summary.totalStudents}
          attendanceRate={attendanceData.summary.attendanceRate}
        />
      ) : null}

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Quick Actions</h2>
        <div className="flex gap-3 flex-wrap">
          <Button onClick={() => setAddStudentOpen(true)} className="gap-2">
            <GraduationCap className="h-4 w-4" />
            Add Student
          </Button>
          <Button variant="outline" onClick={() => setAddTeacherOpen(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Add Teacher
          </Button>
        </div>
      </div>

      <AdminAttendanceChart classes={attendanceData?.classes ?? []} />

      {/* Recent Enrollments */}
      {enrollments.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3">Recent Enrollments</h2>
          <RecentEnrollmentsTable rows={enrollments} />
        </div>
      )}

      <AddStudentModal
        open={addStudentOpen}
        onOpenChange={setAddStudentOpen}
        onSuccess={handleStudentSuccess}
      />
      <AddTeacherModal
        open={addTeacherOpen}
        onOpenChange={setAddTeacherOpen}
        onSuccess={handleTeacherSuccess}
      />
    </div>
  )
}
