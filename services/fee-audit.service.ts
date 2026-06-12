import { Prisma, type FeeAuditAction } from "@prisma/client"
import { prisma } from "@/lib/prisma"

type AuditEntityType =
  | "STRUCTURE"
  | "LEDGER"
  | "TRANSACTION"
  | "WAIVER"
  | "PAYMENT_CONFIG"
  | "SESSION"
  | "SCHOOL_BRANDING"
  | "BANK_ACCOUNT"
  | "UPI_ACCOUNT"
  | "QR_CODE"
  | "MONTHLY_LATE_FEE"

type TxOrPrisma = Prisma.TransactionClient | typeof prisma

/**
 * Records every mutating action on fee-domain entities. Designed to be called
 * inside the same transaction as the mutation so logs are atomic with the change.
 */
export async function logFeeAction(args: {
  client?: TxOrPrisma
  schoolId: string
  actorUserId: string
  action: FeeAuditAction
  entityType: AuditEntityType
  entityId: string
  previousValue?: unknown
  newValue?: unknown
  reason?: string | null
}) {
  const client = args.client ?? prisma
  await client.feeAuditLog.create({
    data: {
      school_id: args.schoolId,
      actor_user_id: args.actorUserId,
      action: args.action,
      entity_type: args.entityType,
      entity_id: args.entityId,
      previous_value: (args.previousValue as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      new_value: (args.newValue as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      reason: args.reason ?? null,
    },
  })
}

export type AuditLogQuery = {
  entityType?: AuditEntityType
  action?: FeeAuditAction
  actorUserId?: string
  from?: Date
  to?: Date
  page?: number
  pageSize?: number
}

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const

export async function listAuditLogs(schoolId: string, query: AuditLogQuery = {}) {
  const page = Math.max(1, query.page ?? 1)
  // M5: capped at 100 (was 500) — limits scripted full-history dumps.
  const pageSize = Math.min(100, Math.max(10, query.pageSize ?? 50))

  const where: Prisma.FeeAuditLogWhereInput = {
    school_id: schoolId,
    ...(query.entityType ? { entity_type: query.entityType } : {}),
    ...(query.action ? { action: query.action } : {}),
    ...(query.actorUserId ? { actor_user_id: query.actorUserId } : {}),
    ...(query.from || query.to
      ? {
          created_at: {
            ...(query.from ? { gte: query.from } : {}),
            ...(query.to ? { lte: query.to } : {}),
          },
        }
      : {}),
  }

  const [items, total] = await Promise.all([
    prisma.feeAuditLog.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        actor: { select: { id: true, name: true, role: true } },
      },
    }),
    prisma.feeAuditLog.count({ where }),
  ])

  // Enrich items with student names + a short "Tuition · Apr 2026" entity
  // summary so the UI can render human-readable lines instead of raw JSON.
  // Batched lookups (one per entity type) to avoid N+1.
  const txnIds: string[] = []
  const ledgerIds: string[] = []
  const waiverIds: string[] = []
  const lateFeeIds: string[] = []
  for (const i of items) {
    switch (i.entity_type) {
      case "TRANSACTION":
        txnIds.push(i.entity_id)
        break
      case "LEDGER":
        ledgerIds.push(i.entity_id)
        break
      case "WAIVER":
        waiverIds.push(i.entity_id)
        break
      case "MONTHLY_LATE_FEE":
        lateFeeIds.push(i.entity_id)
        break
    }
  }

  // Prisma `in: []` returns an empty array without error, so we always call
  // findMany — keeps the result types unconditional and lets us pass them to
  // Map() below without `never[]` narrowing issues.
  const [txns, ledgers, waivers, lateFees] = await Promise.all([
    prisma.feeTransaction.findMany({
      where: { id: { in: txnIds }, school_id: schoolId },
      select: {
        id: true,
        amount: true,
        receipt_no: true,
        student: { select: { user: { select: { name: true } } } },
      },
    }),
    prisma.studentFeeLedger.findMany({
      where: { id: { in: ledgerIds }, school_id: schoolId },
      select: {
        id: true,
        head_name_snapshot: true,
        period_label: true,
        student: { select: { user: { select: { name: true } } } },
      },
    }),
    prisma.studentFeeWaiver.findMany({
      where: { id: { in: waiverIds }, school_id: schoolId },
      select: {
        id: true,
        period_year: true,
        period_month: true,
        fee_head: { select: { name: true } },
        student: { select: { user: { select: { name: true } } } },
      },
    }),
    prisma.studentMonthlyLateFee.findMany({
      where: { id: { in: lateFeeIds }, school_id: schoolId },
      select: {
        id: true,
        period_year: true,
        period_month: true,
        student: { select: { user: { select: { name: true } } } },
      },
    }),
  ])

  const txnById = new Map(txns.map((t) => [t.id, t]))
  const ledgerById = new Map(ledgers.map((l) => [l.id, l]))
  const waiverById = new Map(waivers.map((w) => [w.id, w]))
  const lateFeeById = new Map(lateFees.map((lf) => [lf.id, lf]))

  function periodLabel(year: number, month: number) {
    return `${MONTH_LABELS[month - 1] ?? month} ${year}`
  }

  const enriched = items.map((item) => {
    let studentName: string | null = null
    let entitySummary: string | null = null
    let amount: string | null = null

    switch (item.entity_type) {
      case "TRANSACTION": {
        const t = txnById.get(item.entity_id)
        if (t) {
          studentName = t.student.user.name
          amount = t.amount.toString()
          entitySummary = t.receipt_no ? `Receipt ${t.receipt_no}` : null
        }
        break
      }
      case "LEDGER": {
        const l = ledgerById.get(item.entity_id)
        if (l) {
          studentName = l.student.user.name
          entitySummary = `${l.head_name_snapshot} · ${l.period_label}`
        }
        break
      }
      case "WAIVER": {
        const w = waiverById.get(item.entity_id)
        if (w) {
          studentName = w.student.user.name
          entitySummary = `${w.fee_head.name} · ${periodLabel(w.period_year, w.period_month)}`
        }
        break
      }
      case "MONTHLY_LATE_FEE": {
        const lf = lateFeeById.get(item.entity_id)
        if (lf) {
          studentName = lf.student.user.name
          entitySummary = `Late Fee · ${periodLabel(lf.period_year, lf.period_month)}`
        }
        break
      }
    }

    return { ...item, studentName, entitySummary, amount }
  })

  return { items: enriched, total, page, pageSize }
}
