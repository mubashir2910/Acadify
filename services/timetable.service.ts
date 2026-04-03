import { prisma } from "@/lib/prisma"
import { getAdminSchoolId } from "@/services/attendance.service"
import type {
  PeriodRow,
  TimetableCell,
  TimetableGrid,
  TimetableGridTeacherRow,
  StudentPeriodCell,
  StudentTimetableDay,
  TeacherTodayPeriod,
  CreatePeriodInput,
  UpdatePeriodInput,
  ReorderPeriodsInput,
  AssignTimetableInput,
  UpdateTimetableInput,
  DayOfWeek,
} from "@/schemas/timetable.schema"
import { ALL_DAYS } from "@/schemas/timetable.schema"

export { getAdminSchoolId }

// ─── Helpers ─────────────────────────────────────────────────────────────────

function shapePeriod(p: {
  id: string
  label: string
  start_time: string
  end_time: string
  is_break: boolean
  order: number
}): PeriodRow {
  return {
    id: p.id,
    label: p.label,
    start_time: p.start_time,
    end_time: p.end_time,
    is_break: p.is_break,
    order: p.order,
  }
}

function shapeCell(t: {
  id: string
  period_id: string
  day_of_week: string
  teacher_id: string
  teacher: { user: { name: string } }
  subject: string
  class: string
  section: string
}): TimetableCell {
  return {
    id: t.id,
    period_id: t.period_id,
    day_of_week: t.day_of_week as DayOfWeek,
    teacher_id: t.teacher_id,
    teacher_name: t.teacher.user.name,
    subject: t.subject,
    class: t.class,
    section: t.section,
  }
}

// ─── Period Management ────────────────────────────────────────────────────────

export async function getPeriodsForSchool(schoolId: string): Promise<PeriodRow[]> {
  const periods = await prisma.period.findMany({
    where: { school_id: schoolId },
    orderBy: { order: "asc" },
  })
  return periods.map(shapePeriod)
}

export async function createPeriod(
  schoolId: string,
  input: CreatePeriodInput
): Promise<PeriodRow> {
  const created = await prisma.period.create({
    data: {
      school_id: schoolId,
      label: input.label,
      start_time: input.start_time,
      end_time: input.end_time,
      is_break: input.is_break,
      order: input.order,
    },
  })
  return shapePeriod(created)
}

export async function updatePeriod(
  schoolId: string,
  periodId: string,
  input: UpdatePeriodInput
): Promise<PeriodRow> {
  // Verify ownership
  const existing = await prisma.period.findFirst({
    where: { id: periodId, school_id: schoolId },
  })
  if (!existing) throw new Error("PERIOD_NOT_FOUND")

  // If switching to is_break=true, check if assignments exist
  if (input.is_break === true && !existing.is_break) {
    const assignmentCount = await prisma.timetable.count({
      where: { period_id: periodId },
    })
    if (assignmentCount > 0) throw new Error("PERIOD_HAS_ASSIGNMENTS")
  }

  const updated = await prisma.period.update({
    where: { id: periodId },
    data: {
      ...(input.label !== undefined && { label: input.label }),
      ...(input.start_time !== undefined && { start_time: input.start_time }),
      ...(input.end_time !== undefined && { end_time: input.end_time }),
      ...(input.is_break !== undefined && { is_break: input.is_break }),
      ...(input.order !== undefined && { order: input.order }),
    },
  })
  return shapePeriod(updated)
}

export async function deletePeriod(schoolId: string, periodId: string): Promise<void> {
  const existing = await prisma.period.findFirst({
    where: { id: periodId, school_id: schoolId },
  })
  if (!existing) throw new Error("PERIOD_NOT_FOUND")

  const assignmentCount = await prisma.timetable.count({
    where: { period_id: periodId },
  })
  if (assignmentCount > 0) throw new Error("PERIOD_HAS_ASSIGNMENTS")

  await prisma.period.delete({ where: { id: periodId } })
}

export async function reorderPeriods(
  schoolId: string,
  input: ReorderPeriodsInput
): Promise<void> {
  // Verify all period ids belong to this school
  const ids = input.periods.map((p) => p.id)
  const count = await prisma.period.count({
    where: { id: { in: ids }, school_id: schoolId },
  })
  if (count !== ids.length) throw new Error("PERIOD_NOT_FOUND")

  // Two-pass: first set to large negative temp values to avoid any collisions,
  // then set to final values
  await prisma.$transaction(async (tx) => {
    for (const p of input.periods) {
      await tx.period.update({
        where: { id: p.id },
        data: { order: -(p.order + 10000) },
      })
    }
    for (const p of input.periods) {
      await tx.period.update({
        where: { id: p.id },
        data: { order: p.order },
      })
    }
  })
}

// ─── Timetable Entry Management ───────────────────────────────────────────────

