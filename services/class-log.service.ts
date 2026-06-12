import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { getNowIST, getTodayISTString } from "@/lib/working-days"
import { isSchoolHoliday } from "@/services/calendar.service"
import type { CreateClassLogInput } from "@/schemas/class-log.schema"
import type { DayOfWeek } from "@prisma/client"

const BACKDATE_DAYS = 3

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDayOfWeekFromDate(dateStr: string): DayOfWeek {
  const days: DayOfWeek[] = [
    "SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY",
  ]
  // Parse date in UTC to avoid timezone shift when reading day-of-week
  const [year, month, day] = dateStr.split("-").map(Number)
  const d = new Date(Date.UTC(year, month - 1, day))
  return days[d.getUTCDay()]
}

function getEarliestAllowedDate(): string {
  const ist = getNowIST()
  // Subtract BACKDATE_DAYS days from IST today
  ist.setUTCDate(ist.getUTCDate() - BACKDATE_DAYS)
  return ist.toISOString().split("T")[0]
}

export async function getAdminSchoolId(userId: string): Promise<string | null> {
  const schoolUser = await prisma.schoolUser.findFirst({
    where: { user_id: userId, role: "ADMIN", status: "ACTIVE" },
    select: { school_id: true },
  })
  return schoolUser?.school_id ?? null
}

// ─── Teacher: get timetable slots with log status for a date ─────────────────

export interface TeacherSlotWithLog {
  timetableId: string
  subject: string
  class: string
  section: string
  periodLabel: string
  startTime: string
  endTime: string
  log: {
    id: string
    topic: string
    description: string | null
    attachmentUrl: string | null
    attachmentType: string | null
  } | null
}

export interface TeacherDashboardResult {
  // Distinguishes "user is not a teacher" from "teacher has no slots that day"
  // so an admin without a Teacher record gets a meaningful message (BUG 3).
  isTeacher: boolean
  // The selected day is a school holiday — logging is disabled (EDGE 3).
  isHoliday: boolean
  // The selected day is within the backdate window AND not a holiday, so the
  // teacher is allowed to create/edit a log for it (EDGE 2 / EDGE 3).
  loggable: boolean
  slots: TeacherSlotWithLog[]
}

export async function getTeacherLogDashboard(
  teacherUserId: string,
  dateStr: string
): Promise<TeacherDashboardResult> {
  const teacher = await prisma.teacher.findFirst({
    where: { user_id: teacherUserId, status: "ACTIVE" },
    select: { id: true, school_id: true },
  })
  if (!teacher) {
    return { isTeacher: false, isHoliday: false, loggable: false, slots: [] }
  }

  const dayOfWeek = getDayOfWeekFromDate(dateStr)
  const targetDate = new Date(`${dateStr}T00:00:00.000Z`)

  // A day is loggable only if it falls inside the backdate window and is not a
  // school holiday — mirrors the write-time guards in createClassLog.
  const holiday = await isSchoolHoliday(teacher.school_id, targetDate)
  const withinWindow = dateStr >= getEarliestAllowedDate() && dateStr <= getTodayISTString()
  const loggable = withinWindow && !holiday

  const slots = await prisma.timetable.findMany({
    where: {
      teacher_id: teacher.id,
      school_id: teacher.school_id,
      day_of_week: dayOfWeek,
    },
    include: {
      period: { select: { label: true, start_time: true, end_time: true, order: true } },
    },
    orderBy: { period: { order: "asc" } },
  })
  if (slots.length === 0) {
    return { isTeacher: true, isHoliday: holiday, loggable, slots: [] }
  }
  const logs = await prisma.classLog.findMany({
    where: {
      timetable_id: { in: slots.map((s) => s.id) },
      date: targetDate,
    },
    select: {
      id: true,
      timetable_id: true,
      topic: true,
      description: true,
      attachment_url: true,
      attachment_type: true,
    },
  })

  const logMap = new Map(logs.map((l) => [l.timetable_id, l]))

  const mappedSlots: TeacherSlotWithLog[] = slots.map((slot) => {
    const log = logMap.get(slot.id) ?? null
    return {
      timetableId: slot.id,
      subject: slot.subject,
      class: slot.class,
      section: slot.section,
      periodLabel: slot.period.label,
      startTime: slot.period.start_time,
      endTime: slot.period.end_time,
      log: log
        ? {
            id: log.id,
            topic: log.topic,
            description: log.description,
            attachmentUrl: log.attachment_url,
            attachmentType: log.attachment_type,
          }
        : null,
    }
  })

  return { isTeacher: true, isHoliday: holiday, loggable, slots: mappedSlots }
}

