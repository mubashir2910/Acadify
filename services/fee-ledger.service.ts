import { Prisma, type FeeCategory, type FeeFrequency } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import type { GenerateLedgerInput, LedgerQuery } from "@/schemas/fee-ledger.schema"
import { logFeeAction } from "./fee-audit.service"
import { assertSessionBelongsToSchool } from "./session.service"
import { findApplicableStructure } from "./fee-structure.service"
import { recomputeWaiverAmountsForStudent } from "./fee-waiver.service"
import { accrueMonthlyLateFees } from "./fee-monthly-late-fee.service"
import { cached, invalidateTags } from "@/lib/cache"
import { cacheKeys, cacheTags, serializeParams } from "@/lib/cache-keys"

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

function utcDate(year: number, month1to12: number, day: number): Date {
  return new Date(Date.UTC(year, month1to12 - 1, day, 0, 0, 0, 0))
}

function clampDay(year: number, month1to12: number, day: number): number {
  const lastDay = new Date(Date.UTC(year, month1to12, 0)).getUTCDate()
  return Math.min(day, lastDay)
}

type GeneratedPeriod = {
  year: number
  month: number | null
  label: string
  dueDate: Date
  graceEndDate: Date | null
}

type HeadForPeriodExpansion = {
  frequency: FeeFrequency
  due_day_of_month: number | null
  due_month: number | null
  applied_months?: Array<{ period_year: number; period_month: number; due_day: number | null }>
}

function periodsForHead(
  head: HeadForPeriodExpansion,
  schoolGraceDay: number | null,
  sessionStart: Date,
  sessionEnd: Date,
): GeneratedPeriod[] {
  const out: GeneratedPeriod[] = []

  const resolveGrace = (year: number, month: number, dueDay: number): Date | null => {
    if (!schoolGraceDay) return null
    const day = clampDay(year, month, Math.max(dueDay, schoolGraceDay))
    return utcDate(year, month, day)
  }

  // 1. Explicit per-month applicability takes precedence over frequency-based expansion
  if (head.applied_months && head.applied_months.length > 0) {
    for (const am of head.applied_months) {
      const day = clampDay(am.period_year, am.period_month, am.due_day ?? head.due_day_of_month ?? 1)
      out.push({
        year: am.period_year,
        month: am.period_month,
        label: `${MONTH_LABELS[am.period_month - 1]} ${am.period_year}`,
        dueDate: utcDate(am.period_year, am.period_month, day),
        graceEndDate: resolveGrace(am.period_year, am.period_month, day),
      })
    }
    return out
  }

  // 2. Frequency-based fallback (legacy structures without explicit applied_months)
  const startY = sessionStart.getUTCFullYear()
  const startM = sessionStart.getUTCMonth() + 1
  const endY = sessionEnd.getUTCFullYear()
  const endM = sessionEnd.getUTCMonth() + 1

  if (head.frequency === "MONTHLY") {
    const dueDay = head.due_day_of_month ?? 1
    let y = startY
    let m = startM
    while (y < endY || (y === endY && m <= endM)) {
      const day = clampDay(y, m, dueDay)
      out.push({
        year: y,
        month: m,
        label: `${MONTH_LABELS[m - 1]} ${y}`,
        dueDate: utcDate(y, m, day),
        graceEndDate: resolveGrace(y, m, day),
      })
      m += 1
      if (m > 12) {
        m = 1
        y += 1
      }
    }
  } else if (head.frequency === "QUARTERLY") {
    // Q1=Apr, Q2=Jul, Q3=Oct, Q4=Jan (Indian academic year aligned)
    const monthsInQuarters = [4, 7, 10, 1]
    const dueDay = head.due_day_of_month ?? 5
    for (const qm of monthsInQuarters) {
      const y = qm === 1 ? startY + 1 : startY
      const sessionContainsDate = utcDate(y, qm, 1) >= sessionStart && utcDate(y, qm, 1) <= sessionEnd
      if (!sessionContainsDate) continue
      const day = clampDay(y, qm, dueDay)
      out.push({
        year: y,
        month: qm,
        label: `Q${monthsInQuarters.indexOf(qm) + 1} ${y}`,
        dueDate: utcDate(y, qm, day),
        graceEndDate: resolveGrace(y, qm, day),
      })
    }
  } else if (head.frequency === "HALF_YEARLY") {
    const monthsInHalves = [head.due_month ?? 4, ((head.due_month ?? 4) + 5) % 12 + 1]
    const dueDay = head.due_day_of_month ?? 5
    for (let i = 0; i < monthsInHalves.length; i++) {
      const m = monthsInHalves[i]
      const y = i === 0 ? startY : startY + (m < monthsInHalves[0] ? 1 : 0)
      const date = utcDate(y, m, 1)
      if (date < sessionStart || date > sessionEnd) continue
      const day = clampDay(y, m, dueDay)
      out.push({
        year: y,
        month: m,
        label: `H${i + 1} ${y}`,
        dueDate: utcDate(y, m, day),
        graceEndDate: resolveGrace(y, m, day),
      })
    }
  } else if (head.frequency === "ANNUAL") {
    const m = head.due_month ?? 4
    const dueDay = head.due_day_of_month ?? 5
    const y = startY
    const day = clampDay(y, m, dueDay)
    out.push({
      year: y,
      month: m,
      label: `Annual ${y}`,
      dueDate: utcDate(y, m, day),
      graceEndDate: resolveGrace(y, m, day),
    })
  }

  return out
}

