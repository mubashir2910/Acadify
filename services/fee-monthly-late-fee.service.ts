import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { logFeeAction } from "./fee-audit.service"
import { findApplicableStructure } from "./fee-structure.service"
import { cached, invalidateTags } from "@/lib/cache"
import { cacheKeys, cacheTags, serializeParams } from "@/lib/cache-keys"

type MonthlyLateFeeOpts = {
  sessionId?: string
  studentId?: string
  class?: string
  section?: string
  actorUserId: string | null
}

/**
 * Idempotently accrues monthly late fees per (student × session × period_year × period_month).
 * Policy source: SchoolPaymentConfig.default_late_fee_* (per-head late-fee fields no longer exist).
 *
 * Rules (matching real-world admin expectations):
 *  - Late fee accrues at the school's grace day each month, once per month (MONTHLY) /
 *    once per day (DAILY) / single one-shot (ONE_TIME).
 *  - When a structure's `effective_from` is AFTER the month's grace day, the first
 *    accrual is skipped (you can't penalise a parent for a month the fee structure
 *    didn't exist yet). The very first late-fee unit then accrues at the NEXT
 *    month's grace day.
 *  - Calendar months are used, not 30-day windows, so a row whose grace ended on
 *    April 5 has accrued exactly 1 period by May 31 (not 2).
 */