async function checkConflicts(
  schoolId: string,
  input: AssignTimetableInput,
  excludeId?: string
): Promise<void> {
  const period = await prisma.period.findFirst({
    where: { id: input.period_id, school_id: schoolId },
  })
  if (!period) throw new Error("PERIOD_NOT_FOUND")
  if (period.is_break) throw new Error("BREAK_PERIOD_NOT_ASSIGNABLE")

  const teacherExists = await prisma.teacher.findFirst({
    where: { id: input.teacher_id, school_id: schoolId, status: "ACTIVE" },
  })
  if (!teacherExists) throw new Error("TEACHER_NOT_FOUND")

  // Teacher double-booking check
  const teacherConflict = await prisma.timetable.findFirst({
    where: {
      school_id: schoolId,
      period_id: input.period_id,
      day_of_week: input.day_of_week,
      teacher_id: input.teacher_id,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
  })
  if (teacherConflict) throw new Error("TEACHER_CONFLICT")

  // Class-section conflict check
  const classConflict = await prisma.timetable.findFirst({
    where: {
      school_id: schoolId,
      period_id: input.period_id,
      day_of_week: input.day_of_week,
      class: input.class,
      section: input.section,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
  })
  if (classConflict) throw new Error("CLASS_CONFLICT")
}

export async function assignTimetableEntry(
  schoolId: string,
  input: AssignTimetableInput
): Promise<TimetableCell> {
  await checkConflicts(schoolId, input)

  const entry = await prisma.timetable.create({
    data: {
      school_id: schoolId,
      period_id: input.period_id,
      day_of_week: input.day_of_week,
      teacher_id: input.teacher_id,
      subject: input.subject,
      class: input.class,
      section: input.section,
    },
    include: { teacher: { include: { user: { select: { name: true } } } } },
  })
  return shapeCell(entry)
}

export async function updateTimetableEntry(
  schoolId: string,
  input: UpdateTimetableInput
): Promise<TimetableCell> {
  const existing = await prisma.timetable.findFirst({
    where: { id: input.id, school_id: schoolId },
  })
  if (!existing) throw new Error("ENTRY_NOT_FOUND")

  // Build the full resolved input for conflict checking
  const resolved: AssignTimetableInput = {
    period_id: input.period_id ?? existing.period_id,
    day_of_week: (input.day_of_week ?? existing.day_of_week) as DayOfWeek,
    teacher_id: input.teacher_id ?? existing.teacher_id,
    subject: input.subject ?? existing.subject,
    class: input.class ?? existing.class,
    section: input.section ?? existing.section,
  }
  await checkConflicts(schoolId, resolved, input.id)

  const updated = await prisma.timetable.update({
    where: { id: input.id },
    data: {
      ...(input.period_id !== undefined && { period_id: input.period_id }),
      ...(input.day_of_week !== undefined && { day_of_week: input.day_of_week }),
      ...(input.teacher_id !== undefined && { teacher_id: input.teacher_id }),
      ...(input.subject !== undefined && { subject: input.subject }),
      ...(input.class !== undefined && { class: input.class }),
      ...(input.section !== undefined && { section: input.section }),
    },
    include: { teacher: { include: { user: { select: { name: true } } } } },
  })
  return shapeCell(updated)
}

export async function deleteTimetableEntry(schoolId: string, id: string): Promise<void> {
  const existing = await prisma.timetable.findFirst({
    where: { id, school_id: schoolId },
  })
  if (!existing) throw new Error("ENTRY_NOT_FOUND")
  await prisma.timetable.delete({ where: { id } })
}

// ─── Grid Queries ─────────────────────────────────────────────────────────────

export async function getTimetableGrid(schoolId: string): Promise<TimetableGrid> {
  const [periods, teachers, entries] = await Promise.all([
    prisma.period.findMany({
      where: { school_id: schoolId },
      orderBy: { order: "asc" },
    }),
    // Fetch ALL active teachers so rows appear even before any assignments exist
    prisma.teacher.findMany({
      where: { school_id: schoolId, status: "ACTIVE" },
      select: { id: true, user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.timetable.findMany({
      where: { school_id: schoolId },
      include: { teacher: { include: { user: { select: { name: true } } } } },
      orderBy: [{ day_of_week: "asc" }, { period: { order: "asc" } }],
    }),
  ])

  // Initialize a row for every active teacher with all cells null
  const teacherMap = new Map<string, TimetableGridTeacherRow>()
  for (const teacher of teachers) {
    teacherMap.set(teacher.id, {
      teacher_id: teacher.id,
      teacher_name: teacher.user.name,
      cells: {},
    })
  }

  // Fill in actual assignments using composite key: "period_id__day_of_week"
  for (const entry of entries) {
    const row = teacherMap.get(entry.teacher_id)
    if (row) {
      const key = `${entry.period_id}__${entry.day_of_week}`
      ;(row.cells as Record<string, TimetableCell | null>)[key] = shapeCell(entry)
    }
  }

  const rows = Array.from(teacherMap.values())

  return { periods: periods.map(shapePeriod), rows }
}

export async function getTeacherTimetable(teacherUserId: string): Promise<{
  periods: PeriodRow[]
  entries: TimetableCell[]
}> {
  const teacher = await prisma.teacher.findFirst({
    where: { user_id: teacherUserId, status: "ACTIVE" },
    select: { id: true, school_id: true },
  })
  if (!teacher) return { periods: [], entries: [] }

  const [periods, entries] = await Promise.all([
    prisma.period.findMany({
      where: { school_id: teacher.school_id },
      orderBy: { order: "asc" },
    }),
    prisma.timetable.findMany({
      where: { teacher_id: teacher.id },
      include: { teacher: { include: { user: { select: { name: true } } } } },
      orderBy: { day_of_week: "asc" },
    }),
  ])

  return {
    periods: periods.map(shapePeriod),
    entries: entries.map(shapeCell),
  }
}

export async function getStudentTimetable(studentUserId: string): Promise<StudentTimetableDay[]> {
  const student = await prisma.student.findFirst({
    where: { user_id: studentUserId, status: "ACTIVE" },
    select: { school_id: true, class: true, section: true },
  })
  if (!student) return []

  const [periods, entries] = await Promise.all([
    prisma.period.findMany({
      where: { school_id: student.school_id },
      orderBy: { order: "asc" },
    }),
    prisma.timetable.findMany({
      where: {
        school_id: student.school_id,
        class: student.class,
        section: student.section,
      },
      include: { teacher: { include: { user: { select: { name: true } } } } },
    }),
  ])

  // Build a lookup: day → period_id → entry
  const lookup = new Map<string, Map<string, (typeof entries)[0]>>()
  for (const entry of entries) {
    if (!lookup.has(entry.day_of_week)) {
      lookup.set(entry.day_of_week, new Map())
    }
    lookup.get(entry.day_of_week)!.set(entry.period_id, entry)
  }

  return ALL_DAYS.map((day) => {
    const dayEntries = lookup.get(day) ?? new Map()
    const cells: StudentPeriodCell[] = periods.map((period) => {
      const entry = dayEntries.get(period.id)
      return {
        period_id: period.id,
        label: period.label,
        start_time: period.start_time,
        end_time: period.end_time,
        is_break: period.is_break,
        subject: entry?.subject ?? null,
        teacher_name: entry ? entry.teacher.user.name : null,
      }
    })
    return { day, cells }
  })
}

export async function getSchoolIdForTeacher(teacherUserId: string): Promise<string | null> {
  const teacher = await prisma.teacher.findFirst({
    where: { user_id: teacherUserId, status: "ACTIVE" },
    select: { school_id: true },
  })
  return teacher?.school_id ?? null
}

// ─── Today's Schedule ────────────────────────────────────────────────────────

function getTodayDayOfWeek(): DayOfWeek {
  const days: DayOfWeek[] = [
    "SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY",
  ]
  return days[new Date().getDay()]
}

export async function getStudentTodaySchedule(studentUserId: string): Promise<StudentPeriodCell[]> {
  const student = await prisma.student.findFirst({
    where: { user_id: studentUserId, status: "ACTIVE" },
    select: { school_id: true, class: true, section: true },
  })
  if (!student) return []

  const today = getTodayDayOfWeek()
  const [periods, entries] = await Promise.all([
    prisma.period.findMany({
      where: { school_id: student.school_id },
      orderBy: { order: "asc" },
    }),
    prisma.timetable.findMany({
      where: {
        school_id: student.school_id,
        class: student.class,
        section: student.section,
        day_of_week: today,
      },
      include: { teacher: { include: { user: { select: { name: true } } } } },
    }),
  ])

  const entryMap = new Map(entries.map((e) => [e.period_id, e]))
  return periods.map((p) => {
    const entry = entryMap.get(p.id)
    return {
      period_id: p.id,
      label: p.label,
      start_time: p.start_time,
      end_time: p.end_time,
      is_break: p.is_break,
      subject: entry?.subject ?? null,
      teacher_name: entry ? entry.teacher.user.name : null,
    }
  })
}

export async function getTeacherTodaySchedule(teacherUserId: string): Promise<TeacherTodayPeriod[]> {
  const teacher = await prisma.teacher.findFirst({
    where: { user_id: teacherUserId, status: "ACTIVE" },
    select: { id: true, school_id: true },
  })
  if (!teacher) return []

  const today = getTodayDayOfWeek()
  const [periods, entries] = await Promise.all([
    prisma.period.findMany({
      where: { school_id: teacher.school_id },
      orderBy: { order: "asc" },
    }),
    prisma.timetable.findMany({
      where: { teacher_id: teacher.id, day_of_week: today },
    }),
  ])

  const entryMap = new Map(entries.map((e) => [e.period_id, e]))
  return periods.map((p) => {
    const entry = entryMap.get(p.id)
    return {
      label: p.label,
      startTime: p.start_time,
      endTime: p.end_time,
      isBreak: p.is_break,
      subject: entry?.subject ?? null,
      class: entry?.class ?? null,
      section: entry?.section ?? null,
    }
  })
}
