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