export async function accrueMonthlyLateFees(schoolId: string, opts: MonthlyLateFeeOpts) {
  const config = await prisma.schoolPaymentConfig.findUnique({
    where: { school_id: schoolId },
    select: {
      default_late_fee_enabled: true,
      default_late_fee_type: true,
      default_late_fee_value: true,
      default_late_fee_grace_day_of_month: true,
      default_late_fee_frequency: true,
    },
  })
  if (
    !config ||
    !config.default_late_fee_enabled ||
    !config.default_late_fee_type ||
    config.default_late_fee_value == null ||
    !config.default_late_fee_grace_day_of_month
  ) {
    return { updated: 0, totalAdded: "0.00" }
  }

  const graceDay = config.default_late_fee_grace_day_of_month
  const accrual = config.default_late_fee_frequency ?? "MONTHLY"
  // INVARIANT (Audit H4): all date math in this service compares UTC
  // timestamps. `new Date()` is a ms-since-epoch (UTC) under the hood —
  // safe to compare against `Date.UTC(...)`-built dates from
  // computeFirstAccrualDate. NEVER use local-time getters (`getDate()`,
  // `getMonth()`, `getFullYear()`) here without the `getUTC*` suffix, or
  // the grace-day boundary will skew by the server's offset.
  const now = new Date()

  const candidates = await prisma.studentFeeLedger.findMany({
    where: {
      school_id: schoolId,
      ...(opts.sessionId ? { session_id: opts.sessionId } : {}),
      ...(opts.studentId ? { student_id: opts.studentId } : {}),
      status: { in: ["PENDING", "PARTIAL", "OVERDUE"] },
      period_month: { not: null },
      ...(opts.class || opts.section
        ? {
            student: {
              ...(opts.class ? { class: opts.class } : {}),
              ...(opts.section ? { section: opts.section } : {}),
            },
          }
        : {}),
    },
    select: {
      student_id: true,
      session_id: true,
      period_year: true,
      period_month: true,
      expected_amount: true,
      waiver_amount: true,
      paid_amount: true,
      student: { select: { class: true, section: true } },
    },
  })

  if (candidates.length === 0) return { updated: 0, totalAdded: "0.00" }

  // Group by (student_id, session_id, year, month) and remember class/section for structure lookup
  type Group = {
    student_id: string
    session_id: string
    student_class: string
    student_section: string
    year: number
    month: number
    outstanding: Prisma.Decimal
  }
  const groups = new Map<string, Group>()
  for (const row of candidates) {
    if (row.period_month == null) continue
    const key = `${row.student_id}|${row.session_id}|${row.period_year}|${row.period_month}`
    const rowOutstanding = new Prisma.Decimal(row.expected_amount)
      .minus(row.waiver_amount)
      .minus(row.paid_amount)
    const positive = rowOutstanding.gt(0) ? rowOutstanding : new Prisma.Decimal(0)
    const existing = groups.get(key)
    if (existing) {
      existing.outstanding = existing.outstanding.add(positive)
    } else {
      groups.set(key, {
        student_id: row.student_id,
        session_id: row.session_id,
        student_class: row.student.class,
        student_section: row.student.section,
        year: row.period_year,
        month: row.period_month,
        outstanding: positive,
      })
    }
  }

  // Cache structure lookups per (session, class, section)
  const structureCache = new Map<string, Date | null>()
  async function effectiveFromFor(sessionId: string, klass: string, section: string): Promise<Date | null> {
    const key = `${sessionId}|${klass}|${section}`
    if (structureCache.has(key)) return structureCache.get(key) ?? null
    const structure = await findApplicableStructure(schoolId, sessionId, klass, section)
    const eff = structure?.effective_from ?? null
    structureCache.set(key, eff)
    return eff
  }

  let updated = 0
  let totalAdded = new Prisma.Decimal(0)

  for (const g of groups.values()) {
    if (g.outstanding.lte(0)) continue

    const effectiveFrom = await effectiveFromFor(g.session_id, g.student_class, g.student_section)
    const firstAccrualDate = computeFirstAccrualDate(g.year, g.month, graceDay, effectiveFrom)
    const unitsElapsed = computeUnitsElapsed(firstAccrualDate, now, accrual, graceDay)
    if (unitsElapsed <= 0) continue

    const existing = await prisma.studentMonthlyLateFee.findUnique({
      where: {
        student_id_session_id_period_year_period_month: {
          student_id: g.student_id,
          session_id: g.session_id,
          period_year: g.year,
          period_month: g.month,
        },
      },
    })

    const previousPeriods = existing?.periods_accrued ?? 0
    const newPeriods = unitsElapsed - previousPeriods
    if (newPeriods <= 0) continue

    const perUnit =
      config.default_late_fee_type === "FIXED"
        ? new Prisma.Decimal(config.default_late_fee_value)
        : g.outstanding.mul(new Prisma.Decimal(config.default_late_fee_value)).div(100)

    const delta = perUnit.mul(newPeriods)
    if (delta.lte(0)) continue

    const previousAmount = existing ? new Prisma.Decimal(existing.amount) : new Prisma.Decimal(0)
    const nextAmount = previousAmount.add(delta)

    await prisma.$transaction(async (tx) => {
      const upserted = await tx.studentMonthlyLateFee.upsert({
        where: {
          student_id_session_id_period_year_period_month: {
            student_id: g.student_id,
            session_id: g.session_id,
            period_year: g.year,
            period_month: g.month,
          },
        },
        update: {
          amount: nextAmount,
          periods_accrued: unitsElapsed,
          last_accrued_at: now,
        },
        create: {
          school_id: schoolId,
          session_id: g.session_id,
          student_id: g.student_id,
          period_year: g.year,
          period_month: g.month,
          amount: delta,
          periods_accrued: unitsElapsed,
          last_accrued_at: now,
        },
      })

      if (opts.actorUserId) {
        await logFeeAction({
          client: tx,
          schoolId,
          actorUserId: opts.actorUserId,
          action: "ACCRUE_MONTHLY_LATE_FEE",
          entityType: "MONTHLY_LATE_FEE",
          entityId: upserted.id,
          previousValue: { amount: previousAmount.toString(), periods_accrued: previousPeriods },
          newValue: {
            amount: nextAmount.toString(),
            periods_accrued: unitsElapsed,
            delta: delta.toString(),
          },
        })
      }
    })

    updated += 1
    totalAdded = totalAdded.add(delta)
  }

  // Only bust fee caches when accrual actually wrote new late-fee rows — a no-op
  // accrual (the common case, called from within cached ledger reads) must not
  // thrash the cache.
  if (updated > 0) {
    await invalidateTags(cacheTags.fees(schoolId))
  }

  return { updated, totalAdded: totalAdded.toFixed(2) }
}

