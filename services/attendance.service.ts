import { prisma } from "@/lib/prisma"
import { countWorkingDays, getWeekStart, getNowIST, getTodayISTString } from "@/lib/working-days"
import { isSchoolHoliday, getSchoolHolidaysInRange } from "@/services/calendar.service"
import { getActiveAccessForTeacherAndDate } from "@/services/attendance-access.service"
import type {
  AttendanceStatus,
  AttendanceSummaryStats,
  ClassAttendanceSummary,
  StudentAttendanceRecord,
  StudentAttendanceStats,
  ClassStudentStat,
} from "@/schemas/attendance.schema"

// ─── Submit / Update Attendance (Teacher) ────────────────────────────

export async function submitAttendance(
  schoolId: string,
  teacherUserId: string,
  dateStr: string,
  records: { studentId: string; status: AttendanceStatus }[]
) {
  // 1. Resolve teacher's class assignment
  const teacher = await prisma.teacher.findFirst({
    where: { user_id: teacherUserId, school_id: schoolId },
    select: {
      id: true,
      user_id: true,
      classTeacher: { select: { class: true, section: true } },
    },
  })
  if (!teacher) throw new Error("NOT_CLASS_TEACHER")

  let className: string
  let section: string

  if (teacher.classTeacher) {
    className = teacher.classTeacher.class
    section   = teacher.classTeacher.section
  } else {
    // Fall back to temporary attendance access for this date
    const access = await getActiveAccessForTeacherAndDate(teacher.id, dateStr)
    if (!access) throw new Error("NOT_CLASS_TEACHER")
    className = access.class
    section   = access.section
  }

  // 2. Validate date — use IST for "today" since app serves Indian schools only
  const attendanceDate = new Date(dateStr + "T00:00:00.000Z")
  const todayStr = getTodayISTString()

  if (dateStr > todayStr) throw new Error("FUTURE_DATE")

  // 2a. Check if the date is a school holiday (weekends + custom holidays)
  const holiday = await isSchoolHoliday(schoolId, attendanceDate)
  if (holiday) throw new Error("HOLIDAY_DATE")

  // 2b. Teacher edit window — current week only (Mon–Sun), week computed in IST
  const weekStartUTC = getWeekStart()
  if (attendanceDate < weekStartUTC) throw new Error("EDIT_WINDOW_EXPIRED")

  // 3. Check session_started_on
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { session_started_on: true },
  })
  if (school?.session_started_on && attendanceDate < school.session_started_on) {
    throw new Error("BEFORE_SESSION_START")
  }

  // 4. Verify all students belong to this class and are active
  const validStudents = await prisma.student.findMany({
    where: {
      school_id: schoolId,
      class: className,
      section,
      status: "ACTIVE",
      id: { in: records.map((r) => r.studentId) },
    },
    select: { id: true },
  })
  const validIds = new Set(validStudents.map((s) => s.id))
  const invalidRecords = records.filter((r) => !validIds.has(r.studentId))
  if (invalidRecords.length > 0) throw new Error("INVALID_STUDENTS")

  // 5. Batch upsert: fetch existing → createMany for new + updateMany per status for existing
  //    Reduces from N upsert queries to max 5 queries regardless of class size.
  const existingRecords = await prisma.attendance.findMany({
    where: {
      school_id: schoolId,
      date: attendanceDate,
      student_id: { in: records.map((r) => r.studentId) },
    },
    select: { student_id: true },
  })
  const existingIds = new Set(existingRecords.map((r) => r.student_id))

  const toCreate = records.filter((r) => !existingIds.has(r.studentId))
  const toUpdate = records.filter((r) => existingIds.has(r.studentId))

  // Group updates by status — at most 3 updateMany calls (PRESENT/ABSENT/LATE)
  const updatesByStatus = new Map<AttendanceStatus, string[]>()
  for (const r of toUpdate) {
    if (!updatesByStatus.has(r.status)) updatesByStatus.set(r.status, [])
    updatesByStatus.get(r.status)!.push(r.studentId)
  }

  await prisma.$transaction([
    prisma.attendance.createMany({
      data: toCreate.map((r) => ({
        school_id: schoolId,
        student_id: r.studentId,
        date: attendanceDate,
        status: r.status,
        submitted_by: teacher.user_id,
      })),
    }),
    ...Array.from(updatesByStatus.entries()).map(([status, studentIds]) =>
      prisma.attendance.updateMany({
        where: {
          school_id: schoolId,
          date: attendanceDate,
          student_id: { in: studentIds },
        },
        data: {
          status,
          last_edited_by: teacher.user_id,
          last_edited_at: new Date(),
        },
      })
    ),
  ])

  return { submitted: records.length, class: className, section }
}

