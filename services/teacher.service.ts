import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { generateTeacherUniqueId } from "@/lib/teacher-id"
import { generateTemporaryPassword } from "@/lib/student-id"
import { generateTeacherCredentialsPdf } from "@/lib/pdf-generator"

export async function getTeachersBySchoolCode(schoolCode: string) {
  return prisma.teacher.findMany({
    where: { school: { schoolCode } },
    select: {
      id: true,
      employee_id: true,
      joining_date: true,
      status: true,
      created_at: true,
      user: { select: { name: true, email: true } },
    },
    orderBy: { created_at: "asc" },
  })
}
import type { ParsedTeacherRow, EnrichedTeacher, ImportSummary } from "@/schemas/teacher.schema"

const BCRYPT_SALT_ROUNDS = 10

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

// ─── IMPORT teachers ─────────────────────────────────────────────────────────

export interface ImportTeachersResult {
  success: boolean
  summary: ImportSummary
  errors: string[]
  pdf?: string // base64 PDF, only present on success
}

export async function importTeachers(
  schoolCode: string,
  rows: ParsedTeacherRow[]
): Promise<ImportTeachersResult> {
  // 1. Verify school exists
  const school = await prisma.school.findUnique({
    where: { schoolCode },
    select: { id: true, schoolName: true },
  })
  if (!school) {
    return {
      success: false,
      summary: { total: rows.length, imported: 0, failed: rows.length },
      errors: ["School not found"],
    }
  }

  // 2. Cross-row duplicate email check (User.email is @unique globally)
  const emails = rows.map((r) => r.email.toLowerCase())
  const duplicateEmails = emails.filter((e, i) => emails.indexOf(e) !== i)
  if (duplicateEmails.length > 0) {
    const errors = rows
      .map((row, i) =>
        duplicateEmails.includes(row.email.toLowerCase())
          ? `Row ${i + 2}: Duplicate email "${row.email}" within file`
          : null
      )
      .filter(Boolean) as string[]
    return {
      success: false,
      summary: { total: rows.length, imported: 0, failed: errors.length },
      errors,
    }
  }

  // 2b. Check emails against DB (User.email is globally unique)
  const existingEmailUsers = await prisma.user.findMany({
    where: { email: { in: rows.map((r) => r.email) } },
    select: { email: true },
  })
  if (existingEmailUsers.length > 0) {
    const takenEmails = new Set(existingEmailUsers.map((u) => u.email!.toLowerCase()))
    const errors = rows
      .map((row, i) =>
        takenEmails.has(row.email.toLowerCase())
          ? `Row ${i + 2}: Email "${row.email}" is already registered`
          : null
      )
      .filter(Boolean) as string[]
    return {
      success: false,
      summary: { total: rows.length, imported: 0, failed: errors.length },
      errors,
    }
  }

  // 3. Find the highest existing sequence number for this school to avoid ID collisions.
  //    Pattern: {schoolCode}T{NNN} — e.g. ABCT001
  const idPattern = new RegExp(`^${escapeRegex(schoolCode)}T(\\d{3})$`)

  const existingTeacherUsers = await prisma.teacher.findMany({
    where: { school_id: school.id },
    select: { employee_id: true },
  })

  let maxSequence = 0
  for (const record of existingTeacherUsers) {
    const match = idPattern.exec(record.employee_id)
    if (match) {
      const seq = parseInt(match[1], 10)
      if (seq > maxSequence) maxSequence = seq
    }
  }

  // 4. Generate credentials for all teachers concurrently (before transaction)
  const enrichedTeachers: EnrichedTeacher[] = await Promise.all(
    rows.map(async (row, index) => {
      const sequence = maxSequence + index + 1
      const teacherUniqueId = generateTeacherUniqueId(schoolCode, sequence)
      const temporaryPassword = generateTemporaryPassword()
      const passwordHash = await bcrypt.hash(temporaryPassword, BCRYPT_SALT_ROUNDS)

      return {
        name: row.name,
        email: row.email,
        phone: row.phone,
        joining_date: row.joining_date,
        date_of_birth: row.date_of_birth,
        blood_group: row.blood_group,
        teacherUniqueId,
        temporaryPassword,
        passwordHash,
      }
    })
  )

  // 4b. Clean up orphaned User records whose usernames match this batch.
  //     Orphans arise when a school is deleted (cascade removes Teacher/SchoolUser but not User).
  const newUsernames = enrichedTeachers.map((t) => t.teacherUniqueId)
  await prisma.user.deleteMany({
    where: {
      username: { in: newUsernames },
      schoolUsers: { none: {} }, // Only delete if no active school membership
    },
  })

  // 5. Bulk insert in a Prisma interactive transaction
  await prisma.$transaction(async (tx) => {
    // 5a. Create all User records
    const createdUsers = await tx.user.createManyAndReturn({
      data: enrichedTeachers.map((t) => ({
        name: t.name,
        username: t.teacherUniqueId, // globally unique login ID
        email: t.email,
        phone: t.phone,
        password_hash: t.passwordHash,
        role: "TEACHER" as const,
        must_reset_password: true,
        is_active: true,
        date_of_birth: t.date_of_birth ?? undefined,
        blood_group: t.blood_group ?? undefined,
      })),
      select: { id: true, username: true },
    })

    // 5b. Map username → user_id for O(1) lookup
    const userIdByUsername = new Map(createdUsers.map((u) => [u.username, u.id]))

    // 5c. Build Teacher and SchoolUser records
    const teachersData = enrichedTeachers.map((t) => ({
      school_id: school.id,
      user_id: userIdByUsername.get(t.teacherUniqueId)!,
      employee_id: t.teacherUniqueId,
      joining_date: t.joining_date,
    }))

    const schoolUsersData = enrichedTeachers.map((t) => ({
      school_id: school.id,
      user_id: userIdByUsername.get(t.teacherUniqueId)!,
      role: "TEACHER" as const,
    }))

    // 5d. Insert teachers and schoolUsers in parallel
    await Promise.all([
      tx.teacher.createMany({ data: teachersData }),
      tx.schoolUser.createMany({ data: schoolUsersData }),
    ])
  })

  // 6. Generate credentials PDF
  const credentialRows = enrichedTeachers.map((t) => ({
    name: t.name,
    teacherUniqueId: t.teacherUniqueId,
    temporaryPassword: t.temporaryPassword,
  }))

  const pdfBase64 = await generateTeacherCredentialsPdf(school.schoolName, credentialRows)

  return {
    success: true,
    summary: { total: rows.length, imported: rows.length, failed: 0 },
    errors: [],
    pdf: pdfBase64,
  }
}
