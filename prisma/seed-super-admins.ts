import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"

const sslConfig = process.env.DATABASE_CA_CERT
  ? { ssl: { ca: process.env.DATABASE_CA_CERT } }
  : {}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
  ...sslConfig,
})
const prisma = new PrismaClient({ adapter })

const SUPER_ADMINS = [
  { username: "acadify_sa1", name: "Super Admin 1", password: "Acad!SA1@2026" },
  { username: "acadify_sa2", name: "Super Admin 2", password: "Acad!SA2@2026" },
]

async function main() {
  for (const admin of SUPER_ADMINS) {
    const passwordHash = await bcrypt.hash(admin.password, 10)
    await prisma.user.upsert({
      where: { username: admin.username },
      update: {
        password_hash: passwordHash,
        must_reset_password: true,
      },
      create: {
        name: admin.name,
        username: admin.username,
        password_hash: passwordHash,
        role: "SUPER_ADMIN",
        must_reset_password: true,
        is_active: true,
      },
    })
    console.log(`✔ Seeded: ${admin.username}`)
  }
  console.log("\nSuper admin credentials:")
  SUPER_ADMINS.forEach((a) => console.log(`  ${a.username} / ${a.password}`))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
