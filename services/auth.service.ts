import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export interface AuthUser {
  id: string
  username: string
  name: string
  role: string
  mustResetPassword: boolean
  isProfileComplete: boolean
}

/**
 * Verifies username + password. Returns AuthUser on success, null on failure.
 * Also updates last_login_at on successful verification.
 */
export async function verifyCredentials(
  username: string,
  password: string
): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      password_hash: true,
      must_reset_password: true,
      is_profile_complete: true,
      is_active: true,
    },
  })

  if (!user) {
    console.log("[verifyCredentials] User not found:", username)
    return null
  }
  if (!user.is_active) {
    console.log("[verifyCredentials] User inactive:", username)
    return null
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash)
  if (!passwordMatches) {
    console.log("[verifyCredentials] Password mismatch for:", username)
    return null
  }

  // For school-bound roles, check subscription status before allowing login
  if (user.role !== "SUPER_ADMIN") {
    const blocked = await isUserSchoolSuspended(user.id, user.role)
    if (blocked) {
      console.log("[verifyCredentials] School suspended for:", username, "role:", user.role)
      return null
    }
  }

  // Update last login timestamp (fire-and-forget, don't block the response)
  prisma.user
    .update({ where: { id: user.id }, data: { last_login_at: new Date() } })
    .catch(() => {}) // non-critical

  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    mustResetPassword: user.must_reset_password,
    isProfileComplete: user.is_profile_complete,
  }
}

/**
 * Checks if a user's school subscription is expired or suspended.
 * Auto-suspends schools whose trial or subscription has expired.
 * Called at login and periodically during JWT refresh.
 */
export async function isUserSchoolSuspended(userId: string, role: string): Promise<boolean> {
  // Resolve the user's school based on their role
  let school: {
    id: string
    subscription_status: string
    trial_ends_at: Date | null
    subscription_ends_at: Date | null
  } | null = null

  if (role === "ADMIN") {
    const su = await prisma.schoolUser.findFirst({
      where: { user_id: userId, role: "ADMIN" },
      select: {
        school: {
          select: {
            id: true,
            subscription_status: true,
            trial_ends_at: true,
            subscription_ends_at: true,
          },
        },
      },
    })
    school = su?.school ?? null
  } else if (role === "TEACHER") {
    const t = await prisma.teacher.findFirst({
      where: { user_id: userId },
      select: {
        school: {
          select: {
            id: true,
            subscription_status: true,
            trial_ends_at: true,
            subscription_ends_at: true,
          },
        },
      },
    })
    school = t?.school ?? null
  } else if (role === "STUDENT") {
    const s = await prisma.student.findFirst({
      where: { user_id: userId },
      select: {
        school: {
          select: {
            id: true,
            subscription_status: true,
            trial_ends_at: true,
            subscription_ends_at: true,
          },
        },
      },
    })
    school = s?.school ?? null
  }

  if (!school) return false // No school found — don't block (edge case)

  const now = new Date()
  const { subscription_status, trial_ends_at, subscription_ends_at } = school

  // Already suspended or cancelled — block
  if (subscription_status === "SUSPENDED" || subscription_status === "CANCELLED") {
    return true
  }

  // Trial expired — auto-suspend
  if (subscription_status === "TRIAL" && trial_ends_at && trial_ends_at < now) {
    await prisma.school.update({
      where: { id: school.id },
      data: { subscription_status: "SUSPENDED" },
    })
    return true
  }

  // Active subscription expired — auto-suspend
  if (subscription_status === "ACTIVE" && subscription_ends_at && subscription_ends_at < now) {
    await prisma.school.update({
      where: { id: school.id },
      data: { subscription_status: "SUSPENDED" },
    })
    return true
  }

  return false
}

/**
 * Updates the user's password and clears the must_reset_password flag.
 */
export async function resetPassword(userId: string, newPassword: string): Promise<void> {
  const passwordHash = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({
    where: { id: userId },
    data: {
      password_hash: passwordHash,
      must_reset_password: false,
    },
  })
}

/**
 * Admin resets a user's password on their behalf.
 * Generates a new temporary password and forces the user to reset on next login.
 * Verifies the target user belongs to the admin's school before proceeding.
 * Returns the plain-text temporary password (caller must display it once and discard).
 */
export async function adminResetUserPassword(
  adminUserId: string,
  targetUserId: string
): Promise<string> {
  // Resolve admin's school
  const schoolUser = await prisma.schoolUser.findFirst({
    where: { user_id: adminUserId, role: "ADMIN" },
    select: { school_id: true },
  })
  if (!schoolUser) throw new Error("ADMIN_SCHOOL_NOT_FOUND")

  const adminSchoolId = schoolUser.school_id

  // Verify target user belongs to the same school (check all school-bound roles)
  const [student, teacher, adminRecord] = await Promise.all([
    prisma.student.findFirst({
      where: { user_id: targetUserId, school_id: adminSchoolId },
      select: { id: true },
    }),
    prisma.teacher.findFirst({
      where: { user_id: targetUserId, school_id: adminSchoolId },
      select: { id: true },
    }),
    prisma.schoolUser.findFirst({
      where: { user_id: targetUserId, school_id: adminSchoolId, role: "ADMIN" },
      select: { id: true },
    }),
  ])

  if (!student && !teacher && !adminRecord) {
    throw new Error("USER_NOT_IN_SCHOOL")
  }

  const { generateTemporaryPassword } = await import("@/lib/student-id")
  const temporaryPassword = generateTemporaryPassword()
  const passwordHash = await bcrypt.hash(temporaryPassword, 10)

  await prisma.user.update({
    where: { id: targetUserId },
    data: {
      password_hash: passwordHash,
      must_reset_password: true,
    },
  })

  return temporaryPassword
}
