import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import type {
  AllocationInput,
  EditTransactionInput,
  HybridUploadInput,
  ManualPaymentInput,
  RejectTransactionInput,
  TransactionQuery,
} from "@/schemas/fee-transaction.schema"
import { logFeeAction } from "./fee-audit.service"
import { recomputeLedgerStatus } from "./fee-ledger.service"
import { recomputeMonthlyLateFeeStatus } from "./fee-monthly-late-fee.service"
import { cached, invalidateTags } from "@/lib/cache"
import { cacheKeys, cacheTags, serializeParams } from "@/lib/cache-keys"

const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000

function dec(amount: number): Prisma.Decimal {
  return new Prisma.Decimal(amount.toFixed(2))
}

async function generateReceiptNo(
  tx: Prisma.TransactionClient,
  schoolId: string,
): Promise<string> {
  const school = await tx.school.findUnique({
    where: { id: schoolId },
    select: { schoolCode: true },
  })
  if (!school) throw new Error("SCHOOL_NOT_FOUND")
  const year = new Date().getFullYear()

  // Atomic claim: a single SQL statement that either inserts a new
  // counter row (seq=1) or increments the existing one, then returns
  // the claimed value. Two concurrent writers serialize on the row
  // lock created by ON CONFLICT DO UPDATE, so each gets a distinct
  // sequence number — eliminating the COUNT+1 race.
  const rows = await tx.$queryRaw<{ last_seq: number }[]>`
    INSERT INTO "SchoolReceiptCounter" (school_id, year, last_seq, updated_at)
    VALUES (${schoolId}::uuid, ${year}, 1, NOW())
    ON CONFLICT (school_id, year)
    DO UPDATE SET last_seq = "SchoolReceiptCounter".last_seq + 1, updated_at = NOW()
    RETURNING last_seq
  `
  if (!rows || rows.length === 0) throw new Error("RECEIPT_COUNTER_FAILED")
  const claimedSeq = Number(rows[0].last_seq)
  const seq = claimedSeq.toString().padStart(6, "0")
  const yearShort = year.toString().slice(-2)
  return `${school.schoolCode}/R/${yearShort}/${seq}`
}

type ValidatedAllocationContext = {
  ledgerById: Map<
    string,
    { id: string; head_name_snapshot: string; period_label: string }
  >
  lateById: Map<string, { id: string; period_year: number; period_month: number }>
}

async function validateAllocations(
  tx: Prisma.TransactionClient,
  schoolId: string,
  studentId: string,
  allocations: AllocationInput[],
): Promise<ValidatedAllocationContext> {
  const ledgerIds = allocations.filter((a) => a.ledgerId).map((a) => a.ledgerId!)
  const monthlyIds = allocations.filter((a) => a.monthlyLateFeeId).map((a) => a.monthlyLateFeeId!)

  const [ledgers, monthlyLateFees] = await Promise.all([
    ledgerIds.length > 0
      ? tx.studentFeeLedger.findMany({
          where: { id: { in: ledgerIds }, school_id: schoolId, student_id: studentId },
        })
      : Promise.resolve([]),
    monthlyIds.length > 0
      ? tx.studentMonthlyLateFee.findMany({
          where: { id: { in: monthlyIds }, school_id: schoolId, student_id: studentId },
        })
      : Promise.resolve([]),
  ])

  if (ledgers.length !== ledgerIds.length) throw new Error("INVALID_LEDGER_ALLOCATION")
  if (monthlyLateFees.length !== monthlyIds.length) throw new Error("INVALID_MONTHLY_LATE_FEE_ALLOCATION")

  for (const allocation of allocations) {
    if (allocation.ledgerId) {
      const ledger = ledgers.find((l) => l.id === allocation.ledgerId)!
      const expected = new Prisma.Decimal(ledger.expected_amount)
      const waiver = new Prisma.Decimal(ledger.waiver_amount)
      const paid = new Prisma.Decimal(ledger.paid_amount)
      const outstanding = expected.minus(waiver).minus(paid)
      if (dec(allocation.amountApplied).gt(outstanding)) {
        throw new Error(`ALLOCATION_EXCEEDS_DUE:${ledger.id}:${outstanding.toString()}`)
      }
    } else if (allocation.monthlyLateFeeId) {
      const row = monthlyLateFees.find((m) => m.id === allocation.monthlyLateFeeId)!
      if (row.waived) {
        throw new Error(`ALLOCATION_EXCEEDS_DUE:${row.id}:0`)
      }
      // Subtract waiver_amount too — partial late-fee waivers reduce the
      // payable cap, and the old check let admins over-allocate which
      // `recomputeMonthlyLateFeeStatus` then silently clamped, leaving
      // phantom over-allocations in FeePaymentAllocation. (Audit C6.)
      const outstanding = new Prisma.Decimal(row.amount)
        .minus(row.paid)
        .minus(row.waiver_amount)
      if (dec(allocation.amountApplied).gt(outstanding)) {
        throw new Error(`ALLOCATION_EXCEEDS_DUE:${row.id}:${outstanding.toString()}`)
      }
    }
  }

  return {
    ledgerById: new Map(
      ledgers.map((l) => [
        l.id,
        {
          id: l.id,
          head_name_snapshot: l.head_name_snapshot,
          period_label: l.period_label,
        },
      ]),
    ),
    lateById: new Map(
      monthlyLateFees.map((m) => [
        m.id,
        { id: m.id, period_year: m.period_year, period_month: m.period_month },
      ]),
    ),
  }
}

