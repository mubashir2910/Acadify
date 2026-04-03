import { prisma } from "@/lib/prisma"
import type { BirthdayEntry } from "@/schemas/birthday.schema"

export async function getTodaysBirthdays(
  schoolId: string
): Promise<BirthdayEntry[]> {
  const today = new Date()
  const month = today.getMonth() + 1
  const day = today.getDate()

  const matchesBirthday = (dob: Date | null): boolean => {
    if (!dob) return false
    return dob.getMonth() + 1 === month && dob.getDate() === day
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

  // Query teachers in this school with DOB set
  const teachers = await prisma.teacher.findMany({
    where: {
      school_id: schoolId,
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
