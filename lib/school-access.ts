import { prisma } from "@/lib/prisma"

/**
 * Resolves the schoolId for a given schoolCode and verifies the calling user
 * has admin-level access (SUPER_ADMIN, or ADMIN with an active SchoolUser).
 *
 * Returns the schoolId on success, or null + reason on failure.
 */
export async function resolveSchoolForAdminAccess(
  schoolCode: string,
  user: { id: string; role: string },
): Promise<{ schoolId: string } | { error: "NOT_FOUND" | "FORBIDDEN" }> {
  const school = await prisma.school.findUnique({
    where: { schoolCode },
    select: { id: true },
  })
  if (!school) return { error: "NOT_FOUND" }

  if (user.role === "SUPER_ADMIN") return { schoolId: school.id }
  if (user.role !== "ADMIN") return { error: "FORBIDDEN" }

  const membership = await prisma.schoolUser.findFirst({
    where: {
      user_id: user.id,
      school_id: school.id,
      role: "ADMIN",
      status: "ACTIVE",
    },
    select: { id: true },
  })
  if (!membership) return { error: "FORBIDDEN" }
  return { schoolId: school.id }
}

// ─── School-ID resolution helpers ─────────────────────────────────────────────
// Single source of truth for mapping an authenticated user to their school.
// Previously these were copy-pasted across several services with subtly
// different status filters; they are unified here. All lookups require an
// ACTIVE membership/record — this is fail-safe (it can only deny an inactive
// user, never grant access) and matches the majority of prior call sites.

/** Resolve the school an ADMIN belongs to (active membership only). */
export async function getAdminSchoolId(userId: string): Promise<string | null> {
  const schoolUser = await prisma.schoolUser.findFirst({
    where: { user_id: userId, role: "ADMIN", status: "ACTIVE" },
    select: { school_id: true },
  })
  return schoolUser?.school_id ?? null
}

/** Resolve the school a TEACHER belongs to (active record only). */
export async function getTeacherSchoolId(userId: string): Promise<string | null> {
  const teacher = await prisma.teacher.findFirst({
    where: { user_id: userId, status: "ACTIVE" },
    select: { school_id: true },
  })
  return teacher?.school_id ?? null
}

/** Resolve the school a STUDENT belongs to (active record only). */
export async function getStudentSchoolId(userId: string): Promise<string | null> {
  const student = await prisma.student.findFirst({
    where: { user_id: userId, status: "ACTIVE" },
    select: { school_id: true },
  })
  return student?.school_id ?? null
}

/** Resolve a user's school by role. Returns null for unknown/unsupported roles. */
export async function resolveSchoolIdByRole(
  userId: string,
  role: string
): Promise<string | null> {
  if (role === "ADMIN") return getAdminSchoolId(userId)
  if (role === "TEACHER") return getTeacherSchoolId(userId)
  if (role === "STUDENT") return getStudentSchoolId(userId)
  return null
}
