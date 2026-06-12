import { prisma } from "@/lib/prisma"
import { getNowIST } from "@/lib/working-days"
import type {
  BirthdayEntry,
  UpcomingBirthdayEntry,
} from "@/schemas/birthday.schema"

/**
 * Returns the UTC-anchored midnight of "today" in IST.
 * Use .getUTC* methods on the result to read IST date parts.
 */
function getTodayIST(): Date {
  const ist = getNowIST()
  ist.setUTCHours(0, 0, 0, 0)
  return ist
}

const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const

export async function getTodaysBirthdays(
  schoolId: string
): Promise<BirthdayEntry[]> {
  const today = getTodayIST()
  const month = today.getUTCMonth() + 1
  const day = today.getUTCDate()

  const matchesBirthday = (dob: Date | null): boolean => {
    if (!dob) return false
    return dob.getUTCMonth() + 1 === month && dob.getUTCDate() === day
  }

  // Query students in this school with DOB set
  const students = await prisma.student.findMany({
    where: {
      school_id: schoolId,
      status: "ACTIVE",
      user: { is_active: true, date_of_birth: { not: null } },
    },
    select: {
      class: true,
      section: true,
      user: {
        select: {
          id: true,
          name: true,
          profile_picture: true,
          date_of_birth: true,
        },
      },
    },
  })

  // Query teachers in this school with DOB set. Exclude admin-Teacher rows
  // so an admin who teaches isn't listed twice (admins are queried separately).
  const teachers = await prisma.teacher.findMany({
    where: {
      school_id: schoolId,
      status: "ACTIVE",
      user: { is_active: true, role: "TEACHER", date_of_birth: { not: null } },
    },
    select: {
      user: {
        select: {
          id: true,
          name: true,
          profile_picture: true,
          date_of_birth: true,
        },
      },
    },
  })

  // Query admins linked to this school with DOB set
  const admins = await prisma.schoolUser.findMany({
    where: {
      school_id: schoolId,
      role: "ADMIN",
      status: "ACTIVE",
      user: { is_active: true, date_of_birth: { not: null } },
    },
    select: {
      user: {
        select: {
          id: true,
          name: true,
          profile_picture: true,
          date_of_birth: true,
        },
      },
    },
  })

  const results: BirthdayEntry[] = []

  for (const s of students) {
    if (matchesBirthday(s.user.date_of_birth)) {
      results.push({
        id: s.user.id,
        name: s.user.name,
        profile_picture: s.user.profile_picture,
        role: "STUDENT",
        class: s.class,
        section: s.section,
      })
    }
  }

  for (const t of teachers) {
    if (matchesBirthday(t.user.date_of_birth)) {
      results.push({
        id: t.user.id,
        name: t.user.name,
        profile_picture: t.user.profile_picture,
        role: "TEACHER",
        class: null,
        section: null,
      })
    }
  }

  for (const a of admins) {
    if (matchesBirthday(a.user.date_of_birth)) {
      results.push({
        id: a.user.id,
        name: a.user.name,
        profile_picture: a.user.profile_picture,
        role: "ADMIN",
        class: null,
        section: null,
      })
    }
  }

  // Sort: students first, then teachers, then admins; alphabetical within each
  results.sort((a, b) => {
    const order = { STUDENT: 0, TEACHER: 1, ADMIN: 2 }
    const roleDiff = order[a.role] - order[b.role]
    if (roleDiff !== 0) return roleDiff
    return a.name.localeCompare(b.name)
  })

  return results
}

/**
 * Returns birthdays falling between TOMORROW and the upcoming Sunday (inclusive),
 * where "week" runs Monday–Sunday. Today's birthdays are intentionally excluded —
 * they belong to the separate "Today" section so the same person isn't shown twice.
 *
 * Algorithm:
 *  1. Compute today's IST date and the date of Sunday-of-this-week.
 *  2. Build a Set of "MM-DD" keys for every day in [tomorrow, sunday].
 *     The range may span up to 6 days (Mon→Sun) and can cross year/month boundaries.
 *  3. For each user with a date_of_birth, look up their MM-DD in the set.
 *     If matched, record days_until + weekday label using the actual date in range.
 */