// ─── Teacher: log history ─────────────────────────────────────────────────────

export interface ClassLogEntry {
  id: string
  date: string
  class: string
  section: string
  subject: string
  periodLabel: string
  topic: string
  description: string | null
  attachmentUrl: string | null
  attachmentType: string | null
  createdAt: string
}

export async function getTeacherLogHistory(
  teacherUserId: string,
  fromDate?: string,
  toDate?: string
): Promise<ClassLogEntry[]> {
  const teacher = await prisma.teacher.findFirst({
    where: { user_id: teacherUserId, status: "ACTIVE" },
    select: { id: true },
  })
  if (!teacher) return []

  const where: Prisma.ClassLogWhereInput = {
    teacher_id: teacher.id,
  }
  if (fromDate || toDate) {
    where.date = {
      ...(fromDate ? { gte: new Date(`${fromDate}T00:00:00.000Z`) } : {}),
      ...(toDate ? { lte: new Date(`${toDate}T00:00:00.000Z`) } : {}),
    }
  }

  const logs = await prisma.classLog.findMany({
    where,
    orderBy: [{ date: "desc" }, { created_at: "asc" }],
    take: 500,
  })

  return logs.map((l) => ({
    id: l.id,
    date: l.date.toISOString().split("T")[0],
    class: l.class,
    section: l.section,
    subject: l.subject,
    periodLabel: l.period_label,
    topic: l.topic,
    description: l.description,
    attachmentUrl: l.attachment_url,
    attachmentType: l.attachment_type,
    createdAt: l.created_at.toISOString(),
  }))
}

// ─── Create / upsert a class log ──────────────────────────────────────────────

export async function createClassLog(
  schoolId: string,
  teacherUserId: string,
  input: CreateClassLogInput
) {
  const teacher = await prisma.teacher.findFirst({
    where: { user_id: teacherUserId, school_id: schoolId, status: "ACTIVE" },
    select: { id: true },
  })
  if (!teacher) throw new Error("TEACHER_NOT_FOUND")

  // Verify the timetable slot belongs to this teacher in this school
  const slot = await prisma.timetable.findFirst({
    where: { id: input.timetableId, teacher_id: teacher.id, school_id: schoolId },
    include: { period: { select: { label: true, start_time: true, end_time: true } } },
  })
  if (!slot) throw new Error("TIMETABLE_NOT_FOUND")

  // Validate date is within backdating window
  const todayStr = getTodayISTString()
  const earliest = getEarliestAllowedDate()
  if (input.date > todayStr) throw new Error("FUTURE_DATE")
  if (input.date < earliest) throw new Error("BACKDATE_LIMIT_EXCEEDED")

  // Validate date day-of-week matches the timetable slot
  const dayOfWeek = getDayOfWeekFromDate(input.date)
  if (dayOfWeek !== slot.day_of_week) throw new Error("DAY_MISMATCH")

  const targetDate = new Date(`${input.date}T00:00:00.000Z`)

  // Block logging on school holidays / non-working days (consistent with the
  // attendance feature, which also gates on isSchoolHoliday).
  if (await isSchoolHoliday(schoolId, targetDate)) throw new Error("SCHOOL_HOLIDAY")

  const log = await prisma.classLog.upsert({
    where: { timetable_id_date: { timetable_id: input.timetableId, date: targetDate } },
    create: {
      school_id: schoolId,
      timetable_id: input.timetableId,
      teacher_id: teacher.id,
      date: targetDate,
      class: slot.class,
      section: slot.section,
      subject: slot.subject,
      period_label: slot.period.label,
      topic: input.topic,
      description: input.description ?? null,
      attachment_url: input.attachmentUrl ?? null,
      attachment_type: input.attachmentType ?? null,
    },
    update: {
      topic: input.topic,
      description: input.description ?? null,
      attachment_url: input.attachmentUrl ?? null,
      attachment_type: input.attachmentType ?? null,
    },
  })

  return {
    id: log.id,
    date: log.date.toISOString().split("T")[0],
    class: log.class,
    section: log.section,
    subject: log.subject,
    periodLabel: log.period_label,
    topic: log.topic,
    description: log.description,
    attachmentUrl: log.attachment_url,
    attachmentType: log.attachment_type,
  }
}

// ─── Student: logs for their class/section ────────────────────────────────────

export interface StudentClassLogEntry {
  id: string
  date: string
  subject: string
  periodLabel: string
  teacherName: string
  topic: string
  description: string | null
  attachmentUrl: string | null
  attachmentType: string | null
}

