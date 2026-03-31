import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { generateStudentUniqueId, generateTemporaryPassword } from "@/lib/student-id"
import { generateCredentialsPdf } from "@/lib/pdf-generator"
import type { CsvStudentRow, EnrichedStudent, ImportSummary, ClassSectionPdf } from "@/schemas/student.schema"

const BCRYPT_SALT_ROUNDS = 10

// Escapes special regex characters — defensive for school codes that could contain dots etc.
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

// ─── GET students for a school ───────────────────────────────────────────────

export async function getStudentsBySchoolCode(schoolCode: string) {
  const school = await prisma.school.findUnique({
    where: { schoolCode },
    select: { id: true },
  })
  if (!school) return null

  return prisma.student.findMany({
    where: { school_id: school.id },
    select: {
      id: true,
      admission_no: true,
      roll_no: true,
      class: true,
      section: true,
      created_at: true,
      user: {
        select: { name: true, email: true, phone: true, username: true },
      },
    },
    orderBy: { created_at: "desc" },
  })
}

// ─── GET students for a school (by school ID, includes profile picture) ──────

export async function getStudentsBySchoolId(schoolId: string) {
  return prisma.student.findMany({
    where: { school_id: schoolId, status: "ACTIVE" },
    select: {
      roll_no: true,
      class: true,
      section: true,
      user: {
        select: {
          username: true,
          name: true,
          phone: true,
          profile_picture: true,
        },
      },
    },
    orderBy: [{ class: "asc" }, { section: "asc" }, { roll_no: "asc" }],
  })
}

// ─── IMPORT students ─────────────────────────────────────────────────────────

export interface ImportStudentsResult {
  success: boolean
  summary: ImportSummary
  errors: string[]
  pdf?: string // combined base64 PDF, only present on success
  classSectionPdfs?: ClassSectionPdf[] // per-class-section PDFs, only present on success
}