// ─── School Attendance Summary (Admin) ───────────────────────────────

export async function getSchoolAttendanceSummary(
  schoolId: string,
  dateStr: string
): Promise<{ summary: AttendanceSummaryStats; classes: ClassAttendanceSummary[] }> {
  const date = new Date(dateStr + "T00:00:00.000Z")

  // Get all active students grouped by class/section
  const activeStudents = await prisma.student.findMany({
    where: { school_id: schoolId, status: "ACTIVE" },
    select: { id: true, class: true, section: true },
  })

  // Get all attendance records for this date
  const attendanceRecords = await prisma.attendance.findMany({
    where: { school_id: schoolId, date },
    select: { student_id: true, status: true },
  })

  // Get class teacher names
  const classTeachers = await prisma.classTeacher.findMany({
    where: { school_id: schoolId },
    select: {
      class: true,
      section: true,
      teacher: { select: { user: { select: { name: true } } } },
    },
  })

  const teacherMap = new Map<string, string>()
  for (const ct of classTeachers) {
    teacherMap.set(`${ct.class}-${ct.section}`, ct.teacher.user.name)
  }

  // Build attendance map
  const attendanceMap = new Map<string, string>()
  for (const rec of attendanceRecords) {
    attendanceMap.set(rec.student_id, rec.status)
  }

  // Group students by class-section
  const classGroups = new Map<string, { class: string; section: string; studentIds: string[] }>()
  for (const s of activeStudents) {
    const key = `${s.class}-${s.section}`
    if (!classGroups.has(key)) {
      classGroups.set(key, { class: s.class, section: s.section, studentIds: [] })
    }
    classGroups.get(key)!.studentIds.push(s.id)
  }

  // Calculate per-class stats
  let totalPresent = 0
  let totalAbsent = 0
  let totalLate = 0
  const totalStudents = activeStudents.length

  const classes: ClassAttendanceSummary[] = []

  for (const [key, group] of classGroups) {
    let classPresent = 0
    let classAbsent = 0
    let classLate = 0

    for (const sid of group.studentIds) {
      const status = attendanceMap.get(sid)
      if (status === "PRESENT") classPresent++
      else if (status === "ABSENT") classAbsent++
      else if (status === "LATE") classLate++
    }

    totalPresent += classPresent
    totalAbsent += classAbsent
    totalLate += classLate

    const classTotal = group.studentIds.length
    const classAttended = classPresent + classLate
    const rate = classTotal > 0 ? Math.round((classAttended / classTotal) * 100 * 10) / 10 : 0

    classes.push({
      class: group.class,
      section: group.section,
      className: `${group.class}-${group.section}`,
      classTeacher: teacherMap.get(key) ?? null,
      totalStudents: classTotal,
      totalPresent: classPresent,
      totalAbsent: classAbsent,
      totalLate: classLate,
      attendanceRate: rate,
    })
  }

  // Sort classes naturally
  classes.sort((a, b) => {
    const classCompare = a.class.localeCompare(b.class, undefined, { numeric: true })
    return classCompare !== 0 ? classCompare : a.section.localeCompare(b.section)
  })

  const overallAttended = totalPresent + totalLate
  const overallRate = totalStudents > 0
    ? Math.round((overallAttended / totalStudents) * 100 * 10) / 10
    : 0

  return {
    summary: {
      totalPresent,
      totalAbsent,
      totalLate,
      totalStudents,
      attendanceRate: overallRate,
    },
    classes,
  }
}

// ─── Class Attendance Detail (Admin/Teacher) ─────────────────────────

export async function getClassAttendance(
  schoolId: string,
  className: string,
  section: string,
  dateStr: string
): Promise<{ summary: AttendanceSummaryStats; students: StudentAttendanceRecord[] }> {
  const date = new Date(dateStr + "T00:00:00.000Z")

  // Get active students in this class
  const students = await prisma.student.findMany({
    where: { school_id: schoolId, class: className, section, status: "ACTIVE" },
    select: {
      id: true,
      roll_no: true,
      user: { select: { name: true, profile_picture: true } },
    },
    orderBy: { roll_no: "asc" },
  })

  // Get attendance records for these students on this date
  const attendanceRecords = await prisma.attendance.findMany({
    where: {
      school_id: schoolId,
      date,
      student_id: { in: students.map((s) => s.id) },
    },
    select: {
      student_id: true,
      status: true,
      submitted_at: true,
      submittedBy: { select: { name: true } },
      last_edited_at: true,
      lastEditedBy: { select: { name: true } },
    },
  })

  const attendanceMap = new Map(attendanceRecords.map((r) => [r.student_id, r]))

  let totalPresent = 0
  let totalAbsent = 0
  let totalLate = 0

  const studentRecords: StudentAttendanceRecord[] = students.map((s) => {
    const att = attendanceMap.get(s.id)
    const status = (att?.status as AttendanceStatus) ?? null

    if (status === "PRESENT") totalPresent++
    else if (status === "ABSENT") totalAbsent++
    else if (status === "LATE") totalLate++

    return {
      studentId: s.id,
      name: s.user.name,
      rollNo: s.roll_no,
      profilePicture: s.user.profile_picture,
      status,
      lastEditedAt: (att?.last_edited_at ?? att?.submitted_at)?.toISOString() ?? null,
      lastEditedBy: att?.lastEditedBy?.name ?? att?.submittedBy?.name ?? null,
    }
  })

  const totalStudents = students.length
  const attended = totalPresent + totalLate
  const rate = totalStudents > 0 ? Math.round((attended / totalStudents) * 100 * 10) / 10 : 0

  return {
    summary: { totalPresent, totalAbsent, totalLate, totalStudents, attendanceRate: rate },
    students: studentRecords,
  }
}