/**
 * Idempotent ledger generator. Creates rows for every (active student × applicable fee head × period)
 * that don't already exist. Safe to call repeatedly.
 */
export async function generateLedgerForSession(
  schoolId: string,
  actorUserId: string,
  data: GenerateLedgerInput,
) {
  const session = await assertSessionBelongsToSchool(schoolId, data.sessionId)
  const paymentConfig = await prisma.schoolPaymentConfig.findUnique({
    where: { school_id: schoolId },
  })
  const schoolGraceDay = paymentConfig?.default_late_fee_grace_day_of_month ?? null

  const students = await prisma.student.findMany({
    where: {
      school_id: schoolId,
      status: "ACTIVE",
      ...(data.class ? { class: data.class } : {}),
      ...(data.section ? { section: data.section } : {}),
    },
    select: { id: true, class: true, section: true },
  })

  let createdCount = 0
  let skippedAlreadyExists = 0
  const skippedStudents: Array<{ studentId: string; class: string; section: string; reason: string }> = []
  // Track unique (class, section) combos that had no matching structure
  const missingStructureCombos = new Set<string>()

  for (const student of students) {
    const structure = await findApplicableStructure(
      schoolId,
      data.sessionId,
      student.class,
      student.section,
    )
    if (!structure) {
      missingStructureCombos.add(`${student.class}/${student.section}`)
      skippedStudents.push({
        studentId: student.id,
        class: student.class,
        section: student.section,
        reason: "NO_STRUCTURE",
      })
      continue
    }
    if (structure.fee_heads.length === 0) {
      skippedStudents.push({
        studentId: student.id,
        class: student.class,
        section: student.section,
        reason: "STRUCTURE_HAS_NO_HEADS",
      })
      continue
    }

    let studentRowsCreated = 0
    for (const head of structure.fee_heads) {
      const periods = periodsForHead(
        {
          frequency: head.frequency,
          due_day_of_month: head.due_day_of_month,
          due_month: head.due_month,
          applied_months: head.applied_months,
        },
        schoolGraceDay,
        session.start_date,
        session.end_date,
      )

      for (const period of periods) {
        try {
          await prisma.studentFeeLedger.create({
            data: {
              school_id: schoolId,
              session_id: data.sessionId,
              student_id: student.id,
              fee_head_id: head.id,
              head_name_snapshot: head.name,
              head_category: head.category as FeeCategory,
              period_year: period.year,
              period_month: period.month,
              period_label: period.label,
              expected_amount: head.amount,
              due_date: period.dueDate,
              grace_end_date: period.graceEndDate,
              structure_version: structure.version,
            },
          })
          createdCount += 1
          studentRowsCreated += 1
        } catch (err) {
          if (
            err instanceof Prisma.PrismaClientKnownRequestError &&
            err.code === "P2002"
          ) {
            // Idempotent — row already exists
            skippedAlreadyExists += 1
            continue
          }
          throw err
        }
      }
    }

    if (studentRowsCreated === 0 && structure.fee_heads.length > 0) {
      // Structure had heads but generated zero periods — likely empty applied_months /
      // due dates outside the session range.
      skippedStudents.push({
        studentId: student.id,
        class: student.class,
        section: student.section,
        reason: "NO_PERIODS_GENERATED",
      })
    }

    // Apply any existing waivers to the rows we just created (or fixes drift)
    await recomputeWaiverAmountsForStudent(prisma, schoolId, student.id, data.sessionId)
  }

  await logFeeAction({
    schoolId,
    actorUserId,
    action: "CREATE_LEDGER",
    entityType: "LEDGER",
    entityId: data.sessionId,
    newValue: {
      sessionId: data.sessionId,
      createdCount,
      skippedAlreadyExists,
      skippedStudents: skippedStudents.length,
    },
  })

  await invalidateTags(cacheTags.fees(schoolId))

  return {
    createdCount,
    skippedAlreadyExists,
    studentsProcessed: students.length,
    skippedStudents: skippedStudents.length,
    // Helpful when generate returns 0: tells the admin which class/section had no structure.
    missingStructureFor: Array.from(missingStructureCombos),
    diagnostics: skippedStudents.slice(0, 20), // cap so the response isn't huge
  }
}

/**
 * Student-scoped read. Calls monthly-late-fee accrual first so numbers are always fresh.
 */
