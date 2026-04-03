import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

// Convert optional date string to Date or null for Prisma
function toDate(val?: string | null): Date | null | undefined {
  if (val === undefined) return undefined
  if (!val) return null
  return new Date(val)
}

// Handle Prisma unique constraint violation (P2002) with a readable error
function throwIfUniqueViolation(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    const target = (error.meta?.target as string[]) ?? []
    if (target.includes("aadhaar_number")) {
      throw new Error("This Aadhaar number is already registered. Please check the number. If it is correct, contact your teacher.")
    }
    if (target.includes("email")) {
      throw new Error("This email address is already registered to another account")
    }
    throw new Error("A unique constraint was violated")
  }
  throw error
}

// ─── GET student profile ────────────────────────────────────────────────────

export async function getStudentProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      phone: true,
      date_of_birth: true,
      blood_group: true,
      aadhaar_number: true,
      address: true,
      profile_picture: true,
      is_profile_complete: true,
      students: {
        select: {
          school_id: true,
          admission_no: true,
          class: true,
          section: true,
          roll_no: true,
          stream: true,
          guardian_name: true,
          guardian_phone: true,
          house_name: true,
          father_name: true,
          mother_name: true,
          school: { select: { schoolName: true, schoolCode: true } },
        },
      },
    },
  })
}

// ─── GET teacher profile ────────────────────────────────────────────────────

export async function getTeacherProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      phone: true,
      date_of_birth: true,
      blood_group: true,
      aadhaar_number: true,
      profile_picture: true,
      is_profile_complete: true,
      teachers: {
        select: {
          employee_id: true,
          joining_date: true,
          school: { select: { schoolName: true, schoolCode: true } },
          classTeacher: { select: { class: true, section: true } },
        },
      },
    },
  })
}

// ─── UPDATE student profile (editable fields only) ──────────────────────────

export async function updateStudentProfile(
  userId: string,
  data: {
    house_name?: string | null
    date_of_birth?: string | null
    blood_group?: string | null
    aadhaar_number?: string
    address?: string
    profile_picture?: string | null
    father_name?: string
    mother_name?: string
  }
) {
  const { house_name, father_name, mother_name, date_of_birth, ...rest } = data

  try {
    // Update User-level fields
    await prisma.user.update({
      where: { id: userId },
      data: {
        ...rest,
        date_of_birth: toDate(date_of_birth),
      },
    })

    // Update Student-level fields
    const studentFields: Record<string, unknown> = {}
    if (house_name !== undefined) studentFields.house_name = house_name
    if (father_name !== undefined) studentFields.father_name = father_name
    if (mother_name !== undefined) studentFields.mother_name = mother_name

    if (Object.keys(studentFields).length > 0) {
      await prisma.student.updateMany({
        where: { user_id: userId },
        data: studentFields,
      })
    }
  } catch (error) {
    throwIfUniqueViolation(error)
  }
}

// ─── UPDATE teacher profile ─────────────────────────────────────────────────

export async function updateTeacherProfile(
  userId: string,
  data: {
    aadhaar_number?: string
    date_of_birth?: string | null
    blood_group?: string | null
    profile_picture?: string | null
  }
) {
  const { date_of_birth, ...rest } = data
  try {
    return await prisma.user.update({
      where: { id: userId },
      data: {
        ...rest,
        date_of_birth: toDate(date_of_birth),
      },
    })
  } catch (error) {
    throwIfUniqueViolation(error)
  }
}

// ─── COMPLETE profile (first login) ─────────────────────────────────────────

export async function completeStudentProfile(
  userId: string,
  data: {
    aadhaar_number: string
    address: string
    father_name: string
    mother_name: string
    house_name?: string | null
    blood_group?: string | null
    profile_picture?: string | null
  }
) {
  const { house_name, father_name, mother_name, ...rest } = data

  try {
    return await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          ...rest,
          is_profile_complete: true,
        },
      }),
      prisma.student.updateMany({
        where: { user_id: userId },
        data: { house_name, father_name, mother_name },
      }),
    ])
  } catch (error) {
    throwIfUniqueViolation(error)
  }
}

export async function completeTeacherProfile(
  userId: string,
  data: {
    aadhaar_number: string
    blood_group?: string | null
    date_of_birth?: string | null
    profile_picture?: string | null
  }
) {
  const { date_of_birth, ...rest } = data
  try {
    return await prisma.user.update({
      where: { id: userId },
      data: {
        ...rest,
        date_of_birth: toDate(date_of_birth),
        is_profile_complete: true,
      },
    })
  } catch (error) {
    throwIfUniqueViolation(error)
  }
}

// ─── GET admin profile ─────────────────────────────────────────────────────

export async function getAdminProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      phone: true,
      date_of_birth: true,
      blood_group: true,
      profile_picture: true,
      is_profile_complete: true,
      schoolUsers: {
        where: { role: "ADMIN" },
        select: {
          school: { select: { schoolName: true, schoolCode: true } },
          joined_at: true,
        },
        take: 1,
      },
    },
  })
}

// ─── COMPLETE admin profile (first login) ───────────────────────────────────

export async function completeAdminProfile(
  userId: string,
  data: {
    date_of_birth: string
    phone: string
    email: string
    blood_group?: string | null
    profile_picture?: string | null
  }
) {
  const { date_of_birth, ...rest } = data
  try {
    return await prisma.user.update({
      where: { id: userId },
      data: {
        ...rest,
        date_of_birth: toDate(date_of_birth),
        is_profile_complete: true,
      },
    })
  } catch (error) {
    throwIfUniqueViolation(error)
  }
}

// ─── UPDATE admin profile ───────────────────────────────────────────────────

export async function updateAdminProfile(
  userId: string,
  data: {
    date_of_birth?: string | null
    phone?: string
    email?: string
    blood_group?: string | null
    profile_picture?: string | null
  }
) {
  const { date_of_birth, ...rest } = data
  try {
    return await prisma.user.update({
      where: { id: userId },
      data: {
        ...rest,
        date_of_birth: toDate(date_of_birth),
      },
    })
  } catch (error) {
    throwIfUniqueViolation(error)
  }
}