// ─── Teacher's Class Attendance ──────────────────────────────────────

export async function getTeacherClassAttendance(
  teacherUserId: string,
  dateStr: string
): Promise<
  | { assigned: false }
  | { assigned: true; class: string; section: string; schoolId: string; summary: AttendanceSummaryStats; students: StudentAttendanceRecord[]; isSubmitted: boolean }
> {
  const teacher = await prisma.teacher.findFirst({
    where: { user_id: teacherUserId },
    select: {
      id: true,
      school_id: true,
      classTeacher: { select: { class: true, section: true } },
    },
  })

  if (!teacher) return { assigned: false }

  let className: string
  let section: string

  if (teacher.classTeacher) {
    className = teacher.classTeacher.class
    section   = teacher.classTeacher.section
  } else {
    // Fall back to temporary attendance access for this date
    const access = await getActiveAccessForTeacherAndDate(teacher.id, dateStr)
    if (!access) return { assigned: false }
    className = access.class
    section   = access.section
  }

  const result = await getClassAttendance(teacher.school_id, className, section, dateStr)

  // Check if attendance has been submitted for this date
  const date = new Date(dateStr + "T00:00:00.000Z")
  const existingCount = await prisma.attendance.count({
    where: { school_id: teacher.school_id, date, student: { class: className, section } },
  })

  return {
    assigned: true,
    class: className,
    section,
    schoolId: teacher.school_id,
    ...result,
    isSubmitted: existingCount > 0,
  }
}

// ─── Student's Own Attendance Stats ──────────────────────────────────

