import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import type {
  CreateFeeStructureInput,
  UpdateFeeStructureInput,
} from "@/schemas/fee-structure.schema"
import { logFeeAction } from "./fee-audit.service"
import { assertSessionBelongsToSchool } from "./session.service"
import { cached, invalidateTags } from "@/lib/cache"
import { cacheKeys, cacheTags, serializeParams } from "@/lib/cache-keys"

function dateAtUTC(s: string): Date {
  const d = new Date(s.length === 10 ? `${s}T00:00:00.000Z` : s)
  if (Number.isNaN(d.getTime())) throw new Error("INVALID_DATE")
  return d
}

export async function createFeeStructure(
  schoolId: string,
  actorUserId: string,
  data: CreateFeeStructureInput,
) {
  await assertSessionBelongsToSchool(schoolId, data.sessionId)

  const effectiveFrom = dateAtUTC(data.effectiveFrom)
  const effectiveTo = data.effectiveTo ? dateAtUTC(data.effectiveTo) : null

  // One transaction wraps all per-class creates so a partial failure can't
  // leave half-created structures across the selected classes.
  const result = await prisma.$transaction(async (tx) => {
    const createdStructures: Awaited<ReturnType<typeof tx.feeStructure.create>>[] = []

    for (const className of data.classes) {
      // Archive any existing active structure for the same (session, class, section) scope.
      const prior = await tx.feeStructure.findFirst({
        where: {
          school_id: schoolId,
          session_id: data.sessionId,
          class: className,
          section: data.section ?? null,
          is_active: true,
        },
        orderBy: { version: "desc" },
      })

      const nextVersion = prior ? prior.version + 1 : 1

      if (prior) {
        await tx.feeStructure.update({
          where: { id: prior.id },
          data: { is_active: false, effective_to: prior.effective_to ?? effectiveFrom },
        })
        await logFeeAction({
          client: tx,
          schoolId,
          actorUserId,
          action: "ARCHIVE_STRUCTURE",
          entityType: "STRUCTURE",
          entityId: prior.id,
          previousValue: { is_active: true, version: prior.version },
          newValue: { is_active: false, version: prior.version },
        })
      }

      const created = await tx.feeStructure.create({
        data: {
          school_id: schoolId,
          session_id: data.sessionId,
          class: className,
          section: data.section ?? null,
          name: data.name,
          version: nextVersion,
          is_active: true,
          effective_from: effectiveFrom,
          effective_to: effectiveTo,
          created_by: actorUserId,
          fee_heads: {
            create: data.feeHeads.map((h, i) => ({
              name: h.name,
              category: h.category,
              frequency: h.frequency,
              amount: new Prisma.Decimal(h.amount.toFixed(2)),
              due_day_of_month: h.dueDayOfMonth ?? null,
              due_month: h.dueMonth ?? null,
              is_optional: h.isOptional ?? false,
              sort_order: h.sortOrder ?? i,
              applied_months: (h.appliedMonths?.length ?? 0) > 0
                ? {
                    create: h.appliedMonths!.map((m) => ({
                      period_year: m.year,
                      period_month: m.month,
                      due_day: m.dueDay ?? null,
                    })),
                  }
                : undefined,
            })),
          },
        },
        include: { fee_heads: { include: { applied_months: true } } },
      })

      await logFeeAction({
        client: tx,
        schoolId,
        actorUserId,
        action: "CREATE_STRUCTURE",
        entityType: "STRUCTURE",
        entityId: created.id,
        newValue: {
          class: created.class,
          section: created.section,
          version: created.version,
          feeHeads: created.fee_heads.map((h) => ({
            name: h.name,
            amount: h.amount.toString(),
            frequency: h.frequency,
          })),
        },
      })

      createdStructures.push(created)
    }

    // Preserve the existing PATCH/update behaviour (which always passes a
    // single class) by returning the lone object when only one was created.
    return createdStructures.length === 1 ? createdStructures[0] : createdStructures
  })

  await invalidateTags(cacheTags.fees(schoolId))
  return result
}

