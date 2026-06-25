import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { cached, invalidateTags } from "@/lib/cache"
import { cacheKeys, cacheTags } from "@/lib/cache-keys"
import type { CreateSessionInput } from "@/schemas/session.schema"
import { logFeeAction } from "./fee-audit.service"

function parseDateAtUTC(date: string): Date {
  // Accepts YYYY-MM-DD or ISO. Anchors to UTC midnight so @db.Date stores cleanly.
  const d = new Date(date.length === 10 ? `${date}T00:00:00.000Z` : date)
  if (Number.isNaN(d.getTime())) throw new Error("INVALID_DATE")
  return d
}

export async function createSession(
  schoolId: string,
  actorUserId: string,
  data: CreateSessionInput,
) {
  const startDate = parseDateAtUTC(data.startDate)
  const endDate = parseDateAtUTC(data.endDate)

  try {
    const session = await prisma.$transaction(async (tx) => {
      const created = await tx.session.create({
        data: {
          school_id: schoolId,
          name: data.name.trim(),
          start_date: startDate,
          end_date: endDate,
          is_current: Boolean(data.isCurrent),
        },
      })

      if (data.isCurrent) {
        await tx.session.updateMany({
          where: { school_id: schoolId, id: { not: created.id }, is_current: true },
          data: { is_current: false },
        })
      }

      await logFeeAction({
        client: tx,
        schoolId,
        actorUserId,
        action: "CREATE_SESSION",
        entityType: "SESSION",
        entityId: created.id,
        newValue: { name: created.name, isCurrent: created.is_current },
      })

      return created
    })
    await invalidateTags(cacheTags.sessions(schoolId))
    return session
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("SESSION_NAME_EXISTS")
    }
    throw error
  }
}

export async function listSessions(schoolId: string) {
  return cached(
    cacheKeys.sessions(schoolId),
    { ttl: 1800, tags: [cacheTags.sessions(schoolId)] },
    () =>
      prisma.session.findMany({
        where: { school_id: schoolId },
        orderBy: [{ is_current: "desc" }, { start_date: "desc" }],
      })
  )
}

export async function getCurrentSession(schoolId: string) {
  return prisma.session.findFirst({
    where: { school_id: schoolId, is_current: true },
  })
}

export async function setCurrentSession(
  schoolId: string,
  sessionId: string,
  actorUserId: string,
) {
  return prisma.$transaction(async (tx) => {
    const session = await tx.session.findFirst({
      where: { id: sessionId, school_id: schoolId },
    })
    if (!session) throw new Error("SESSION_NOT_FOUND")

    await tx.session.updateMany({
      where: { school_id: schoolId, is_current: true },
      data: { is_current: false },
    })

    const updated = await tx.session.update({
      where: { id: sessionId },
      data: { is_current: true },
    })

    await logFeeAction({
      client: tx,
      schoolId,
      actorUserId,
      action: "SET_CURRENT_SESSION",
      entityType: "SESSION",
      entityId: sessionId,
      newValue: { name: updated.name },
    })

    return updated
  }).then(async (updated) => {
    await invalidateTags(cacheTags.sessions(schoolId))
    return updated
  })
}

export async function assertSessionBelongsToSchool(schoolId: string, sessionId: string) {
  const session = await prisma.session.findFirst({
    where: { id: sessionId, school_id: schoolId },
  })
  if (!session) throw new Error("SESSION_NOT_FOUND")
  return session
}