async function assertNoDuplicateRef(
  tx: Prisma.TransactionClient,
  schoolId: string,
  externalTxnRef: string | null | undefined,
  excludeTransactionId?: string,
) {
  if (!externalTxnRef) return
  const existing = await tx.feeTransaction.findFirst({
    where: {
      school_id: schoolId,
      external_txn_ref: externalTxnRef,
      status: { notIn: ["REJECTED", "CANCELLED"] },
      ...(excludeTransactionId ? { id: { not: excludeTransactionId } } : {}),
    },
    select: { id: true },
  })
  if (existing) throw new Error("DUPLICATE_TXN_REF")
}

async function recomputeAllocationTargets(
  tx: Prisma.TransactionClient,
  allocations: { ledger_id: string | null; monthly_late_fee_id: string | null }[],
) {
  for (const a of allocations) {
    if (a.ledger_id) await recomputeLedgerStatus(tx, a.ledger_id)
    if (a.monthly_late_fee_id) await recomputeMonthlyLateFeeStatus(tx, a.monthly_late_fee_id)
  }
}

const MONTH_LABELS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

function buildAllocationCreate(
  allocations: AllocationInput[],
  ctx: ValidatedAllocationContext,
) {
  return allocations.map((a) => {
    // Compute snapshots so receipts + audit can render even if the
    // ledger / late-fee row is later detached or deleted. (Audit C2.)
    let head_name_snapshot: string | null = null
    let period_label_snapshot: string | null = null
    if (a.ledgerId) {
      const l = ctx.ledgerById.get(a.ledgerId)
      if (l) {
        head_name_snapshot = l.head_name_snapshot
        period_label_snapshot = l.period_label
      }
    } else if (a.monthlyLateFeeId) {
      const m = ctx.lateById.get(a.monthlyLateFeeId)
      if (m) {
        head_name_snapshot = "Late Fee"
        period_label_snapshot = `${MONTH_LABELS_SHORT[m.period_month - 1] ?? m.period_month} ${m.period_year}`
      }
    }
    return {
      ledger_id: a.ledgerId ?? null,
      monthly_late_fee_id: a.monthlyLateFeeId ?? null,
      amount_applied: dec(a.amountApplied),
      head_name_snapshot,
      period_label_snapshot,
    }
  })
}

/**
 * Admin records a manual payment. Status defaults to VERIFIED — admin is the
 * trusted authority for cash/manual entries. Allocations apply immediately.
 */
