import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import fs from "fs"
import path from "path"
import bcrypt from "bcryptjs"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    ca: fs.readFileSync(path.join(process.cwd(), "certs", "ca.pem"), "utf-8"),
  },
})
const adapter = new PrismaPg(pool)
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
      update: {},
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
