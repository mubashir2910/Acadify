import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import type { CreateFeeWaiverInput, RevokeFeeWaiverInput } from "@/schemas/fee-waiver.schema"
import { logFeeAction } from "./fee-audit.service"
import { assertSessionBelongsToSchool } from "./session.service"
import { cached, invalidateTags } from "@/lib/cache"
import { cacheKeys, cacheTags, serializeParams } from "@/lib/cache-keys"

export async function grantWaiver(
  schoolId: string,
  actorUserId: string,
  data: CreateFeeWaiverInput,
) {
  await assertSessionBelongsToSchool(schoolId, data.sessionId)

  // Make sure student belongs to school
  const student = await prisma.student.findFirst({
    where: { id: data.studentId, school_id: schoolId },
    select: { id: true },
  })
  if (!student) throw new Error("STUDENT_NOT_FOUND")

  // Confirm feeHead belongs to the same (school, session)
  const head = await prisma.feeHead.findFirst({
    where: {
      id: data.feeHeadId,
      structure: { school_id: schoolId, session_id: data.sessionId },
    },
    select: { id: true },
  })
  if (!head) throw new Error("FEE_HEAD_NOT_FOUND")

  // Confirm a matching ledger row exists for this exact (student, head, period).
  // A waiver targeting a row that was never generated would be a no-op and
  // mask a real data problem from the admin.
  const ledger = await prisma.studentFeeLedger.findFirst({
    where: {
      school_id: schoolId,
      student_id: data.studentId,
      session_id: data.sessionId,
      fee_head_id: data.feeHeadId,
      period_year: data.periodYear,
      period_month: data.periodMonth,
    },
    select: { id: true },
  })
  if (!ledger) throw new Error("WAIVER_LEDGER_NOT_FOUND")

  // Multiple waivers for the same (head, period) are allowed. Each call
  // creates a new StudentFeeWaiver row; recomputeWaiverAmountsForStudent
  // sums every non-revoked row when recalculating the ledger's waiver_amount.
  const created = await prisma.$transaction(async (tx) => {
    // M4: cap active waivers per scope. Without a ceiling, an admin can
    // (accidentally or maliciously) stack hundreds of waiver rows, ballooning
    // the O(W) recompute loop and the audit-log noise per ledger. Ten is a
    // generous human ceiling — if a school genuinely needs more, they can
    // revoke older ones first.
    const MAX_ACTIVE_WAIVERS_PER_SCOPE = 10
    const activeCount = await tx.studentFeeWaiver.count({
      where: {
        school_id: schoolId,
        student_id: data.studentId,
        session_id: data.sessionId,
        fee_head_id: data.feeHeadId,
        period_year: data.periodYear,
        period_month: data.periodMonth,
        revoked_at: null,
      },
    })
    if (activeCount >= MAX_ACTIVE_WAIVERS_PER_SCOPE) {
      throw new Error("WAIVER_LIMIT_REACHED")
    }

    const created = await tx.studentFeeWaiver.create({
      data: {
        school_id: schoolId,
        student_id: data.studentId,
        session_id: data.sessionId,
        fee_head_id: data.feeHeadId,
        period_year: data.periodYear,
        period_month: data.periodMonth,
        type: data.type,
        value: new Prisma.Decimal(data.value.toFixed(2)),
        reason: data.reason,
        granted_by: actorUserId,
      },
    })

    await logFeeAction({
      client: tx,
      schoolId,
      actorUserId,
      action: "CREATE_WAIVER",
      entityType: "WAIVER",
      entityId: created.id,
      newValue: {
        studentId: data.studentId,
        feeHeadId: data.feeHeadId,
        periodYear: data.periodYear,
        periodMonth: data.periodMonth,
        type: data.type,
        value: data.value,
        reason: data.reason,
      },
    })

    await recomputeWaiverAmountsForStudent(tx, schoolId, data.studentId, data.sessionId)

    return created
  })

  await invalidateTags(cacheTags.fees(schoolId), cacheTags.feesStudent(data.studentId))
  return created
}

