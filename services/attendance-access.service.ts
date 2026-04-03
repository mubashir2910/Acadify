import { prisma } from "@/lib/prisma"
import { getTodayISTString } from "@/lib/working-days"
import { getAdminSchoolId } from "@/services/class-teacher.service"
import type { GiveAttendanceAccessInput, AttendanceAccessGrant } from "@/schemas/attendance-access.schema"

/**
 * Returns the active AttendanceAccess grant for a teacher on a specific date, or null.
 * Used by the attendance service to allow substitute teachers to mark attendance.
 */
export async function getActiveAccessForTeacherAndDate(
  teacherId: string,
  dateStr: string
): Promise<{ class: string; section: string } | null> {
  const date = new Date(dateStr + "T00:00:00.000Z")
  const access = await prisma.attendanceAccess.findFirst({
    where: {
      teacher_id: teacherId,
      start_date: { lte: date },
      end_date:   { gte: date },
    },
    select: { class: true, section: true },
  })
  return access ?? null
}

/** Returns all attendance access grants for a school with computed status. */
export async function getAttendanceAccessGrants(schoolId: string): Promise<AttendanceAccessGrant[]> {
  const todayStr = getTodayISTString()

  const grants = await prisma.attendanceAccess.findMany({
    where: { school_id: schoolId },
    orderBy: [{ class: "asc" }, { section: "asc" }, { start_date: "desc" }],
    select: {
      id:         true,
      class:      true,
      section:    true,
      start_date: true,
      end_date:   true,
      teacher: {
        select: {
          id:          true,
          employee_id: true,
          user:        { select: { name: true } },
        },
      },
      grantedBy: { select: { name: true } },
    },
  })

  return grants.map((g) => {
    const startDate = g.start_date.toISOString().split("T")[0]
    const endDate   = g.end_date.toISOString().split("T")[0]

    let status: "Active" | "Upcoming" | "Expired"
    if (endDate < todayStr)    status = "Expired"
    else if (startDate > todayStr) status = "Upcoming"
    else                       status = "Active"

    return {
      id: g.id,
      class: g.class,
      section: g.section,
      startDate,
      endDate,
      status,
      teacher: g.teacher,
      grantedBy: g.grantedBy,
    }
  })
}

/**
 * Grants temporary attendance access to a subject teacher for a class + date range.
 * Validates: teacher is active + not a class teacher + class exists + no overlapping grant.
 */
export async function giveAttendanceAccess(
  schoolId: string,
  adminUserId: string,
  input: GiveAttendanceAccessInput
): Promise<void> {
  const { teacherId, class: className, section, startDate, endDate } = input

  // Verify teacher belongs to school and is active
  const teacher = await prisma.teacher.findFirst({
    where: { id: teacherId, school_id: schoolId, status: "ACTIVE" },
    select: { id: true, classTeacher: { select: { id: true } } },
  })
  if (!teacher) throw new Error("TEACHER_NOT_FOUND")

  // Only subject teachers (no ClassTeacher record) can be granted access
  if (teacher.classTeacher) throw new Error("TEACHER_IS_CLASS_TEACHER")

  // Ensure the class-section has at least one active student
  const studentCount = await prisma.student.count({
    where: { school_id: schoolId, class: className, section, status: "ACTIVE" },
  })
  if (studentCount === 0) throw new Error("CLASS_SECTION_NOT_FOUND")

  // Check for overlapping grants for this teacher
  const startDateObj = new Date(startDate + "T00:00:00.000Z")
  const endDateObj   = new Date(endDate   + "T00:00:00.000Z")

  const overlapping = await prisma.attendanceAccess.findFirst({
    where: {
      teacher_id: teacherId,
      start_date: { lte: endDateObj },
      end_date:   { gte: startDateObj },
    },
    select: { id: true },
  })
  if (overlapping) throw new Error("OVERLAPPING_ACCESS")

  await prisma.attendanceAccess.create({
    data: {
      school_id:  schoolId,
      teacher_id: teacherId,
      class:      className,
      section,
      start_date: startDateObj,
      end_date:   endDateObj,
      granted_by: adminUserId,
    },
  })
}

/** Revokes an attendance access grant. Scoped to the admin's school. */
export async function revokeAttendanceAccess(schoolId: string, accessId: string): Promise<void> {
  const existing = await prisma.attendanceAccess.findFirst({
    where: { id: accessId, school_id: schoolId },
    select: { id: true },
  })
  if (!existing) throw new Error("ACCESS_NOT_FOUND")

  await prisma.attendanceAccess.delete({ where: { id: accessId } })
}

export { getAdminSchoolId }
