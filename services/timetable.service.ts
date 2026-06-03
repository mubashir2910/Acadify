import { prisma } from "@/lib/prisma"
import { getAdminSchoolId } from "@/services/attendance.service"
import { ensureTeacherForUser } from "@/services/teacher.service"
import type {
  PeriodRow,
  TimetableCell,
  TimetableGrid,
  TimetableGridTeacherRow,
  StudentPeriodCell,
  StudentTimetableDay,
  TeacherTodayPeriod,
  TeacherRoutineEntry,
  CreatePeriodInput,
  UpdatePeriodInput,
  ReorderPeriodsInput,
  AssignTimetableInput,
  UpdateTimetableInput,
  DayOfWeek,
  BatchChange,
  OverlapWarning,
  BatchSaveResult,
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
  group_id: string | null
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
    group_id: t.group_id ?? "",
    period_id: t.period_id,
    day_of_week: t.day_of_week as DayOfWeek,
    teacher_id: t.teacher_id,
    teacher_name: t.teacher.user.name,
    subject: t.subject,
    class: t.class,
    section: t.section,
  }
}

/** Verify a group belongs to the admin's school. Throws GROUP_NOT_FOUND otherwise. */
async function assertGroupOwnership(schoolId: string, groupId: string) {
  const group = await prisma.timetableGroup.findFirst({
    where: { id: groupId, school_id: schoolId },
    select: { id: true, name: true },
  })
  if (!group) throw new Error("GROUP_NOT_FOUND")
  return group
}

// ─── Period Management (group-scoped) ─────────────────────────────────────────

export async function getPeriodsForGroup(
  schoolId: string,
  groupId: string,
): Promise<PeriodRow[]> {
  await assertGroupOwnership(schoolId, groupId)
  const periods = await prisma.period.findMany({
    where: { group_id: groupId },
    orderBy: { order: "asc" },
  })
  return periods.map(shapePeriod)
}

