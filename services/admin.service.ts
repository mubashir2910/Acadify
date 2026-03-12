import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { generateTemporaryPassword } from "@/lib/student-id"

const BCRYPT_SALT_ROUNDS = 10

export async function getAdminsBySchoolCode(schoolCode: string) {
  const schoolUsers = await prisma.schoolUser.findMany({
    where: { school: { schoolCode }, role: "ADMIN" },
    select: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          is_active: true,
          must_reset_password: true,
          created_at: true,
        },
      },
    },
    orderBy: { created_at: "asc" },
  })
  return schoolUsers.map((su) => su.user)
}

/**
 * Creates an ADMIN user and links them to the given school.
 * The admin is created with must_reset_password=true so they are forced
 * to set their own password on first login.
 */
export async function createAdmin(
  schoolCode: string,
  name: string,
  username: string
): Promise<{ username: string; tempPassword: string }> {
  const school = await prisma.school.findUnique({ where: { schoolCode } })
  if (!school) throw new Error("SCHOOL_NOT_FOUND")

  const existingUser = await prisma.user.findUnique({ where: { username } })
  if (existingUser) throw new Error("USERNAME_TAKEN")

  const tempPassword = generateTemporaryPassword()
  const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_SALT_ROUNDS)

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name,
        username,
        role: "ADMIN",
        password_hash: passwordHash,
        must_reset_password: true,
        is_active: true,
      },
    })

    await tx.schoolUser.create({
      data: {
        school_id: school.id,
        user_id: user.id,
        role: "ADMIN",
      },
    })
  })

  return { username, tempPassword }
}
