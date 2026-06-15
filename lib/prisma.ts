import "server-only"
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
    // Cap connections per instance so (instances × max) stays under the database's
    // connection limit. In production point DATABASE_URL at DigitalOcean's managed
    // connection pool (PgBouncer) and size DB_POOL_MAX with headroom; default 10.
    max: Number(process.env.DB_POOL_MAX ?? 10),
    // Fail fast when the pool is saturated instead of hanging the request.
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
  })
  return new PrismaClient({ adapter })
}

export const prisma =
  globalForPrisma.prisma ??
  createPrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