export async function recordManualPayment(
  schoolId: string,
  actorUserId: string,
  data: ManualPaymentInput,
) {
  const result = await prisma.$transaction(async (tx) => {
    const student = await tx.student.findFirst({
      where: { id: data.studentId, school_id: schoolId },
      select: { id: true },
    })
    if (!student) throw new Error("STUDENT_NOT_FOUND")

    const allocCtx = await validateAllocations(tx, schoolId, data.studentId, data.allocations)
    await assertNoDuplicateRef(tx, schoolId, data.externalTxnRef)

    const receiptNo = await generateReceiptNo(tx, schoolId)
    const paidAt = new Date(data.paidAt)
    if (Number.isNaN(paidAt.getTime())) throw new Error("INVALID_DATE")

    const created = await tx.feeTransaction.create({
      data: {
        receipt_no: receiptNo,
        school_id: schoolId,
        student_id: data.studentId,
        recorded_by_user_id: actorUserId,
        amount: dec(data.amount),
        method: data.method,
        status: "VERIFIED",
        mode_context: "FULL_MANUAL",
        external_txn_ref: data.externalTxnRef ?? null,
        proof_url: data.proofUrl ?? null,
        notes: data.notes ?? null,
        paid_at: paidAt,
        verified_by_user_id: actorUserId,
        verified_at: new Date(),
        editable_until: new Date(Date.now() + EDIT_WINDOW_MS),
        allocations: { create: buildAllocationCreate(data.allocations, allocCtx) },
      },
      include: { allocations: { select: { ledger_id: true, monthly_late_fee_id: true } } },
    })

    await recomputeAllocationTargets(tx, created.allocations)

    await logFeeAction({
      client: tx,
      schoolId,
      actorUserId,
      action: "CREATE_TRANSACTION",
      entityType: "TRANSACTION",
      entityId: created.id,
      newValue: {
        receipt_no: created.receipt_no,
        amount: created.amount.toString(),
        method: created.method,
        status: created.status,
        allocations: data.allocations,
      },
    })

    return created
  })

  await invalidateTags(cacheTags.fees(schoolId), cacheTags.feesStudent(data.studentId))
  return result
}

/**
 * Student/parent submits proof for hybrid flow. Status = PENDING_VERIFICATION.
 * Allocations exist but don't apply to paid_amount until admin verifies.
 */
export async function submitHybridProof(
  schoolId: string,
  recordedByUserId: string,
  studentId: string,
  data: HybridUploadInput,
) {
  const result = await prisma.$transaction(async (tx) => {
    const student = await tx.student.findFirst({
      where: { id: studentId, school_id: schoolId },
      select: { id: true },
    })
    if (!student) throw new Error("STUDENT_NOT_FOUND")

    const allocCtx = await validateAllocations(tx, schoolId, studentId, data.allocations)
    await assertNoDuplicateRef(tx, schoolId, data.externalTxnRef)

    // Server-side guard against duplicate PENDING_VERIFICATION submissions
    // for the same period. The UI disables "Pay Now" while a submission is
    // pending, but a curl replay or a stale tab can bypass it — without
    // this check, the admin's Pending Verifications tab fills with
    // duplicates that may both get approved. (Audit C5.)
    const ledgerIds = data.allocations
      .filter((a) => a.ledgerId)
      .map((a) => a.ledgerId!)
    const lateFeeIds = data.allocations
      .filter((a) => a.monthlyLateFeeId)
      .map((a) => a.monthlyLateFeeId!)
    const periodConflictClauses: Prisma.FeeTransactionWhereInput[] = []
    if (ledgerIds.length > 0) {
      periodConflictClauses.push({
        allocations: { some: { ledger_id: { in: ledgerIds } } },
      })
    }
    if (lateFeeIds.length > 0) {
      periodConflictClauses.push({
        allocations: { some: { monthly_late_fee_id: { in: lateFeeIds } } },
      })
    }
    if (periodConflictClauses.length > 0) {
      const conflict = await tx.feeTransaction.findFirst({
        where: {
          school_id: schoolId,
          student_id: studentId,
          status: "PENDING_VERIFICATION",
          OR: periodConflictClauses,
        },
        select: { id: true, receipt_no: true },
      })
      if (conflict) throw new Error(`PENDING_DUPLICATE:${conflict.receipt_no}`)
    }

    const receiptNo = await generateReceiptNo(tx, schoolId)
    const paidAt = new Date(data.paidAt)
    if (Number.isNaN(paidAt.getTime())) throw new Error("INVALID_DATE")

    const created = await tx.feeTransaction.create({
      data: {
        receipt_no: receiptNo,
        school_id: schoolId,
        student_id: studentId,
        recorded_by_user_id: recordedByUserId,
        amount: dec(data.amount),
        method: data.method,
        status: "PENDING_VERIFICATION",
        mode_context: "HYBRID",
        external_txn_ref: data.externalTxnRef,
        proof_url: data.proofUrl,
        notes: data.notes ?? null,
        paid_at: paidAt,
        editable_until: new Date(Date.now() + EDIT_WINDOW_MS),
        allocations: { create: buildAllocationCreate(data.allocations, allocCtx) },
      },
    })

    // Pending — ledger / late-fee status NOT recomputed until verification

    await logFeeAction({
      client: tx,
      schoolId,
      actorUserId: recordedByUserId,
      action: "CREATE_TRANSACTION",
      entityType: "TRANSACTION",
      entityId: created.id,
      newValue: {
        receipt_no: created.receipt_no,
        amount: created.amount.toString(),
        method: created.method,
        status: created.status,
        external_txn_ref: created.external_txn_ref,
      },
    })

    return created
  })

  await invalidateTags(cacheTags.fees(schoolId), cacheTags.feesStudent(studentId))
  return result
}

