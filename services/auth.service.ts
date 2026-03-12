import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export interface AuthUser {
  id: string
  username: string
  name: string
  role: string
  mustResetPassword: boolean
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
      is_active: true,
    },
  })

  if (!user || !user.is_active) return null

  const passwordMatches = await bcrypt.compare(password, user.password_hash)
  if (!passwordMatches) return null

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
  }
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
