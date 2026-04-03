import { prisma } from "@/lib/prisma"
import { countWorkingDays, getWeekStart, getNowIST, getTodayISTString } from "@/lib/working-days"
import { isSchoolHoliday, getSchoolHolidaysInRange } from "@/services/calendar.service"
import { getAdminSchoolId } from "@/services/attendance.service"
import type { AttendanceStatus } from "@prisma/client"
import type {
  TeacherAttendanceRecord,
  TeacherAttendanceSummaryStats,
  TeacherSelfStats,
} from "@/schemas/teacher-attendance.schema"

export { getAdminSchoolId }

// ─── Helpers ─────────────────────────────────────────────────────────

export async function getTeacherSchoolId(teacherUserId: string): Promise<string | null> {
  const teacher = await prisma.teacher.findFirst({
    where: { user_id: teacherUserId, status: "ACTIVE" },
    select: { school_id: true },
  })
  return teacher?.school_id ?? null
}

// ─── Get All Teachers With Attendance Status (Admin) ─────────────────

export async function getAdminTeachers(
  schoolId: string,
  dateStr: string
): Promise<{ summary: TeacherAttendanceSummaryStats; teachers: TeacherAttendanceRecord[] }> {
  const date = new Date(dateStr + "T00:00:00.000Z")

  const teachers = await prisma.teacher.findMany({
    where: { school_id: schoolId, status: "ACTIVE" },
    select: {
      id: true,
      employee_id: true,
      user_id: true,
      user: { select: { name: true, profile_picture: true } },
    },
    orderBy: { user: { name: "asc" } },
  })

  const attendanceRecords = await prisma.teacherAttendance.findMany({
    where: {
      school_id: schoolId,
      date,
      teacher_id: { in: teachers.map((t) => t.id) },
    },
    select: {
      teacher_id: true,
      status: true,
      submitted_at: true,
      submittedBy: { select: { name: true } },
      last_edited_at: true,
      lastEditedBy: { select: { name: true } },
    },
  })

  const attMap = new Map(attendanceRecords.map((r) => [r.teacher_id, r]))

  let totalPresent = 0
  let totalAbsent = 0
  let totalLate = 0

  const records: TeacherAttendanceRecord[] = teachers.map((t) => {
    const att = attMap.get(t.id)
    const status = (att?.status ?? null) as TeacherAttendanceRecord["status"]
    if (status === "PRESENT") totalPresent++
    else if (status === "ABSENT") totalAbsent++
    else if (status === "LATE") totalLate++

    return {
      teacherId: t.id,
      userId: t.user_id,
      name: t.user.name,
      employeeId: t.employee_id,
      profilePicture: t.user.profile_picture,
      status,
      lastEditedAt: (att?.last_edited_at ?? att?.submitted_at)?.toISOString() ?? null,
      lastEditedBy: att?.lastEditedBy?.name ?? att?.submittedBy?.name ?? null,
    }
  })

  const totalTeachers = teachers.length
  const attended = totalPresent + totalLate
  const attendanceRate = totalTeachers > 0
    ? Math.round((attended / totalTeachers) * 100 * 10) / 10
    : 0

  return {
    summary: { totalPresent, totalAbsent, totalLate, totalTeachers, attendanceRate },
    teachers: records,
  }
}

// ─── Submit Teacher Attendance (Admin — current week only) ────────────

export async function submitTeacherAttendance(
  schoolId: string,
  adminUserId: string,
  dateStr: string,
  records: { teacherId: string; status: AttendanceStatus }[]
) {
  const attendanceDate = new Date(dateStr + "T00:00:00.000Z")
  const todayStr = getTodayISTString()

  if (dateStr > todayStr) throw new Error("FUTURE_DATE")

  // Check holiday
  const holiday = await isSchoolHoliday(schoolId, attendanceDate)
  if (holiday) throw new Error("HOLIDAY_DATE")

  // Current week only (same as teacher class attendance)
  const weekStartUTC = getWeekStart()
  const weekStartStr = weekStartUTC.toISOString().split("T")[0]
  if (dateStr < weekStartStr) throw new Error("EDIT_WINDOW_EXPIRED")

  // Check session_started_on
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { session_started_on: true },
  })
  if (school?.session_started_on && attendanceDate < school.session_started_on) {
    throw new Error("BEFORE_SESSION_START")
  }

  // Verify all teacher IDs belong to this school and are active
  const validTeachers = await prisma.teacher.findMany({
    where: {
      school_id: schoolId,
      status: "ACTIVE",
      id: { in: records.map((r) => r.teacherId) },
    },
    select: { id: true },
  })
  const validIds = new Set(validTeachers.map((t) => t.id))
  if (records.some((r) => !validIds.has(r.teacherId))) throw new Error("INVALID_TEACHERS")

  // Optimized batch upsert
  const existingRecords = await prisma.teacherAttendance.findMany({
    where: {
      school_id: schoolId,
      date: attendanceDate,
      teacher_id: { in: records.map((r) => r.teacherId) },
    },
    select: { teacher_id: true },
  })
  const existingIds = new Set(existingRecords.map((r) => r.teacher_id))

  const toCreate = records.filter((r) => !existingIds.has(r.teacherId))
  const toUpdate = records.filter((r) => existingIds.has(r.teacherId))

  const updatesByStatus = new Map<AttendanceStatus, string[]>()
  for (const r of toUpdate) {
    if (!updatesByStatus.has(r.status)) updatesByStatus.set(r.status, [])
    updatesByStatus.get(r.status)!.push(r.teacherId)
  }

  await prisma.$transaction([
    prisma.teacherAttendance.createMany({
      data: toCreate.map((r) => ({
        school_id: schoolId,
        teacher_id: r.teacherId,
        date: attendanceDate,
        status: r.status,
        submitted_by: adminUserId,
      })),
      skipDuplicates: true,
    }),
    ...Array.from(updatesByStatus.entries()).map(([status, teacherIds]) =>
      prisma.teacherAttendance.updateMany({
        where: {
          school_id: schoolId,
          date: attendanceDate,
          teacher_id: { in: teacherIds },
        },
        data: {
          status,
          last_edited_by: adminUserId,
          last_edited_at: new Date(),
        },
      })
    ),
  ])

  return { submitted: records.length }
}