/**
 * Admin verifies a pending transaction. Guarded against double-verification by
 * a conditional updateMany. Recomputes ledger + monthly-late-fee after status flip.
 */
export async function verifyTransaction(
  schoolId: string,
  actorUserId: string,
  transactionId: string,
  notes?: string | null,
) {
  const verifyResult = await prisma.$transaction(async (tx) => {
    const existing = await tx.feeTransaction.findFirst({
      where: { id: transactionId, school_id: schoolId },
      include: {
        allocations: { select: { ledger_id: true, monthly_late_fee_id: true } },
      },
    })
    if (!existing) throw new Error("TRANSACTION_NOT_FOUND")
    if (existing.status !== "PENDING_VERIFICATION") throw new Error("ALREADY_PROCESSED")

    const result = await tx.feeTransaction.updateMany({
      where: { id: transactionId, status: "PENDING_VERIFICATION" },
      data: {
        status: "VERIFIED",
        verified_by_user_id: actorUserId,
        verified_at: new Date(),
        ...(notes ? { notes: existing.notes ? `${existing.notes}\n${notes}` : notes } : {}),
      },
    })
    if (result.count === 0) throw new Error("ALREADY_PROCESSED")

    await recomputeAllocationTargets(tx, existing.allocations)

    await logFeeAction({
      client: tx,
      schoolId,
      actorUserId,
      action: "VERIFY_TRANSACTION",
      entityType: "TRANSACTION",
      entityId: transactionId,
      previousValue: { status: "PENDING_VERIFICATION" },
      newValue: { status: "VERIFIED" },
      reason: notes ?? null,
    })

    return tx.feeTransaction.findUnique({ where: { id: transactionId } })
  })

  await invalidateTags(cacheTags.fees(schoolId))
  return verifyResult
}

export async function rejectTransaction(
  schoolId: string,
  actorUserId: string,
  transactionId: string,
  data: RejectTransactionInput,
) {
  const txResult = await prisma.$transaction(async (tx) => {
    const existing = await tx.feeTransaction.findFirst({
      where: { id: transactionId, school_id: schoolId },
    })
    if (!existing) throw new Error("TRANSACTION_NOT_FOUND")
    if (existing.status !== "PENDING_VERIFICATION") throw new Error("ALREADY_PROCESSED")

    const result = await tx.feeTransaction.updateMany({
      where: { id: transactionId, status: "PENDING_VERIFICATION" },
      data: {
        status: "REJECTED",
        verified_by_user_id: actorUserId,
        verified_at: new Date(),
        rejection_reason: data.reason,
      },
    })
    if (result.count === 0) throw new Error("ALREADY_PROCESSED")

    await logFeeAction({
      client: tx,
      schoolId,
      actorUserId,
      action: "REJECT_TRANSACTION",
      entityType: "TRANSACTION",
      entityId: transactionId,
      previousValue: { status: "PENDING_VERIFICATION" },
      newValue: { status: "REJECTED" },
      reason: data.reason,
    })

    return tx.feeTransaction.findUnique({ where: { id: transactionId } })
  })

  await invalidateTags(cacheTags.fees(schoolId))
  return txResult
}