export async function importStudents(
  schoolCode: string,
  rows: CsvStudentRow[]
): Promise<ImportStudentsResult> {
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

  // 2. Cross-row duplicate roll_no check within import batch (scoped to class+section)
  const rollKeys = rows.map((r) => `${r.class}|${r.section}|${r.roll_no}`)
  const duplicateKeys = rollKeys.filter((k, i) => rollKeys.indexOf(k) !== i)
  if (duplicateKeys.length > 0) {
    const errors = rows
      .map((row, i) =>
        duplicateKeys.includes(`${row.class}|${row.section}|${row.roll_no}`)
          ? `Row ${i + 2}: Duplicate roll_no "${row.roll_no}" for class "${row.class}" section "${row.section}" within file`
          : null
      )
      .filter(Boolean) as string[]
    return {
      success: false,
      summary: { total: rows.length, imported: 0, failed: errors.length },
      errors,
    }
  }

  // 3. Cross-row duplicate email check (User.email is @unique globally)
  const emails = rows.map((r) => r.email).filter((e): e is string => !!e)
  const duplicateEmails = emails.filter((e, i) => emails.indexOf(e) !== i)
  if (duplicateEmails.length > 0) {
    const errors = rows
      .map((row, i) =>
        row.email && duplicateEmails.includes(row.email)
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

  // 3b. Check emails against DB (User.email is globally unique)
  const incomingEmails = rows.map((r) => r.email).filter((e): e is string => !!e)
  if (incomingEmails.length > 0) {
    const existingEmailUsers = await prisma.user.findMany({
      where: { email: { in: incomingEmails } },
      select: { email: true },
    })
    if (existingEmailUsers.length > 0) {
      const takenEmails = new Set(existingEmailUsers.map((u) => u.email!.toLowerCase()))
      const errors = rows
        .map((row, i) =>
          row.email && takenEmails.has(row.email.toLowerCase())
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
  }

  // 3c. Check admission_no against existing students in this school
  const incomingAdmissionNos = rows.map((r) => r.admission_no).filter((a): a is string => !!a)
  if (incomingAdmissionNos.length > 0) {
    const existingAdmissionNos = await prisma.student.findMany({
      where: { school_id: school.id, admission_no: { in: incomingAdmissionNos } },
      select: { admission_no: true },
    })
    if (existingAdmissionNos.length > 0) {
      const takenNos = new Set(existingAdmissionNos.map((s) => s.admission_no!))
      const errors = rows
        .map((row, i) =>
          row.admission_no && takenNos.has(row.admission_no)
            ? `Row ${i + 2}: Admission number "${row.admission_no}" already exists in this school`
            : null
        )
        .filter(Boolean) as string[]
      return {
        success: false,
        summary: { total: rows.length, imported: 0, failed: errors.length },
        errors,
      }
    }
  }

  // 4. Find the highest existing sequence number for this school to avoid ID collisions.
  //    Using count() is wrong when students have been deleted — it underestimates the high-water mark.
  const idPattern = new RegExp(`^${escapeRegex(schoolCode)}(\\d{4})$`)

  const existingStudentUsers = await prisma.student.findMany({
    where: { school_id: school.id },
    select: { user: { select: { username: true } } },
  })

  let maxSequence = 0
  for (const record of existingStudentUsers) {
    const match = idPattern.exec(record.user.username)
    if (match) {
      const seq = parseInt(match[1], 10)
      if (seq > maxSequence) maxSequence = seq
    }
  }

  // 5. Generate credentials for all students concurrently (before transaction)
  const enrichedStudents: EnrichedStudent[] = await Promise.all(
    rows.map(async (row, index) => {
      const sequence = maxSequence + index + 1
      const studentUniqueId = generateStudentUniqueId(schoolCode, sequence)
      const temporaryPassword = generateTemporaryPassword()
      const passwordHash = await bcrypt.hash(temporaryPassword, BCRYPT_SALT_ROUNDS)

      return {
        name: row.name,
        email: row.email || null,
        phone: row.phone || null,
        admission_no: row.admission_no || null,
        roll_no: row.roll_no,
        class: row.class,
        section: row.section,
        guardian_name: row.guardian_name,
        guardian_phone: row.guardian_phone,
        date_of_birth: row.date_of_birth,
        studentUniqueId,
        temporaryPassword,
        passwordHash,
      }
    })
  )

  // 5b. Clean up orphaned User records whose usernames match this batch.
  //     Orphans arise when a school is deleted (cascade removes Student/SchoolUser but not User).
  //     Without this step, re-importing into a re-created school fails on User.username @unique.
  const newUsernames = enrichedStudents.map((s) => s.studentUniqueId)
  await prisma.user.deleteMany({
    where: {
      username: { in: newUsernames },
      schoolUsers: { none: {} }, // Only delete if no active school membership
    },
  })

  // 6. Bulk insert in a Prisma interactive transaction
  await prisma.$transaction(async (tx) => {
    // 6a. Create all User records and get back id + username
    const createdUsers = await tx.user.createManyAndReturn({
      data: enrichedStudents.map((s) => ({
        name: s.name,
        username: s.studentUniqueId, // globally unique login ID
        email: s.email ?? undefined,
        phone: s.phone ?? undefined,
        password_hash: s.passwordHash,
        role: "STUDENT" as const,
        must_reset_password: true,
        is_active: true,
        date_of_birth: s.date_of_birth,
      })),
      select: { id: true, username: true },
    })

    // 6b. Map username → user_id for O(1) lookup
    const userIdByUsername = new Map(createdUsers.map((u) => [u.username, u.id]))

    // 6c. Build Student and SchoolUser records
    const studentsData = enrichedStudents.map((s) => ({
      school_id: school.id,
      user_id: userIdByUsername.get(s.studentUniqueId)!,
      admission_no: s.admission_no,
      class: s.class,
      section: s.section,
      roll_no: s.roll_no,
      guardian_name: s.guardian_name,
      guardian_phone: s.guardian_phone,
    }))

    const schoolUsersData = enrichedStudents.map((s) => ({
      school_id: school.id,
      user_id: userIdByUsername.get(s.studentUniqueId)!,
      role: "STUDENT" as const,
    }))

    // 6d. Insert students and schoolUsers in parallel
    await Promise.all([
      tx.student.createMany({ data: studentsData }),
      tx.schoolUser.createMany({ data: schoolUsersData }),
    ])
  })

  // 7. Generate credentials PDFs (plain passwords exist only here in memory)
  const credentialRows = enrichedStudents.map((s) => ({
    name: s.name,
    studentUniqueId: s.studentUniqueId,
    class: s.class,
    section: s.section,
    roll_no: s.roll_no,
    temporaryPassword: s.temporaryPassword,
  }))

  // 7a. Combined PDF (all students)
  const pdfBase64 = await generateCredentialsPdf(school.schoolName, credentialRows)

  // 7b. Per-class-section PDFs
  const grouped = new Map<string, typeof credentialRows>()
  for (const row of credentialRows) {
    const key = `${row.class}|${row.section}`
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(row)
  }

  const classSectionPdfs: ClassSectionPdf[] = await Promise.all(
    Array.from(grouped.entries()).map(async ([key, rows]) => {
      const [cls, section] = key.split("|")
      const pdf = await generateCredentialsPdf(school.schoolName, rows)
      return {
        filename: `${schoolCode}-${cls}-${section}-Credentials.pdf`,
        pdf,
      }
    })
  )

  return {
    success: true,
    summary: { total: rows.length, imported: rows.length, failed: 0 },
    errors: [],
    pdf: pdfBase64,
    classSectionPdfs,
  }
}