export async function getStudentLedger(
  schoolId: string,
  studentId: string,
  sessionId?: string,
) {
  return cached(
    cacheKeys.feesStudentLedger(studentId, serializeParams({ sessionId })),
    { ttl: 60, tags: [cacheTags.fees(schoolId), cacheTags.feesStudent(studentId)] },
    async () => {
      await accrueMonthlyLateFees(schoolId, {
        studentId,
        sessionId,
        actorUserId: null,
      })

      return prisma.studentFeeLedger.findMany({
        where: {
          school_id: schoolId,
          student_id: studentId,
          ...(sessionId ? { session_id: sessionId } : {}),
        },
        orderBy: [{ due_date: "asc" }, { head_name_snapshot: "asc" }],
        include: {
          session: { select: { id: true, name: true, is_current: true } },
        },
      })
    }
  )
}

export async function getClassLedger(schoolId: string, query: LedgerQuery) {
  return cached(
    cacheKeys.feesLedger(schoolId, serializeParams({ ...query })),
    { ttl: 60, tags: [cacheTags.fees(schoolId)] },
    () => computeClassLedger(schoolId, query),
  )
}

async function computeClassLedger(schoolId: string, query: LedgerQuery) {
  const sessionId = query.sessionId
  await accrueMonthlyLateFees(schoolId, {
    sessionId,
    class: query.class,
    section: query.section,
    actorUserId: null,
  })

  const where: Prisma.StudentFeeLedgerWhereInput = {
    school_id: schoolId,
    ...(sessionId ? { session_id: sessionId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.month ? { period_month: query.month } : {}),
    ...(query.year ? { period_year: query.year } : {}),
    ...(query.studentId ? { student_id: query.studentId } : {}),
    student: {
      ...(query.class ? { class: query.class } : {}),
      ...(query.section ? { section: query.section } : {}),
      ...(query.search
        ? {
            user: {
              OR: [
                { name: { contains: query.search, mode: "insensitive" } },
                { username: { contains: query.search, mode: "insensitive" } },
              ],
            },
          }
        : {}),
    },
  }

  const [items, total] = await Promise.all([
    prisma.studentFeeLedger.findMany({
      where,
      orderBy: [{ due_date: "asc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: {
        student: {
          select: {
            id: true,
            admission_no: true,
            roll_no: true,
            class: true,
            section: true,
            user: { select: { id: true, name: true, username: true } },
          },
        },
        session: { select: { id: true, name: true } },
      },
    }),
    prisma.studentFeeLedger.count({ where }),
  ])

  return { items, total, page: query.page, pageSize: query.pageSize }
}

export async function getLedgerById(schoolId: string, ledgerId: string) {
  return cached(
    cacheKeys.feesLedger(schoolId, `id:${ledgerId}`),
    { ttl: 60, tags: [cacheTags.fees(schoolId)] },
    () => computeLedgerById(schoolId, ledgerId),
  )
}

async function computeLedgerById(schoolId: string, ledgerId: string) {
  return prisma.studentFeeLedger.findFirst({
    where: { id: ledgerId, school_id: schoolId },
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
      session: true,
      allocations: {
        include: {
          transaction: {
            select: {
              id: true,
              receipt_no: true,
              amount: true,
              method: true,
              status: true,
              paid_at: true,
            },
          },
        },
      },
    },
  })
}

/**
 * Recomputes paid_amount + status for a ledger row from current allocations.
 * Late fee is no longer tracked here — it's per-month at the StudentMonthlyLateFee level.
 */
export async function recomputeLedgerStatus(
  client: Prisma.TransactionClient | typeof prisma,
  ledgerId: string,
) {
  const ledger = await client.studentFeeLedger.findUnique({ where: { id: ledgerId } })
  if (!ledger) return

  const verifiedAlloc = await client.feePaymentAllocation.findMany({
    where: {
      ledger_id: ledgerId,
      transaction: { status: "VERIFIED" },
    },
    select: { amount_applied: true },
  })

  const paid = verifiedAlloc.reduce((sum, a) => sum.add(a.amount_applied), new Prisma.Decimal(0))
  const expected = new Prisma.Decimal(ledger.expected_amount)
  const waiver = new Prisma.Decimal(ledger.waiver_amount)
  const baseDue = expected.minus(waiver)

  let status: Prisma.StudentFeeLedgerUpdateInput["status"]
  if (expected.gt(0) && waiver.gte(expected)) {
    status = "WAIVED"
  } else if (paid.gte(baseDue)) {
    status = "PAID"
  } else if (paid.gt(0)) {
    status = "PARTIAL"
  } else if (ledger.grace_end_date && new Date(ledger.grace_end_date) < new Date()) {
    status = "OVERDUE"
  } else {
    status = "PENDING"
  }

  // Store the actual sum of verified allocations — never clamp. The old
  // clamp at `baseDue` silently hid over-allocations (race-condition
  // duplicate inserts, or a waiver granted AFTER allocations were applied),
  // breaking the SUM(allocations) = ledger.paid_amount invariant that
  // reconciliation reports rely on. Status flag still flips to PAID when
  // paid >= baseDue. (Audit H1.)
  await client.studentFeeLedger.update({
    where: { id: ledgerId },
    data: {
      paid_amount: paid,
      status,
    },
  })
}