// ─── Edit Single Teacher Attendance (Admin — any past date) ──────────

export async function editTeacherAttendance(
  schoolId: string,
  adminUserId: string,
  teacherId: string,
  dateStr: string,
  status: AttendanceStatus
) {
  const attendanceDate = new Date(dateStr + "T00:00:00.000Z")
  const todayStr = getTodayISTString()

  if (dateStr > todayStr) throw new Error("FUTURE_DATE")

  const holiday = await isSchoolHoliday(schoolId, attendanceDate)
  if (holiday) throw new Error("HOLIDAY_DATE")

  // Check session_started_on
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { session_started_on: true },
  })
  if (school?.session_started_on && attendanceDate < school.session_started_on) {
    throw new Error("BEFORE_SESSION_START")
  }

  const teacher = await prisma.teacher.findFirst({
    where: { id: teacherId, school_id: schoolId, status: "ACTIVE" },
    select: { id: true },
  })
  if (!teacher) throw new Error("INVALID_TEACHERS")

  await prisma.teacherAttendance.upsert({
    where: {
      school_id_teacher_id_date: {
        school_id: schoolId,
        teacher_id: teacherId,
        date: attendanceDate,
      },
    },
    create: {
      school_id: schoolId,
      teacher_id: teacherId,
      date: attendanceDate,
      status,
      submitted_by: adminUserId,
    },
    update: {
      status,
      last_edited_by: adminUserId,
      last_edited_at: new Date(),
    },
  })

  return { updated: true }
}

// ─── Teacher's Own Attendance Stats ──────────────────────────────────

export async function getTeacherSelfStats(teacherUserId: string): Promise<TeacherSelfStats | null> {
  const teacher = await prisma.teacher.findFirst({
    where: { user_id: teacherUserId, status: "ACTIVE" },
    select: {
      id: true,
      school_id: true,
      school: { select: { session_started_on: true } },
    },
  })
  if (!teacher) return null

  const sessionStart = teacher.school.session_started_on
  const today = getNowIST()
  today.setUTCHours(0, 0, 0, 0)

  let totalWorkingDays = 0
  if (sessionStart) {
    const { holidays, workingWeekends } = await getSchoolHolidaysInRange(
      teacher.school_id,
      sessionStart,
      today
    )
    totalWorkingDays = countWorkingDays(sessionStart, today, holidays, workingWeekends)
  }

  const counts = await prisma.teacherAttendance.groupBy({
    by: ["status"],
    where: {
      teacher_id: teacher.id,
      ...(sessionStart ? { date: { gte: sessionStart } } : {}),
    },
    _count: { status: true },
  })

  let presentDays = 0
  let absentDays = 0
  let lateDays = 0
  for (const c of counts) {
    if (c.status === "PRESENT") presentDays = c._count.status
    else if (c.status === "ABSENT") absentDays = c._count.status
    else if (c.status === "LATE") lateDays = c._count.status
  }

  const attended = presentDays + lateDays
  const attendanceRate = totalWorkingDays > 0
    ? Math.round((attended / totalWorkingDays) * 100 * 10) / 10
    : 0

  return {
    sessionStartedOn: sessionStart?.toISOString().split("T")[0] ?? null,
    totalWorkingDays,
    presentDays,
    absentDays,
    lateDays,
    attendanceRate,
  }
}

// ─── Teacher's Monthly Attendance (Calendar View) ────────────────────

export async function getTeacherSelfMonthly(
  teacherUserId: string,
  year: number,
  month: number
): Promise<{ date: string; status: string }[]> {
  const teacher = await prisma.teacher.findFirst({
    where: { user_id: teacherUserId, status: "ACTIVE" },
    select: { id: true },
  })
  if (!teacher) return []

  const startDate = new Date(Date.UTC(year, month - 1, 1))
  const endDate = new Date(Date.UTC(year, month, 0))

  const records = await prisma.teacherAttendance.findMany({
    where: {
      teacher_id: teacher.id,
      date: { gte: startDate, lte: endDate },
    },
    select: { date: true, status: true },
    orderBy: { date: "asc" },
  })

  return records.map((r) => ({
    date: r.date.toISOString().split("T")[0],
    status: r.status,
  }))
}