export async function listFeeStructures(
  schoolId: string,
  opts: { sessionId?: string; class?: string; includeArchived?: boolean } = {},
) {
  return cached(
    cacheKeys.feesStructures(schoolId, serializeParams({ ...opts })),
    { ttl: 60, tags: [cacheTags.fees(schoolId)] },
    () => computeListFeeStructures(schoolId, opts),
  )
}

async function computeListFeeStructures(
  schoolId: string,
  opts: { sessionId?: string; class?: string; includeArchived?: boolean } = {},
) {
  const structures = await prisma.feeStructure.findMany({
    where: {
      school_id: schoolId,
      ...(opts.sessionId ? { session_id: opts.sessionId } : {}),
      ...(opts.class ? { class: opts.class } : {}),
      ...(opts.includeArchived ? {} : { is_active: true }),
    },
    orderBy: [{ class: "asc" }, { section: "asc" }, { version: "desc" }],
    include: {
      session: { select: { id: true, name: true, is_current: true } },
      fee_heads: { orderBy: { sort_order: "asc" }, include: { applied_months: true } },
    },
  })

  // Per-structure stats drive the UI: "Lock Structure for Session" availability
  // and the Delete-modal safety logic (refusing to delete ledger rows that have
  // been paid or waived). These counts are keyed by fee_head, so we resolve them
  // in 3 grouped queries total (grouped by fee_head_id) and fold the results back
  // onto each structure — instead of running 3 count queries per structure (N+1).
  const headToStructure = new Map<string, string>()
  for (const s of structures) {
    for (const h of s.fee_heads) headToStructure.set(h.id, s.id)
  }
  const allHeadIds = Array.from(headToStructure.keys())

  const [ledgerGroups, paidLedgerGroups, waiverGroups] = await Promise.all([
    prisma.studentFeeLedger.groupBy({
      by: ["fee_head_id"],
      where: { school_id: schoolId, fee_head_id: { in: allHeadIds } },
      _count: { _all: true },
    }),
    prisma.studentFeeLedger.groupBy({
      by: ["fee_head_id"],
      where: {
        school_id: schoolId,
        fee_head_id: { in: allHeadIds },
        OR: [{ paid_amount: { gt: 0 } }, { status: { in: ["PARTIAL", "PAID"] } }],
      },
      _count: { _all: true },
    }),
    prisma.studentFeeWaiver.groupBy({
      by: ["fee_head_id"],
      where: { school_id: schoolId, revoked_at: null, fee_head_id: { in: allHeadIds } },
      _count: { _all: true },
    }),
  ])

  // Fold per-fee-head group counts up to their owning structure.
  const foldByStructure = (
    groups: { fee_head_id: string | null; _count: { _all: number } }[],
  ): Map<string, number> => {
    const acc = new Map<string, number>()
    for (const g of groups) {
      const structureId = g.fee_head_id ? headToStructure.get(g.fee_head_id) : undefined
      if (!structureId) continue
      acc.set(structureId, (acc.get(structureId) ?? 0) + g._count._all)
    }
    return acc
  }
  const ledgerByStructure = foldByStructure(ledgerGroups)
  const paidByStructure = foldByStructure(paidLedgerGroups)
  const waiverByStructure = foldByStructure(waiverGroups)

  return structures.map((s) => ({
    ...s,
    ledger_row_count: ledgerByStructure.get(s.id) ?? 0,
    paid_ledger_count: paidByStructure.get(s.id) ?? 0,
    waiver_count: waiverByStructure.get(s.id) ?? 0,
  }))
}

export async function getFeeStructure(schoolId: string, structureId: string) {
  return cached(
    cacheKeys.feesStructure(structureId),
    { ttl: 60, tags: [cacheTags.fees(schoolId)] },
    () => computeGetFeeStructure(schoolId, structureId),
  )
}