/**
 * Returns the date at which the FIRST late-fee unit accrues for a given month-block.
 *  - Normal case: the month's own grace day (e.g. April → April 5 with grace=5)
 *  - Structure effective AFTER that grace → push to NEXT month's grace day
 *    (you can't penalise a parent for a month the structure didn't exist for)
 */
function computeFirstAccrualDate(
  year: number,
  month: number, // 1-12
  graceDay: number,
  structureEffectiveFrom: Date | null,
): Date {
  const monthGrace = utcDateClamped(year, month, graceDay)
  if (!structureEffectiveFrom) return monthGrace
  if (structureEffectiveFrom <= monthGrace) return monthGrace
  // Effective AFTER this month's grace → first accrual moves to next month's grace
  const nextYear = month === 12 ? year + 1 : year
  const nextMonth = month === 12 ? 1 : month + 1
  return utcDateClamped(nextYear, nextMonth, graceDay)
}

function utcDateClamped(year: number, month1to12: number, day: number): Date {
  const lastDay = new Date(Date.UTC(year, month1to12, 0)).getUTCDate()
  const clamped = Math.min(day, lastDay)
  return new Date(Date.UTC(year, month1to12 - 1, clamped, 0, 0, 0, 0))
}

function computeUnitsElapsed(
  firstAccrualDate: Date,
  now: Date,
  accrual: "MONTHLY" | "DAILY" | "ONE_TIME",
  graceDay: number,
): number {
  if (now <= firstAccrualDate) return 0
  if (accrual === "ONE_TIME") return 1
  if (accrual === "DAILY") {
    const days = Math.floor((now.getTime() - firstAccrualDate.getTime()) / 86_400_000)
    return Math.max(1, days)
  }
  // MONTHLY: how many full calendar-month grace cycles have elapsed since firstAccrualDate
  // Period 1 starts the moment now > firstAccrualDate.
  // Period 2 starts at firstAccrualDate + 1 calendar month (same grace day in the next month).
  return 1 + calendarMonthsElapsed(firstAccrualDate, now, graceDay)
}

function calendarMonthsElapsed(from: Date, to: Date, graceDay: number): number {
  if (to <= from) return 0
  const fromY = from.getUTCFullYear()
  const fromM = from.getUTCMonth()
  const toY = to.getUTCFullYear()
  const toM = to.getUTCMonth()
  const toD = to.getUTCDate()
  let months = (toY - fromY) * 12 + (toM - fromM)
  if (toD < graceDay) months -= 1
  return Math.max(0, months)
}