export async function editTransaction(
  schoolId: string,
  actor: { userId: string; role: string },
  transactionId: string,
  data: EditTransactionInput,
) {
  const existing = await prisma.feeTransaction.findFirst({
    where: { id: transactionId, school_id: schoolId },
    include: { allocations: true },
  })
  if (!existing) throw new Error("TRANSACTION_NOT_FOUND")
  // Final states: REJECTED/CANCELLED were never collected, REFUNDED was
  // collected then returned. Allowing edits on any of these would let an
  // admin silently rewrite history a parent has already received notice
  // of. (Audit H3.)
  if (
    existing.status === "REJECTED" ||
    existing.status === "CANCELLED" ||
    existing.status === "REFUNDED"
  ) {
    throw new Error("CANNOT_EDIT_FINAL_STATE")
  }

  const isExpired = new Date() > existing.editable_until
  const isSuperAdmin = actor.role === "SUPER_ADMIN"
  if (isExpired && !isSuperAdmin) throw new Error("EDIT_WINDOW_EXPIRED")

  const result = await prisma.$transaction(async (tx) => {
    if (data.externalTxnRef && data.externalTxnRef !== existing.external_txn_ref) {
      await assertNoDuplicateRef(tx, schoolId, data.externalTxnRef, transactionId)
    }
    let allocCtx: ValidatedAllocationContext | null = null
    if (data.allocations) {
      allocCtx = await validateAllocations(tx, schoolId, existing.student_id, data.allocations)
    }

    const previousSnapshot = {
      amount: existing.amount.toString(),
      method: existing.method,
      paid_at: existing.paid_at,
      external_txn_ref: existing.external_txn_ref,
      notes: existing.notes,
      allocations: existing.allocations.map((a) => ({
        ledger_id: a.ledger_id,
        monthly_late_fee_id: a.monthly_late_fee_id,
        amount_applied: a.amount_applied.toString(),
      })),
    }

    const updated = await tx.feeTransaction.update({
      where: { id: transactionId },
      data: {
        amount: data.amount !== undefined ? dec(data.amount) : undefined,
        method: data.method ?? undefined,
        paid_at: data.paidAt ? new Date(data.paidAt) : undefined,
        external_txn_ref: data.externalTxnRef ?? undefined,
        notes: data.notes ?? undefined,
      },
    })

    let affectedAllocations: { ledger_id: string | null; monthly_late_fee_id: string | null }[] =
      existing.allocations.map((a) => ({ ledger_id: a.ledger_id, monthly_late_fee_id: a.monthly_late_fee_id }))

    if (data.allocations && allocCtx) {
      await tx.feePaymentAllocation.deleteMany({ where: { transaction_id: transactionId } })
      const rebuilt = buildAllocationCreate(data.allocations, allocCtx)
      await tx.feePaymentAllocation.createMany({
        data: rebuilt.map((row) => ({ transaction_id: transactionId, ...row })),
      })
      const newTargets = data.allocations.map((a) => ({
        ledger_id: a.ledgerId ?? null,
        monthly_late_fee_id: a.monthlyLateFeeId ?? null,
      }))
      affectedAllocations = [...affectedAllocations, ...newTargets]
    }

    await recomputeAllocationTargets(tx, affectedAllocations)

    await logFeeAction({
      client: tx,
      schoolId,
      actorUserId: actor.userId,
      action: isExpired ? "UNLOCK_TRANSACTION" : "EDIT_TRANSACTION",
      entityType: "TRANSACTION",
      entityId: transactionId,
      previousValue: previousSnapshot,
      newValue: {
        amount: updated.amount.toString(),
        method: updated.method,
        paid_at: updated.paid_at,
        external_txn_ref: updated.external_txn_ref,
        notes: updated.notes,
        allocations: data.allocations ?? null,
      },
      reason: data.reason,
    })

    return updated
  })

  await invalidateTags(cacheTags.fees(schoolId), cacheTags.feesStudent(existing.student_id))
  return result
}

export async function getTransaction(schoolId: string, transactionId: string) {
  return cached(
    cacheKeys.feesTransactions(schoolId, `id:${transactionId}`),
    { ttl: 60, tags: [cacheTags.fees(schoolId)] },
    () => computeGetTransaction(schoolId, transactionId),
  )
}

async function computeGetTransaction(schoolId: string, transactionId: string) {
  return prisma.feeTransaction.findFirst({
    where: { id: transactionId, school_id: schoolId },
    include: {
      student: {
        select: {
          id: true,
          class: true,
          section: true,
          roll_no: true,
          user: { select: { id: true, name: true, username: true } },
        },
      },
      recordedBy: { select: { id: true, name: true, role: true } },
      verifiedBy: { select: { id: true, name: true } },
      allocations: {
        include: {
          ledger: {
            select: {
              id: true,
              head_name_snapshot: true,
              period_label: true,
              expected_amount: true,
              waiver_amount: true,
            },
          },
          monthly_late_fee: {
            select: {
              id: true,
              period_year: true,
              period_month: true,
              amount: true,
              paid: true,
            },
          },
        },
      },
    },
  })
}

