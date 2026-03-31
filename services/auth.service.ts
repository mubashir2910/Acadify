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

  if (!user || !user.is_active) return null

  const passwordMatches = await bcrypt.compare(password, user.password_hash)
  if (!passwordMatches) return null

  // For school-bound roles, check subscription status before allowing login
  if (user.role !== "SUPER_ADMIN") {
    const blocked = await isSchoolBlocked(user.id, user.role)
    if (blocked) return null
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
 */
async function isSchoolBlocked(userId: string, role: string): Promise<boolean> {
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