export async function createPeriod(
  schoolId: string,
  input: CreatePeriodInput,
): Promise<PeriodRow> {
  await assertGroupOwnership(schoolId, input.group_id)
  const created = await prisma.period.create({
    data: {
      school_id: schoolId,
      group_id: input.group_id,
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
  input: UpdatePeriodInput,
): Promise<PeriodRow> {
  const existing = await prisma.period.findFirst({
    where: { id: periodId, school_id: schoolId },
  })
  if (!existing) throw new Error("PERIOD_NOT_FOUND")

  // Switching a busy period to a break is destructive — block it.
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
  input: ReorderPeriodsInput,
): Promise<void> {
  await assertGroupOwnership(schoolId, input.group_id)

  const ids = input.periods.map((p) => p.id)
  const count = await prisma.period.count({
    where: { id: { in: ids }, school_id: schoolId, group_id: input.group_id },
  })
  if (count !== ids.length) throw new Error("PERIOD_NOT_FOUND")

  // Two-pass: temp negative orders first to dodge any (group_id, order) clashes.
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

// ─── Conflict Detection ──────────────────────────────────────────────────────

interface ConflictCheckInput {
  group_id: string
  period_id: string
  day_of_week: DayOfWeek
  teacher_id: string
  class: string
  section: string
}

async function checkConflicts(
  schoolId: string,
  input: ConflictCheckInput,
  excludeId?: string,
  txClient: typeof prisma | Parameters<Parameters<typeof prisma.$transaction>[0]>[0] = prisma,
): Promise<void> {
  const tx = txClient as typeof prisma

  const period = await tx.period.findFirst({
    where: { id: input.period_id, group_id: input.group_id },
  })
  if (!period) throw new Error("PERIOD_NOT_FOUND")
  if (period.is_break) throw new Error("BREAK_PERIOD_NOT_ASSIGNABLE")

  const teacherExists = await tx.teacher.findFirst({
    where: { id: input.teacher_id, school_id: schoolId, status: "ACTIVE" },
  })
  if (!teacherExists) throw new Error("TEACHER_NOT_FOUND")

  // The class must belong to this group.
  const classLink = await tx.timetableGroupClass.findUnique({
    where: {
      school_id_class_section: {
        school_id: schoolId,
        class: input.class,
        section: input.section,
      },
    },
  })
  if (!classLink || classLink.group_id !== input.group_id) {
    throw new Error("CLASS_NOT_IN_GROUP")
  }

  // Teacher double-booked in this slot.
  const teacherConflict = await tx.timetable.findFirst({
    where: {
      school_id: schoolId,
      period_id: input.period_id,
      day_of_week: input.day_of_week,
      teacher_id: input.teacher_id,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
  })
  if (teacherConflict) throw new Error("TEACHER_CONFLICT")

  // Class already has a different teacher in this slot.
  const classConflict = await tx.timetable.findFirst({
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

function timesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd
}

/**
 * Detects wall-clock overlaps for a teacher across OTHER groups. Returns warnings
 * (does not throw) — the calling UI surfaces them but allows the save to proceed.
 */
export async function detectWallClockOverlap(
  schoolId: string,
  params: {
    teacher_id: string
    day_of_week: DayOfWeek
    start_time: string
    end_time: string
    exclude_group_id: string
  },
): Promise<OverlapWarning[]> {
  const otherEntries = await prisma.timetable.findMany({
    where: {
      school_id: schoolId,
      teacher_id: params.teacher_id,
      day_of_week: params.day_of_week,
      NOT: { group_id: params.exclude_group_id },
    },
    include: {
      period: { select: { label: true, start_time: true, end_time: true } },
      group: { select: { name: true } },
      teacher: { select: { user: { select: { name: true } } } },
    },
  })

  return otherEntries
    .filter((e) =>
      e.period
        ? timesOverlap(params.start_time, params.end_time, e.period.start_time, e.period.end_time)
        : false,
    )
    .map((e) => ({
      teacher_id: params.teacher_id,
      teacher_name: e.teacher.user.name,
      day_of_week: params.day_of_week,
      existing_group_name: e.group?.name ?? "Unknown",
      existing_period_label: e.period.label,
      existing_start_time: e.period.start_time,
      existing_end_time: e.period.end_time,
      conflicting_start_time: params.start_time,
      conflicting_end_time: params.end_time,
    }))
}

// ─── Assignee resolution ─────────────────────────────────────────────────────

async function resolveAssigneeTeacherId(
  schoolId: string,
  input: { teacher_id?: string; admin_user_id?: string },
): Promise<string> {
  if (input.teacher_id) return input.teacher_id
  if (input.admin_user_id) {
    const { teacherId } = await ensureTeacherForUser(schoolId, input.admin_user_id)
    return teacherId
  }
  throw new Error("ASSIGNEE_REQUIRED")
}

// ─── Batch Save (the new primary write path) ─────────────────────────────────

export async function batchSaveTimetable(
  schoolId: string,
  groupId: string,
  changes: BatchChange[],
): Promise<BatchSaveResult> {
  await assertGroupOwnership(schoolId, groupId)

  // Pre-resolve assignees outside the transaction so ensureTeacherForUser's
  // own write doesn't tie up the txn (and it's idempotent anyway).
  const resolvedCreates: Map<number, string> = new Map()
  const resolvedUpdates: Map<number, string> = new Map()
  for (let i = 0; i < changes.length; i++) {
    const c = changes[i]
    if (c.action === "CREATE") {
      resolvedCreates.set(
        i,
        await resolveAssigneeTeacherId(schoolId, {
          teacher_id: c.input.teacher_id,
          admin_user_id: c.input.admin_user_id,
        }),
      )
    } else if (c.action === "UPDATE") {
      if (c.input.teacher_id !== undefined || c.input.admin_user_id !== undefined) {
        resolvedUpdates.set(
          i,
          await resolveAssigneeTeacherId(schoolId, {
            teacher_id: c.input.teacher_id,
            admin_user_id: c.input.admin_user_id,
          }),
        )
      }
    }
  }

  // Collect warnings before the transaction; they're advisory only.
  const warnings: OverlapWarning[] = []

  const committed = await prisma.$transaction(async (tx) => {
    let count = 0
    for (let i = 0; i < changes.length; i++) {
      const c = changes[i]
      if (c.action === "CREATE") {
        const teacherId = resolvedCreates.get(i)!
        const period = await tx.period.findFirst({
          where: { id: c.input.period_id, group_id: groupId },
          select: { start_time: true, end_time: true },
        })
        if (!period) throw new Error("PERIOD_NOT_FOUND")

        await checkConflicts(
          schoolId,
          {
            group_id: groupId,
            period_id: c.input.period_id,
            day_of_week: c.input.day_of_week,
            teacher_id: teacherId,
            class: c.input.class,
            section: c.input.section,
          },
          undefined,
          tx,
        )

        await tx.timetable.create({
          data: {
            school_id: schoolId,
            group_id: groupId,
            period_id: c.input.period_id,
            day_of_week: c.input.day_of_week,
            teacher_id: teacherId,
            subject: c.input.subject,
            class: c.input.class,
            section: c.input.section,
          },
        })

        // Cross-group overlap (warning).
        const warns = await detectWallClockOverlap(schoolId, {
          teacher_id: teacherId,
          day_of_week: c.input.day_of_week,
          start_time: period.start_time,
          end_time: period.end_time,
          exclude_group_id: groupId,
        })
        warnings.push(...warns)

        count++
      } else if (c.action === "UPDATE") {
        const existing = await tx.timetable.findFirst({
          where: { id: c.id, school_id: schoolId, group_id: groupId },
        })
        if (!existing) throw new Error("ENTRY_NOT_FOUND")

        const nextTeacherId =
          resolvedUpdates.get(i) ?? existing.teacher_id
        const nextPeriodId = c.input.period_id ?? existing.period_id
        const nextDay = (c.input.day_of_week ?? existing.day_of_week) as DayOfWeek
        const nextClass = c.input.class ?? existing.class
        const nextSection = c.input.section ?? existing.section

        const period = await tx.period.findFirst({
          where: { id: nextPeriodId, group_id: groupId },
          select: { start_time: true, end_time: true },
        })
        if (!period) throw new Error("PERIOD_NOT_FOUND")

        await checkConflicts(
          schoolId,
          {
            group_id: groupId,
            period_id: nextPeriodId,
            day_of_week: nextDay,
            teacher_id: nextTeacherId,
            class: nextClass,
            section: nextSection,
          },
          c.id,
          tx,
        )

        await tx.timetable.update({
          where: { id: c.id },
          data: {
            ...(c.input.period_id !== undefined && { period_id: nextPeriodId }),
            ...(c.input.day_of_week !== undefined && { day_of_week: nextDay }),
            ...(nextTeacherId !== existing.teacher_id && { teacher_id: nextTeacherId }),
            ...(c.input.subject !== undefined && { subject: c.input.subject }),
            ...(c.input.class !== undefined && { class: nextClass }),
            ...(c.input.section !== undefined && { section: nextSection }),
          },
        })

        const warns = await detectWallClockOverlap(schoolId, {
          teacher_id: nextTeacherId,
          day_of_week: nextDay,
          start_time: period.start_time,
          end_time: period.end_time,
          exclude_group_id: groupId,
        })
        warnings.push(...warns)

        count++
      } else {
        // DELETE
        const existing = await tx.timetable.findFirst({
          where: { id: c.id, school_id: schoolId, group_id: groupId },
        })
        if (!existing) throw new Error("ENTRY_NOT_FOUND")
        await tx.timetable.delete({ where: { id: c.id } })
        count++
      }
    }
    return count
  })

  return { committed, warnings }
}

// ─── Grid Queries ─────────────────────────────────────────────────────────────

export async function getTimetableGrid(
  schoolId: string,
  groupId: string,
): Promise<TimetableGrid> {
  const group = await assertGroupOwnership(schoolId, groupId)

  const [periods, teachers, entries] = await Promise.all([
    prisma.period.findMany({
      where: { group_id: groupId },
      orderBy: { order: "asc" },
    }),
    prisma.teacher.findMany({
      where: { school_id: schoolId, status: "ACTIVE" },
      select: { id: true, user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.timetable.findMany({
      where: { group_id: groupId },
      include: { teacher: { include: { user: { select: { name: true } } } } },
      orderBy: [{ day_of_week: "asc" }, { period: { order: "asc" } }],
    }),
  ])

  const teacherMap = new Map<string, TimetableGridTeacherRow>()
  for (const t of teachers) {
    teacherMap.set(t.id, {
      teacher_id: t.id,
      teacher_name: t.user.name,
      cells: {},
    })
  }

  for (const entry of entries) {
    let row = teacherMap.get(entry.teacher_id)
    if (!row) {
      // Materialize a row for a teacher who has entries but didn't appear in the
      // ACTIVE teacher list (e.g., status changed). Keeps the grid accurate.
      row = {
        teacher_id: entry.teacher_id,
        teacher_name: entry.teacher.user.name,
        cells: {},
      }
      teacherMap.set(entry.teacher_id, row)
    }
    const key = `${entry.period_id}__${entry.day_of_week}`
    ;(row.cells as Record<string, TimetableCell | null>)[key] = shapeCell(entry)
  }

  return {
    group_id: group.id,
    group_name: group.name,
    periods: periods.map(shapePeriod),
    rows: Array.from(teacherMap.values()),
  }
}

// ─── Teacher / Student Routine Queries ───────────────────────────────────────

export async function getTeacherTimetable(
  teacherUserId: string,
): Promise<{ entries: TeacherRoutineEntry[] }> {
  const teacher = await prisma.teacher.findFirst({
    where: { user_id: teacherUserId, status: "ACTIVE" },
    select: { id: true, school_id: true },
  })
  if (!teacher) return { entries: [] }

  const entries = await prisma.timetable.findMany({
    where: { teacher_id: teacher.id },
    include: {
      teacher: { include: { user: { select: { name: true } } } },
      period: { select: { label: true, start_time: true, end_time: true, order: true } },
      group: { select: { name: true } },
    },
  })

  return {
    entries: entries.map((e) => ({
      ...shapeCell(e),
      group_name: e.group?.name ?? "Default",
      period_label: e.period.label,
      period_start_time: e.period.start_time,
      period_end_time: e.period.end_time,
      period_order: e.period.order,
    })),
  }
}

export async function getStudentTimetable(
  studentUserId: string,
): Promise<StudentTimetableDay[]> {
  const student = await prisma.student.findFirst({
    where: { user_id: studentUserId, status: "ACTIVE" },
    select: { school_id: true, class: true, section: true },
  })
  if (!student) return []

  // Resolve the student's group via their class+section.
  const link = await prisma.timetableGroupClass.findUnique({
    where: {
      school_id_class_section: {
        school_id: student.school_id,
        class: student.class,
        section: student.section,
      },
    },
    select: { group_id: true },
  })
  if (!link) return []

  const [periods, entries] = await Promise.all([
    prisma.period.findMany({
      where: { group_id: link.group_id },
      orderBy: { order: "asc" },
    }),
    prisma.timetable.findMany({
      where: {
        group_id: link.group_id,
        class: student.class,
        section: student.section,
      },
      include: { teacher: { include: { user: { select: { name: true } } } } },
    }),
  ])

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

export async function getStudentTodaySchedule(
  studentUserId: string,
): Promise<StudentPeriodCell[]> {
  const student = await prisma.student.findFirst({
    where: { user_id: studentUserId, status: "ACTIVE" },
    select: { school_id: true, class: true, section: true },
  })
  if (!student) return []

  const link = await prisma.timetableGroupClass.findUnique({
    where: {
      school_id_class_section: {
        school_id: student.school_id,
        class: student.class,
        section: student.section,
      },
    },
    select: { group_id: true },
  })
  if (!link) return []

  const today = getTodayDayOfWeek()
  const [periods, entries] = await Promise.all([
    prisma.period.findMany({
      where: { group_id: link.group_id },
      orderBy: { order: "asc" },
    }),
    prisma.timetable.findMany({
      where: {
        group_id: link.group_id,
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

export async function getTeacherTodaySchedule(
  teacherUserId: string,
): Promise<TeacherTodayPeriod[]> {
  const teacher = await prisma.teacher.findFirst({
    where: { user_id: teacherUserId, status: "ACTIVE" },
    select: { id: true, school_id: true },
  })
  if (!teacher) return []

  const today = getTodayDayOfWeek()

  // Multi-group: fetch all entries for the day, join period for time + ordering.
  const entries = await prisma.timetable.findMany({
    where: { teacher_id: teacher.id, day_of_week: today },
    include: {
      period: { select: { label: true, start_time: true, end_time: true, is_break: true } },
      group: { select: { name: true } },
    },
  })

  // Sort entries by wall-clock start time across groups.
  const sorted = [...entries].sort((a, b) =>
    a.period.start_time.localeCompare(b.period.start_time),
  )

  return sorted.map((e) => ({
    label: e.period.label,
    startTime: e.period.start_time,
    endTime: e.period.end_time,
    isBreak: e.period.is_break,
    subject: e.subject,
    class: e.class,
    section: e.section,
    groupName: e.group?.name ?? null,
  }))
}
