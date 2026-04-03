import { prisma } from "@/lib/prisma"
import { isWeekend } from "@/lib/working-days"
import type { CalendarDayOverride, DayType } from "@/schemas/calendar.schema"

// ─── Get Overrides for a Month ──────────────────────────────────────

export async function getMonthOverrides(
  schoolId: string,
  year: number,
  month: number
): Promise<CalendarDayOverride[]> {
  const startDate = new Date(Date.UTC(year, month - 1, 1))
  const endDate = new Date(Date.UTC(year, month, 0)) // last day of month

  const entries = await prisma.schoolCalendar.findMany({
    where: {
      school_id: schoolId,
      date: { gte: startDate, lte: endDate },
    },
    select: { date: true, type: true, reason: true },
    orderBy: { date: "asc" },
  })

  return entries.map((e) => ({
    date: e.date.toISOString().split("T")[0],
    type: e.type as CalendarDayOverride["type"],
    reason: e.reason,
  }))
}

// ─── Upsert Day Override ────────────────────────────────────────────

export async function upsertDayOverride(
  schoolId: string,
  userId: string,
  dateStr: string,
  type: DayType,
  reason?: string
) {
  const date = new Date(dateStr + "T00:00:00.000Z")

  // Only reject truly redundant overrides
  const weekend = isWeekend(date)
  if (type === "WORKING_DAY" && !weekend) {
    throw new Error("ALREADY_WORKING_DAY")
  }
  if (type === "HOLIDAY" && weekend) {
    throw new Error("ALREADY_HOLIDAY")
  }
  // HALF_DAY and EVENT are valid on any day

  await prisma.schoolCalendar.upsert({
    where: {
      school_id_date: { school_id: schoolId, date },
    },
    create: {
      school_id: schoolId,
      date,
      type,
      reason: reason || null,
      created_by: userId,
    },
    update: {
      type,
      reason: reason || null,
    },
  })

  return { updated: true }
}

// ─── Remove Day Override ────────────────────────────────────────────

export async function removeDayOverride(schoolId: string, dateStr: string) {
  const date = new Date(dateStr + "T00:00:00.000Z")

  const existing = await prisma.schoolCalendar.findUnique({
    where: {
      school_id_date: { school_id: schoolId, date },
    },
  })

  if (!existing) throw new Error("NOT_FOUND")

  await prisma.schoolCalendar.delete({
    where: { id: existing.id },
  })

  return { deleted: true }
}

// ─── Check if a Date is a Holiday for a School ─────────────────────

export async function isSchoolHoliday(
  schoolId: string,
  date: Date
): Promise<boolean> {
  const override = await prisma.schoolCalendar.findUnique({
    where: {
      school_id_date: { school_id: schoolId, date },
    },
    select: { type: true },
  })

  if (override) {
    // Only HOLIDAY is a full holiday; WORKING_DAY, HALF_DAY, EVENT allow attendance
    return override.type === "HOLIDAY"
  }

  // Default: weekends are holidays
  return isWeekend(date)
}

// ─── Get Holidays and Working Weekends in a Range ───────────────────

export async function getSchoolHolidaysInRange(
  schoolId: string,
  from: Date,
  to: Date
): Promise<{ holidays: Date[]; workingWeekends: Date[] }> {
  try {
    const overrides = await prisma.schoolCalendar.findMany({
      where: {
        school_id: schoolId,
        date: { gte: from, lte: to },
      },
      select: { date: true, type: true },
    })

    const holidays: Date[] = []
    const workingWeekends: Date[] = []

    for (const o of overrides) {
      if (o.type === "HOLIDAY") {
        holidays.push(o.date)
      } else if (o.type === "WORKING_DAY" || o.type === "HALF_DAY") {
        // WORKING_DAY and HALF_DAY on weekends make them working days
        if (isWeekend(o.date)) {
          workingWeekends.push(o.date)
        }
      }
      // EVENT on a weekday doesn't change anything (already a working day)
    }

    return { holidays, workingWeekends }
  } catch (error) {
    // Gracefully handle if SchoolCalendar table doesn't exist yet
    console.error("getSchoolHolidaysInRange error:", error)
    return { holidays: [], workingWeekends: [] }
  }
}

// ─── Get Teacher's School ID ────────────────────────────────────────

export async function getTeacherSchoolId(userId: string): Promise<string | null> {
  const teacher = await prisma.teacher.findFirst({
    where: { user_id: userId },
    select: { school_id: true },
  })
  return teacher?.school_id ?? null
}