export async function getStudentClassLogs(
  studentUserId: string,
  fromDate?: string,
  toDate?: string
): Promise<StudentClassLogEntry[]> {
  const student = await prisma.student.findFirst({
    where: { user_id: studentUserId, status: "ACTIVE" },
    select: { school_id: true, class: true, section: true },
  })
  if (!student) return []

  const where: Prisma.ClassLogWhereInput = {
    school_id: student.school_id,
    class: student.class,
    section: student.section,
  }
  if (fromDate || toDate) {
    where.date = {
      ...(fromDate ? { gte: new Date(`${fromDate}T00:00:00.000Z`) } : {}),
      ...(toDate ? { lte: new Date(`${toDate}T00:00:00.000Z`) } : {}),
    }
  }

  const logs = await prisma.classLog.findMany({
    where,
    include: {
      teacher: { include: { user: { select: { name: true } } } },
    },
    orderBy: [{ date: "desc" }, { created_at: "asc" }],
    take: 500,
  })

  return logs.map((l) => ({
    id: l.id,
    date: l.date.toISOString().split("T")[0],
    subject: l.subject,
    periodLabel: l.period_label,
    teacherName: l.teacher.user.name,
    topic: l.topic,
    description: l.description,
    attachmentUrl: l.attachment_url,
    attachmentType: l.attachment_type,
  }))
}

// ─── Admin: all logs with filters ────────────────────────────────────────────

export interface AdminClassLogEntry {
  id: string
  date: string
  class: string
  section: string
  subject: string
  periodLabel: string
  teacherName: string
  topic: string
  description: string | null
  attachmentUrl: string | null
  attachmentType: string | null
}

export async function getAdminClassLogs(
  schoolId: string,
  filters: { class?: string; section?: string; from?: string; to?: string }
): Promise<AdminClassLogEntry[]> {
  const where: Prisma.ClassLogWhereInput = { school_id: schoolId }
  if (filters.class) where.class = filters.class
  if (filters.section) where.section = filters.section
  if (filters.from || filters.to) {
    where.date = {
      ...(filters.from ? { gte: new Date(`${filters.from}T00:00:00.000Z`) } : {}),
      ...(filters.to ? { lte: new Date(`${filters.to}T00:00:00.000Z`) } : {}),
    }
  }

  const logs = await prisma.classLog.findMany({
    where,
    include: {
      teacher: { include: { user: { select: { name: true } } } },
    },
    orderBy: [{ date: "desc" }, { class: "asc" }, { section: "asc" }],
    take: 500,
  })

  return logs.map((l) => ({
    id: l.id,
    date: l.date.toISOString().split("T")[0],
    class: l.class,
    section: l.section,
    subject: l.subject,
    periodLabel: l.period_label,
    teacherName: l.teacher.user.name,
    topic: l.topic,
    description: l.description,
    attachmentUrl: l.attachment_url,
    attachmentType: l.attachment_type,
  }))
}

// ─── Admin: missing logs for a date ──────────────────────────────────────────

export interface MissingLogSlot {
  timetableId: string
  class: string
  section: string
  subject: string
  periodLabel: string
  startTime: string
  endTime: string
  teacherName: string
}

export async function getAdminMissingLogs(
  schoolId: string,
  dateStr: string
): Promise<MissingLogSlot[]> {
  const dayOfWeek = getDayOfWeekFromDate(dateStr)

  // Get all non-break timetable slots for this school on this day
  const slots = await prisma.timetable.findMany({
    where: {
      school_id: schoolId,
      day_of_week: dayOfWeek,
      period: { is_break: false },
    },
    include: {
      period: { select: { label: true, start_time: true, end_time: true, order: true } },
      teacher: { include: { user: { select: { name: true } } } },
    },
    orderBy: [{ class: "asc" }, { section: "asc" }, { period: { order: "asc" } }],
  })
  if (slots.length === 0) return []

  const targetDate = new Date(`${dateStr}T00:00:00.000Z`)
  const existingLogs = await prisma.classLog.findMany({
    where: {
      timetable_id: { in: slots.map((s) => s.id) },
      date: targetDate,
    },
    select: { timetable_id: true },
  })

  const loggedIds = new Set(existingLogs.map((l) => l.timetable_id))

  return slots
    .filter((s) => !loggedIds.has(s.id))
    .map((s) => ({
      timetableId: s.id,
      class: s.class,
      section: s.section,
      subject: s.subject,
      periodLabel: s.period.label,
      startTime: s.period.start_time,
      endTime: s.period.end_time,
      teacherName: s.teacher.user.name,
    }))
}