export async function waiveMonthlyLateFee(
  schoolId: string,
  actorUserId: string,
  monthlyLateFeeId: string,
  input: { type: "AMOUNT" | "PERCENT"; value: number; reason: string },
) {
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.studentMonthlyLateFee.findFirst({
      where: { id: monthlyLateFeeId, school_id: schoolId },
    })
    if (!existing) throw new Error("MONTHLY_LATE_FEE_NOT_FOUND")

    const amount = new Prisma.Decimal(existing.amount)
    const paid = new Prisma.Decimal(existing.paid)
    const alreadyWaived = new Prisma.Decimal(existing.waiver_amount)
    // "remaining" = what's still eligible to be waived. Subtracts both paid
    // (can't waive what's already collected) and prior waivers (so a second
    // ₹15 waive on a ₹100 row only consumes from the un-waived remaining 85).
    const remaining = amount.minus(paid).minus(alreadyWaived)

    // Compute requested waiver, clamp to remaining unwaived/unpaid portion.
    const requested =
      input.type === "AMOUNT"
        ? new Prisma.Decimal(input.value)
        : amount.mul(new Prisma.Decimal(input.value)).div(100)
    const incremental = requested.gt(remaining) ? remaining : requested
    if (incremental.lte(0)) {
      throw new Error("LATE_FEE_NOTHING_TO_WAIVE")
    }
    // Accumulate the incremental waiver into the row's running total so
    // multiple waives (₹15 + ₹15 = ₹30) stack like the user expects.
    const newWaiverTotal = alreadyWaived.add(incremental)
    const fullyWaived = newWaiverTotal.gte(amount.minus(paid))

    // Stack each waive's reason on its own line so the breakdown modal can
    // surface "ggg\nWRT" instead of overwriting the first reason.
    const trimmedReason = input.reason.trim()
    const stackedReason = existing.waiver_reason
      ? trimmedReason
        ? `${existing.waiver_reason}\n${trimmedReason}`
        : existing.waiver_reason
      : trimmedReason || null

    const updated = await tx.studentMonthlyLateFee.update({
      where: { id: monthlyLateFeeId },
      data: {
        waiver_amount: newWaiverTotal,
        // type + value reflect the MOST RECENT waive operation; full history
        // (with per-event reason) lives in the audit log.
        waiver_type: input.type,
        waiver_value: new Prisma.Decimal(input.value),
        waived: fullyWaived,
        waiver_reason: stackedReason,
        waived_by: actorUserId,
        waived_at: new Date(),
      },
    })

    await logFeeAction({
      client: tx,
      schoolId,
      actorUserId,
      action: "WAIVE_MONTHLY_LATE_FEE",
      entityType: "MONTHLY_LATE_FEE",
      entityId: monthlyLateFeeId,
      reason: input.reason,
      previousValue: {
        amount: existing.amount.toString(),
        paid: existing.paid.toString(),
        waiver_amount: existing.waiver_amount.toString(),
        waived: existing.waived,
      },
      newValue: {
        amount: updated.amount.toString(),
        paid: updated.paid.toString(),
        waiver_amount: updated.waiver_amount.toString(),
        type: input.type,
        value: input.value,
        increment: incremental.toString(),
        waived: updated.waived,
      },
    })

    return updated
  })

  await invalidateTags(cacheTags.fees(schoolId), cacheTags.feesStudent(result.student_id))
  return result
}

/**
 * Recomputes `paid` for a monthly late fee row from verified allocations.
 */
export async function recomputeMonthlyLateFeeStatus(
  client: Prisma.TransactionClient | typeof prisma,
  monthlyLateFeeId: string,
) {
  const row = await client.studentMonthlyLateFee.findUnique({ where: { id: monthlyLateFeeId } })
  if (!row) return

  const verifiedAlloc = await client.feePaymentAllocation.findMany({
    where: {
      monthly_late_fee_id: monthlyLateFeeId,
      transaction: { status: "VERIFIED" },
    },
    select: { amount_applied: true },
  })
  const paid = verifiedAlloc.reduce((sum, a) => sum.add(a.amount_applied), new Prisma.Decimal(0))
  // Store the actual sum of verified allocations — never clamp. (Audit H1.)
  // `validateAllocations` rejects over-allocations at insert time; if one
  // still leaks through (race, post-allocation waiver) it must be visible
  // in `paid` rather than silently truncated, so SUM(allocations) =
  // monthly_late_fee.paid invariant holds for reconciliation.
  await client.studentMonthlyLateFee.update({
    where: { id: monthlyLateFeeId },
    data: { paid },
  })
}

export async function getStudentMonthlyLateFees(
  schoolId: string,
  studentId: string,
  sessionId?: string,
) {
  return cached(
    cacheKeys.feesMonthlyBlocks(schoolId, `late-fees:${studentId}:${serializeParams({ sessionId })}`),
    { ttl: 60, tags: [cacheTags.fees(schoolId), cacheTags.feesStudent(studentId)] },
    () =>
      prisma.studentMonthlyLateFee.findMany({
        where: {
          school_id: schoolId,
          student_id: studentId,
          ...(sessionId ? { session_id: sessionId } : {}),
        },
        orderBy: [{ period_year: "asc" }, { period_month: "asc" }],
      })
  )
}