async function computeGetFeeStructure(schoolId: string, structureId: string) {
  return prisma.feeStructure.findFirst({
    where: { id: structureId, school_id: schoolId },
    include: {
      session: true,
      fee_heads: { orderBy: { sort_order: "asc" }, include: { applied_months: true } },
    },
  })
}

export async function archiveFeeStructure(
  schoolId: string,
  actorUserId: string,
  structureId: string,
) {
  const structure = await prisma.feeStructure.findFirst({
    where: { id: structureId, school_id: schoolId },
  })
  if (!structure) throw new Error("STRUCTURE_NOT_FOUND")
  if (!structure.is_active) throw new Error("STRUCTURE_ALREADY_ARCHIVED")

  await prisma.$transaction(async (tx) => {
    await tx.feeStructure.update({
      where: { id: structureId },
      data: { is_active: false, effective_to: structure.effective_to ?? new Date() },
    })
    await logFeeAction({
      client: tx,
      schoolId,
      actorUserId,
      action: "ARCHIVE_STRUCTURE",
      entityType: "STRUCTURE",
      entityId: structureId,
      previousValue: { is_active: true },
      newValue: { is_active: false },
    })
  })

  await invalidateTags(cacheTags.fees(schoolId))
}

/**
 * Hard-deletes a fee structure. The admin chooses what to do with ledger rows
 * that were generated from this structure:
 *   - deleteLedgers=false → keep ledger rows, just null out their fee_head_id so
 *     fee_heads can cascade-delete with the structure. The `head_name_snapshot`
 *     column on each ledger row preserves the history for reports.
 *   - deleteLedgers=true → also delete the ledger rows. Refused if ANY of them
 *     have been paid (paid_amount > 0 or status PARTIAL/PAID) or have an active
 *     waiver, because that would silently destroy a financial audit trail.
 */
