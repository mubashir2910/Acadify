import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const sslConfig = process.env.DATABASE_CA_CERT
    ? { ssl: { ca: process.env.DATABASE_CA_CERT } }
    : {}

  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
    ...sslConfig,
  })
  return new PrismaClient({ adapter })
}

export const prisma =
  globalForPrisma.prisma ??
  createPrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