export async function listSchoolTransactions(schoolId: string, query: TransactionQuery) {
  return cached(
    cacheKeys.feesTransactions(schoolId, `list:${serializeParams({ ...query })}`),
    { ttl: 60, tags: [cacheTags.fees(schoolId)] },
    () => computeListSchoolTransactions(schoolId, query),
  )
}

async function computeListSchoolTransactions(schoolId: string, query: TransactionQuery) {
  const where: Prisma.FeeTransactionWhereInput = {
    school_id: schoolId,
    ...(query.status ? { status: query.status } : {}),
    ...(query.studentId ? { student_id: query.studentId } : {}),
    ...(query.from || query.to
      ? {
          paid_at: {
            ...(query.from ? { gte: new Date(query.from) } : {}),
            ...(query.to ? { lte: new Date(query.to) } : {}),
          },
        }
      : {}),
    ...(query.search
      ? {
          OR: [
            { receipt_no: { contains: query.search, mode: "insensitive" } },
            { external_txn_ref: { contains: query.search, mode: "insensitive" } },
            {
              student: {
                user: {
                  OR: [
                    { name: { contains: query.search, mode: "insensitive" } },
                    { username: { contains: query.search, mode: "insensitive" } },
                  ],
                },
              },
            },
          ],
        }
      : {}),
  }

  const [items, total] = await Promise.all([
    prisma.feeTransaction.findMany({
      where,
      orderBy: { paid_at: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: {
        student: {
          select: {
            id: true,
            class: true,
            section: true,
            roll_no: true,
            user: { select: { id: true, name: true, username: true } },
          },
        },
        // Period info so the student-side UI can lock Pay Now on any
        // month that already has a PENDING_VERIFICATION transaction.
        allocations: {
          select: {
            ledger: { select: { period_year: true, period_month: true } },
            monthly_late_fee: { select: { period_year: true, period_month: true } },
          },
        },
      },
    }),
    prisma.feeTransaction.count({ where }),
  ])

  return { items, total, page: query.page, pageSize: query.pageSize }
}

export async function listPendingVerifications(
  schoolId: string,
  query: { class?: string; section?: string; page?: number; pageSize?: number } = {},
) {
  return cached(
    cacheKeys.feesPending(schoolId) + `:${serializeParams({ ...query })}`,
    { ttl: 60, tags: [cacheTags.fees(schoolId)] },
    () => computeListPendingVerifications(schoolId, query),
  )
}

async function computeListPendingVerifications(
  schoolId: string,
  query: { class?: string; section?: string; page?: number; pageSize?: number } = {},
) {
  const page = Math.max(1, query.page ?? 1)
  const pageSize = Math.min(500, Math.max(10, query.pageSize ?? 50))

  const where: Prisma.FeeTransactionWhereInput = {
    school_id: schoolId,
    status: "PENDING_VERIFICATION",
    ...(query.class || query.section
      ? {
          student: {
            ...(query.class ? { class: query.class } : {}),
            ...(query.section ? { section: query.section } : {}),
          },
        }
      : {}),
  }

  const [items, total] = await Promise.all([
    prisma.feeTransaction.findMany({
      where,
      orderBy: { created_at: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        student: {
          select: {
            id: true,
            class: true,
            section: true,
            roll_no: true,
            user: { select: { id: true, name: true, username: true } },
          },
        },
        allocations: {
          include: {
            ledger: {
              select: { head_name_snapshot: true, period_label: true },
            },
            monthly_late_fee: {
              select: { period_year: true, period_month: true },
            },
          },
        },
      },
    }),
    prisma.feeTransaction.count({ where }),
  ])

  return { items, total, page, pageSize }
}

export async function countPendingVerifications(schoolId: string): Promise<number> {
  return cached(
    cacheKeys.feesPending(schoolId) + ":count",
    { ttl: 60, tags: [cacheTags.fees(schoolId)] },
    () => computeCountPendingVerifications(schoolId),
  )
}

async function computeCountPendingVerifications(schoolId: string): Promise<number> {
  return prisma.feeTransaction.count({
    where: { school_id: schoolId, status: "PENDING_VERIFICATION" },
  })
}