export async function deleteFeeStructure(
  schoolId: string,
  actorUserId: string,
  structureId: string,
  options: { deleteLedgers: boolean },
) {
  const structure = await prisma.feeStructure.findFirst({
    where: { id: structureId, school_id: schoolId },
    select: {
      id: true,
      class: true,
      section: true,
      name: true,
      version: true,
      session_id: true,
      fee_heads: { select: { id: true } },
    },
  })
  if (!structure) throw new Error("STRUCTURE_NOT_FOUND")

  const feeHeadIds = structure.fee_heads.map((h) => h.id)

  // Safety: refuse to delete ledger rows that have payments or active waivers.
  if (options.deleteLedgers && feeHeadIds.length > 0) {
    const [paidCount, waiverCount] = await Promise.all([
      prisma.studentFeeLedger.count({
        where: {
          school_id: schoolId,
          fee_head_id: { in: feeHeadIds },
          OR: [
            { paid_amount: { gt: 0 } },
            { status: { in: ["PARTIAL", "PAID"] } },
          ],
        },
      }),
      prisma.studentFeeWaiver.count({
        where: {
          school_id: schoolId,
          fee_head_id: { in: feeHeadIds },
          revoked_at: null,
        },
      }),
    ])
    if (paidCount > 0 || waiverCount > 0) {
      throw new Error("STRUCTURE_HAS_PAID_OR_WAIVED_LEDGERS")
    }
  }

  await prisma.$transaction(async (tx) => {
    if (options.deleteLedgers && feeHeadIds.length > 0) {
      // Capture the rows we're about to destroy so each one gets its own
      // audit entry — destroying financial rows in bulk with zero trail is
      // unacceptable. (Audit H5.)
      const condemned = await tx.studentFeeLedger.findMany({
        where: { school_id: schoolId, fee_head_id: { in: feeHeadIds } },
        select: {
          id: true,
          student_id: true,
          fee_head_id: true,
          head_name_snapshot: true,
          period_label: true,
          period_year: true,
          period_month: true,
          expected_amount: true,
          waiver_amount: true,
          paid_amount: true,
          status: true,
        },
      })
      // FeePaymentAllocation FKs are SetNull on ledger delete (post-C2), so
      // any leftover allocations survive as orphan rows with snapshots
      // intact. The safety check above also forbids deleting any ledger
      // that has paid allocations or active waivers, so in normal flow
      // there are no allocations to worry about.
      await tx.studentFeeLedger.deleteMany({
        where: { school_id: schoolId, fee_head_id: { in: feeHeadIds } },
      })
      for (const row of condemned) {
        await logFeeAction({
          client: tx,
          schoolId,
          actorUserId,
          action: "DELETE_LEDGER",
          entityType: "LEDGER",
          entityId: row.id,
          previousValue: {
            student_id: row.student_id,
            fee_head_id: row.fee_head_id,
            head_name_snapshot: row.head_name_snapshot,
            period_label: row.period_label,
            period_year: row.period_year,
            period_month: row.period_month,
            expected_amount: row.expected_amount.toString(),
            waiver_amount: row.waiver_amount.toString(),
            paid_amount: row.paid_amount.toString(),
            status: row.status,
          },
          newValue: null,
          reason: `Deleted as part of structure ${structureId} delete`,
        })
      }
    } else if (feeHeadIds.length > 0) {
      // Keep ledger rows: detach them from the fee_heads about to be deleted.
      await tx.studentFeeLedger.updateMany({
        where: { school_id: schoolId, fee_head_id: { in: feeHeadIds } },
        data: { fee_head_id: null },
      })
    }

    // Now safe to drop the structure (fee_heads cascade-delete with it).
    await tx.feeStructure.delete({ where: { id: structureId } })

    await logFeeAction({
      client: tx,
      schoolId,
      actorUserId,
      action: "DELETE_STRUCTURE",
      entityType: "STRUCTURE",
      entityId: structureId,
      previousValue: {
        class: structure.class,
        section: structure.section,
        name: structure.name,
        version: structure.version,
        session_id: structure.session_id,
      },
      newValue: { deletedLedgers: options.deleteLedgers },
      reason: options.deleteLedgers ? "Deleted structure + ledger rows" : "Deleted structure, kept ledger rows",
    })
  })

  await invalidateTags(cacheTags.fees(schoolId))
}

export async function updateFeeStructure(
  schoolId: string,
  actorUserId: string,
  structureId: string,
  data: UpdateFeeStructureInput,
) {
  const existing = await getFeeStructure(schoolId, structureId)
  if (!existing) throw new Error("STRUCTURE_NOT_FOUND")

  // Versioning model: archive existing and create a new version atomically (handled by createFeeStructure)
  await archiveFeeStructure(schoolId, actorUserId, structureId)
  return createFeeStructure(schoolId, actorUserId, data)
}

/**
 * Returns the active fee structures applicable to a (class, section) combo.
 * Section-specific structure wins over class-wide when both exist.
 */
export async function findApplicableStructure(
  schoolId: string,
  sessionId: string,
  className: string,
  section: string,
) {
  // 1. Look for a section-specific structure
  const sectionSpecific = await prisma.feeStructure.findFirst({
    where: {
      school_id: schoolId,
      session_id: sessionId,
      class: className,
      section,
      is_active: true,
    },
    include: { fee_heads: { orderBy: { sort_order: "asc" }, include: { applied_months: true } } },
  })
  if (sectionSpecific) return sectionSpecific

  // 2. Fall back to class-wide (section=null)
  return prisma.feeStructure.findFirst({
    where: {
      school_id: schoolId,
      session_id: sessionId,
      class: className,
      section: null,
      is_active: true,
    },
    include: { fee_heads: { orderBy: { sort_order: "asc" }, include: { applied_months: true } } },
  })
}