export async function getUpcomingWeekBirthdays(
  schoolId: string
): Promise<UpcomingBirthdayEntry[]> {
  const today = getTodayIST()
  // JS getUTCDay(): Sunday = 0, Monday = 1, ... Saturday = 6.
  // Convert to "days until Sunday-of-this-week" where Mon..Sat all map to days remaining,
  // and Sunday itself maps to 0 (no upcoming days left in the week).
  const dayOfWeek = today.getUTCDay() // 0..6
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek

  if (daysUntilSunday === 0) {
    // Today is Sunday — the week ends today, nothing upcoming until next Monday.
    return []
  }

  // Build day records for tomorrow..sunday inclusive.
  type DayInfo = { mmdd: string; date: string; dayLabel: string; daysUntil: number }
  const upcomingDays: DayInfo[] = []
  for (let offset = 1; offset <= daysUntilSunday; offset++) {
    const d = new Date(today.getTime() + offset * 86_400_000)
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0")
    const dd = String(d.getUTCDate()).padStart(2, "0")
    upcomingDays.push({
      mmdd: `${mm}-${dd}`,
      date: `${d.getUTCFullYear()}-${mm}-${dd}`,
      dayLabel: DAY_LABELS[d.getUTCDay()],
      daysUntil: offset,
    })
  }
  const dayInfoByMMDD = new Map(upcomingDays.map((d) => [d.mmdd, d]))

  // Also exclude today explicitly (defensive, even though we already skip offset=0)
  const todayMM = String(today.getUTCMonth() + 1).padStart(2, "0")
  const todayDD = String(today.getUTCDate()).padStart(2, "0")
  const todayKey = `${todayMM}-${todayDD}`

  const pickDayInfo = (dob: Date | null): DayInfo | null => {
    if (!dob) return null
    const mm = String(dob.getUTCMonth() + 1).padStart(2, "0")
    const dd = String(dob.getUTCDate()).padStart(2, "0")
    const key = `${mm}-${dd}`
    if (key === todayKey) return null
    return dayInfoByMMDD.get(key) ?? null
  }

  const [students, teachers, admins] = await Promise.all([
    prisma.student.findMany({
      where: {
        school_id: schoolId,
        status: "ACTIVE",
        user: { is_active: true, date_of_birth: { not: null } },
      },
      select: {
        class: true,
        section: true,
        user: {
          select: {
            id: true,
            name: true,
            profile_picture: true,
            date_of_birth: true,
          },
        },
      },
    }),
    prisma.teacher.findMany({
      where: {
        school_id: schoolId,
        status: "ACTIVE",
        // Exclude admin-Teacher rows; admins are queried separately.
        user: { is_active: true, role: "TEACHER", date_of_birth: { not: null } },
      },
      select: {
        user: {
          select: {
            id: true,
            name: true,
            profile_picture: true,
            date_of_birth: true,
          },
        },
      },
    }),
    prisma.schoolUser.findMany({
      where: {
        school_id: schoolId,
        role: "ADMIN",
        status: "ACTIVE",
        user: { is_active: true, date_of_birth: { not: null } },
      },
      select: {
        user: {
          select: {
            id: true,
            name: true,
            profile_picture: true,
            date_of_birth: true,
          },
        },
      },
    }),
  ])

  const results: UpcomingBirthdayEntry[] = []

  for (const s of students) {
    const info = pickDayInfo(s.user.date_of_birth)
    if (!info) continue
    results.push({
      id: s.user.id,
      name: s.user.name,
      profile_picture: s.user.profile_picture,
      role: "STUDENT",
      class: s.class,
      section: s.section,
      birthday_date: info.date,
      day_label: info.dayLabel,
      days_until: info.daysUntil,
    })
  }

  for (const t of teachers) {
    const info = pickDayInfo(t.user.date_of_birth)
    if (!info) continue
    results.push({
      id: t.user.id,
      name: t.user.name,
      profile_picture: t.user.profile_picture,
      role: "TEACHER",
      class: null,
      section: null,
      birthday_date: info.date,
      day_label: info.dayLabel,
      days_until: info.daysUntil,
    })
  }

  for (const a of admins) {
    const info = pickDayInfo(a.user.date_of_birth)
    if (!info) continue
    results.push({
      id: a.user.id,
      name: a.user.name,
      profile_picture: a.user.profile_picture,
      role: "ADMIN",
      class: null,
      section: null,
      birthday_date: info.date,
      day_label: info.dayLabel,
      days_until: info.daysUntil,
    })
  }

  // Order: soonest first, then students > teachers > admins, then by name.
  const roleOrder = { STUDENT: 0, TEACHER: 1, ADMIN: 2 } as const
  results.sort((a, b) => {
    if (a.days_until !== b.days_until) return a.days_until - b.days_until
    const roleDiff = roleOrder[a.role] - roleOrder[b.role]
    if (roleDiff !== 0) return roleDiff
    return a.name.localeCompare(b.name)
  })

  return results
}