export async function revokeWaiver(
  schoolId: string,
  actorUserId: string,
  waiverId: string,
  data: RevokeFeeWaiverInput,
) {
  const waiver = await prisma.studentFeeWaiver.findFirst({
    where: { id: waiverId, school_id: schoolId },
  })
  if (!waiver) throw new Error("WAIVER_NOT_FOUND")
  if (waiver.revoked_at) throw new Error("WAIVER_ALREADY_REVOKED")

  const updated = await prisma.$transaction(async (tx) => {
    const updated = await tx.studentFeeWaiver.update({
      where: { id: waiverId },
      data: { revoked_at: new Date(), revoked_by: actorUserId },
    })

    await logFeeAction({
      client: tx,
      schoolId,
      actorUserId,
      action: "REMOVE_WAIVER",
      entityType: "WAIVER",
      entityId: waiverId,
      previousValue: { revoked_at: null },
      newValue: { revoked_at: updated.revoked_at, reason: data.reason },
      reason: data.reason,
    })

    await recomputeWaiverAmountsForStudent(
      tx,
      schoolId,
      waiver.student_id,
      waiver.session_id,
    )

    return updated
  })

  await invalidateTags(cacheTags.fees(schoolId), cacheTags.feesStudent(waiver.student_id))
  return updated
}

export async function getStudentWaivers(schoolId: string, studentId: string, sessionId?: string) {
  return cached(
    cacheKeys.feesWaivers(schoolId, `student:${studentId}:${serializeParams({ sessionId })}`),
    { ttl: 60, tags: [cacheTags.fees(schoolId), cacheTags.feesStudent(studentId)] },
    () =>
      prisma.studentFeeWaiver.findMany({
        where: {
          school_id: schoolId,
          student_id: studentId,
          ...(sessionId ? { session_id: sessionId } : {}),
        },
        orderBy: { granted_at: "desc" },
        include: {
          fee_head: { select: { id: true, name: true } },
        },
      })
  )
}

/**
 * Walks every applicable ledger row for the student in the session and
 * recomputes its waiver_amount based on active (non-revoked) waivers.
 * Called whenever waivers change. Never alters paid_amount.
 */
export async function recomputeWaiverAmountsForStudent(
  client: Prisma.TransactionClient | typeof prisma,
  schoolId: string,
  studentId: string,
  sessionId: string,
) {
  const c = client
  const activeWaivers = await c.studentFeeWaiver.findMany({
    where: {
      school_id: schoolId,
      student_id: studentId,
      session_id: sessionId,
      revoked_at: null,
    },
  })

  const ledgers = await c.studentFeeLedger.findMany({
    where: {
      school_id: schoolId,
      student_id: studentId,
      session_id: sessionId,
      status: { in: ["PENDING", "PARTIAL", "OVERDUE", "WAIVED"] },
    },
  })

  const HUNDRED = new Prisma.Decimal(100)
  for (const ledger of ledgers) {
    // Stay in Prisma.Decimal end-to-end. Float math here caused
    // `(33.33/100)*3000 = 999.9000000000001` precision drift that compounded
    // across multi-waiver stacks. (Audit C4.)
    const expected = new Prisma.Decimal(ledger.expected_amount)
    let waiver = new Prisma.Decimal(0)
    for (const w of activeWaivers) {
      // Waivers are now scoped to (student + session + fee_head + period).
      // Apply only when ALL of those match the ledger row being recomputed.
      if (w.fee_head_id !== ledger.fee_head_id) continue
      if (
        w.period_year !== ledger.period_year ||
        w.period_month !== ledger.period_month
      ) {
        continue
      }
      const value = new Prisma.Decimal(w.value)
      if (w.type === "PERCENT") {
        waiver = waiver.add(value.mul(expected).div(HUNDRED))
      } else {
        waiver = waiver.add(value)
      }
    }
    if (waiver.gt(expected)) waiver = expected
    // Single rounding pass at the end keeps paise-level integrity.
    const newWaiver = new Prisma.Decimal(waiver.toFixed(2))

    if (!newWaiver.equals(ledger.waiver_amount)) {
      const paid = new Prisma.Decimal(ledger.paid_amount)
      const due = expected.minus(newWaiver)
      let nextStatus = ledger.status
      if (due.lte(0)) {
        nextStatus = "WAIVED"
      } else if (paid.gte(due)) {
        nextStatus = "PAID"
      } else if (paid.gt(0)) {
        nextStatus = "PARTIAL"
      } else if (ledger.grace_end_date && new Date(ledger.grace_end_date) < new Date()) {
        nextStatus = "OVERDUE"
      } else {
        nextStatus = "PENDING"
      }

      await c.studentFeeLedger.update({
        where: { id: ledger.id },
        data: { waiver_amount: newWaiver, status: nextStatus },
      })
    }
  }
}