export async function getStudentAttendanceStats(
  studentUserId: string
): Promise<StudentAttendanceStats | null> {
  const student = await prisma.student.findFirst({
    where: { user_id: studentUserId, status: "ACTIVE" },
    select: {
      id: true,
      school_id: true,
      school: { select: { session_started_on: true } },
    },
  })
  if (!student) return null

  const sessionStart = student.school.session_started_on
  const today = getNowIST()
  today.setUTCHours(0, 0, 0, 0)

  // Fetch school holidays to calculate accurate working days
  let totalWorkingDays = 0
  if (sessionStart) {
    const { holidays, workingWeekends } = await getSchoolHolidaysInRange(
      student.school_id,
      sessionStart,
      today
    )
    totalWorkingDays = countWorkingDays(sessionStart, today, holidays, workingWeekends)
  }

  // Count attendance by status
  const counts = await prisma.attendance.groupBy({
    by: ["status"],
    where: {
      student_id: student.id,
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
  const rate = totalWorkingDays > 0
    ? Math.round((attended / totalWorkingDays) * 100 * 10) / 10
    : 0

  return {
    sessionStartedOn: sessionStart?.toISOString().split("T")[0] ?? null,
    totalWorkingDays,
    presentDays,
    absentDays,
    lateDays,
    attendanceRate: rate,
  }
}

// ─── Student Monthly Attendance (Calendar View) ──────────────────────

export async function getStudentMonthlyAttendance(
  studentUserId: string,
  year: number,
  month: number
): Promise<{ date: string; status: string }[]> {
  const student = await prisma.student.findFirst({
    where: { user_id: studentUserId, status: "ACTIVE" },
    select: { id: true },
  })
  if (!student) return []

  const startDate = new Date(Date.UTC(year, month - 1, 1))
  const endDate = new Date(Date.UTC(year, month, 0)) // last day of month

  const records = await prisma.attendance.findMany({
    where: {
      student_id: student.id,
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

// ─── Class Student Stats (Teacher History) ───────────────────────────

export async function getClassStudentStats(
  schoolId: string,
  className: string,
  section: string
): Promise<{ sessionStartedOn: string | null; stats: ClassStudentStat[] }> {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { session_started_on: true },
  })

  const sessionStart = school?.session_started_on ?? null
  const today = getNowIST()
  today.setUTCHours(0, 0, 0, 0)

  // Fetch school holidays to calculate accurate working days
  let totalWorkingDays = 0
  if (sessionStart) {
    const { holidays, workingWeekends } = await getSchoolHolidaysInRange(schoolId, sessionStart, today)
    totalWorkingDays = countWorkingDays(sessionStart, today, holidays, workingWeekends)
  }

  // Get all active students in the class
  const students = await prisma.student.findMany({
    where: { school_id: schoolId, class: className, section, status: "ACTIVE" },
    select: {
      id: true,
      roll_no: true,
      user: { select: { name: true, profile_picture: true } },
    },
    orderBy: { roll_no: "asc" },
  })

  if (students.length === 0) {
    return { sessionStartedOn: sessionStart?.toISOString().split("T")[0] ?? null, stats: [] }
  }

  // Get aggregated attendance counts per student
  const counts = await prisma.attendance.groupBy({
    by: ["student_id", "status"],
    where: {
      school_id: schoolId,
      student_id: { in: students.map((s) => s.id) },
      ...(sessionStart ? { date: { gte: sessionStart } } : {}),
    },
    _count: { status: true },
  })

  // Build per-student count map
  const countMap = new Map<string, { present: number; absent: number; late: number }>()
  for (const c of counts) {
    if (!countMap.has(c.student_id)) {
      countMap.set(c.student_id, { present: 0, absent: 0, late: 0 })
    }
    const entry = countMap.get(c.student_id)!
    if (c.status === "PRESENT") entry.present = c._count.status
    else if (c.status === "ABSENT") entry.absent = c._count.status
    else if (c.status === "LATE") entry.late = c._count.status
  }

  const stats: ClassStudentStat[] = students.map((s) => {
    const c = countMap.get(s.id) ?? { present: 0, absent: 0, late: 0 }
    const attended = c.present + c.late
    const rate = totalWorkingDays > 0
      ? Math.round((attended / totalWorkingDays) * 100 * 10) / 10
      : 0

    return {
      studentId: s.id,
      name: s.user.name,
      rollNo: s.roll_no,
      profilePicture: s.user.profile_picture,
      totalPresent: c.present,
      totalAbsent: c.absent,
      totalLate: c.late,
      attendanceRate: rate,
    }
  })

  return {
    sessionStartedOn: sessionStart?.toISOString().split("T")[0] ?? null,
    stats,
  }
}

// ─── Get Admin School ID (reusable helper) ───────────────────────────

export async function getAdminSchoolId(userId: string): Promise<string | null> {
  const schoolUser = await prisma.schoolUser.findFirst({
    where: { user_id: userId, role: "ADMIN", status: "ACTIVE" },
    select: { school_id: true },
  })
  return schoolUser?.school_id ?? null
}

// ─── Get Student's School ID ─────────────────────────────────────────

export async function getStudentSchoolId(userId: string): Promise<string | null> {
  const student = await prisma.student.findFirst({
    where: { user_id: userId, status: "ACTIVE" },
    select: { school_id: true },
  })
  return student?.school_id ?? null
}

// ─── Get distinct class-sections for a school ────────────────────────

export async function getSchoolClassSections(schoolId: string): Promise<{ class: string; section: string }[]> {
  const students = await prisma.student.findMany({
    where: { school_id: schoolId, status: "ACTIVE" },
    select: { class: true, section: true },
    distinct: ["class", "section"],
    orderBy: [{ class: "asc" }, { section: "asc" }],
  })
  return students
}

// ─── Admin Edit Single Student Attendance ────────────────────────────

export async function adminEditAttendance(
  schoolId: string,
  adminUserId: string,
  studentId: string,
  dateStr: string,
  status: AttendanceStatus
) {
  const attendanceDate = new Date(dateStr + "T00:00:00.000Z")
  const todayStr = getTodayISTString()

  if (dateStr > todayStr) throw new Error("FUTURE_DATE")

  // Check if the date is a school holiday
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

  // Verify student belongs to admin's school and is active
  const student = await prisma.student.findFirst({
    where: { id: studentId, school_id: schoolId, status: "ACTIVE" },
    select: { id: true },
  })
  if (!student) throw new Error("INVALID_STUDENTS")

  // Upsert single attendance record
  await prisma.attendance.upsert({
    where: {
      school_id_student_id_date: {
        school_id: schoolId,
        student_id: studentId,
        date: attendanceDate,
      },
    },
    create: {
      school_id: schoolId,
      student_id: studentId,
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
