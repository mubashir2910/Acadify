import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { accrueMonthlyLateFees } from "./fee-monthly-late-fee.service"
import { cached } from "@/lib/cache"
import { cacheKeys, cacheTags, serializeParams } from "@/lib/cache-keys"

export type AdminMonthlyBlockRow = {
  studentId: string
  studentName: string
  username: string
  class: string
  section: string
  rollNo: string
  year: number
  month: number
  label: string
  status: "PAID" | "PARTIAL" | "PENDING" | "OVERDUE" | "EMPTY"
  totalExpected: string
  totalWaiver: string
  totalPaid: string
  totalDue: string
  lateAmount: string
  latePaid: string
  lateWaiverAmount: string
  lateWaiverReason: string | null
  lateWaived: boolean
  lateFeeId: string | null
  dueDate: string | null
}

export type AdminMonthlyBlocksResult = {
  rows: AdminMonthlyBlockRow[]
  summary: {
    totalExpected: string
    totalCollected: string
    totalOutstanding: string
    totalWaived: string
    totalExpectedAnnual: string
    totalLateExpected: string
    totalLateWaived: string
    totalLateOutstanding: string
    totalLateCollected: string
    studentsCount: number
    monthsCount: number
  }
  pagination: {
    page: number
    pageSize: number
    totalStudents: number
    totalPages: number
  }
}

export type LedgerRowInBlock = {
  id: string
  fee_head_id: string | null
  head_name_snapshot: string
  head_category: string
  period_label: string
  expected: string
  waiver: string
  waiverReason: string | null
  paid: string
  status: string
}

export type MonthlyBlock = {
  year: number
  month: number
  label: string
  status: "PAID" | "PARTIAL" | "PENDING" | "OVERDUE" | "EMPTY"
  totalExpected: string
  totalWaiver: string
  totalPaid: string
  totalDue: string
  lateFee: {
    id: string
    amount: string
    paid: string
    waiverAmount: string
    waiverReason: string | null
    waived: boolean
  } | null
  dueDate: string | null
  ledgerRows: LedgerRowInBlock[]
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/**
 * Returns the student's fees grouped into 13 month blocks starting from the
 * current session's start date. Each block aggregates ledger rows + the
 * matching monthly late fee. Accrues late fees first so numbers are fresh.
 */
export async function getStudentMonthlyBlocks(
  schoolId: string,
  studentId: string,
  sessionId?: string,
): Promise<MonthlyBlock[]> {
  return cached(
    cacheKeys.feesMonthlyBlocks(schoolId, `student:${studentId}:${serializeParams({ sessionId })}`),
    { ttl: 60, tags: [cacheTags.fees(schoolId), cacheTags.feesStudent(studentId)] },
    () => computeStudentMonthlyBlocks(schoolId, studentId, sessionId),
  )
}

async function computeStudentMonthlyBlocks(
  schoolId: string,
  studentId: string,
  sessionId?: string,
): Promise<MonthlyBlock[]> {
  // Resolve session
  const session = sessionId
    ? await prisma.session.findFirst({ where: { id: sessionId, school_id: schoolId } })
    : await prisma.session.findFirst({
        where: { school_id: schoolId, is_current: true },
      }) ??
      (await prisma.session.findFirst({
        where: { school_id: schoolId },
        orderBy: { start_date: "desc" },
      }))
  if (!session) return []

  await accrueMonthlyLateFees(schoolId, { studentId, sessionId: session.id, actorUserId: null })

  const [ledgers, lateFees, waivers] = await Promise.all([
    prisma.studentFeeLedger.findMany({
      where: {
        school_id: schoolId,
        session_id: session.id,
        student_id: studentId,
        period_month: { not: null },
      },
      orderBy: [{ due_date: "asc" }],
    }),
    prisma.studentMonthlyLateFee.findMany({
      where: { school_id: schoolId, session_id: session.id, student_id: studentId },
    }),
    // Active waivers — used to surface reason on each affected ledger row.
    prisma.studentFeeWaiver.findMany({
      where: {
        school_id: schoolId,
        session_id: session.id,
        student_id: studentId,
        revoked_at: null,
      },
      select: {
        fee_head_id: true,
        period_year: true,
        period_month: true,
        reason: true,
      },
    }),
  ])

  // Collect EVERY non-revoked waiver reason per (head, period). Multiple
  // waives on the same scope each contribute their own line — the breakdown
  // modal renders them as one reason per row via `whitespace-pre-line`.
  const waiverReasonsByKey = new Map<string, string[]>()
  for (const w of waivers) {
    const key = `${w.fee_head_id}|${w.period_year}|${w.period_month}`
    const arr = waiverReasonsByKey.get(key) ?? []
    arr.push(w.reason)
    waiverReasonsByKey.set(key, arr)
  }

  // Build month axis: 12 months from session.start_date (Apr 2026 → Mar 2027)
  const start = new Date(session.start_date)
  const months: Array<{ year: number; month: number }> = []
  let y = start.getUTCFullYear()
  let m = start.getUTCMonth() + 1
  for (let i = 0; i < 12; i++) {
    months.push({ year: y, month: m })
    m += 1
    if (m > 12) {
      m = 1
      y += 1
    }
  }

  // Group ledger rows + late fees by year+month
  const byKey = new Map<string, MonthlyBlock>()
  const now = new Date()

  for (const m of months) {
    const key = `${m.year}-${m.month}`
    byKey.set(key, {
      year: m.year,
      month: m.month,
      label: `${MONTH_LABELS[m.month - 1]} ${m.year}`,
      status: "EMPTY",
      totalExpected: "0.00",
      totalWaiver: "0.00",
      totalPaid: "0.00",
      totalDue: "0.00",
      lateFee: null,
      dueDate: null,
      ledgerRows: [],
    })
  }

  for (const r of ledgers) {
    if (r.period_month == null) continue
    const key = `${r.period_year}-${r.period_month}`
    const block = byKey.get(key)
    if (!block) continue

    const reasons = r.fee_head_id
      ? waiverReasonsByKey.get(`${r.fee_head_id}|${r.period_year}|${r.period_month}`) ?? []
      : []
    block.ledgerRows.push({
      id: r.id,
      fee_head_id: r.fee_head_id,
      head_name_snapshot: r.head_name_snapshot,
      head_category: r.head_category,
      period_label: r.period_label,
      expected: r.expected_amount.toString(),
      waiver: r.waiver_amount.toString(),
      waiverReason: reasons.length > 0 ? reasons.join("\n") : null,
      paid: r.paid_amount.toString(),
      status: r.status,
    })

    // Aggregate totals
    const exp = new Prisma.Decimal(block.totalExpected).add(r.expected_amount)
    const wav = new Prisma.Decimal(block.totalWaiver).add(r.waiver_amount)
    const paid = new Prisma.Decimal(block.totalPaid).add(r.paid_amount)
    block.totalExpected = exp.toFixed(2)
    block.totalWaiver = wav.toFixed(2)
    block.totalPaid = paid.toFixed(2)
    if (!block.dueDate || (r.due_date && new Date(r.due_date) < new Date(block.dueDate))) {
      block.dueDate = new Date(r.due_date).toISOString().slice(0, 10)
    }
  }

  for (const lf of lateFees) {
    const key = `${lf.period_year}-${lf.period_month}`
    const block = byKey.get(key)
    if (!block) continue
    block.lateFee = {
      id: lf.id,
      amount: lf.amount.toString(),
      paid: lf.paid.toString(),
      waiverAmount: lf.waiver_amount.toString(),
      waiverReason: lf.waiver_reason,
      waived: lf.waived,
    }
  }

  // Derive status per block
  for (const block of byKey.values()) {
    if (block.ledgerRows.length === 0) {
      block.status = "EMPTY"
      block.totalDue = "0.00"
      continue
    }
    const baseExp = new Prisma.Decimal(block.totalExpected)
    const baseWav = new Prisma.Decimal(block.totalWaiver)
    const basePaid = new Prisma.Decimal(block.totalPaid)
    const baseDue = baseExp.minus(baseWav).minus(basePaid)

    let lateDue = new Prisma.Decimal(0)
    if (block.lateFee && !block.lateFee.waived) {
      lateDue = new Prisma.Decimal(block.lateFee.amount)
        .minus(block.lateFee.paid)
        .minus(block.lateFee.waiverAmount)
      if (lateDue.lt(0)) lateDue = new Prisma.Decimal(0)
    }

    const totalDue = (baseDue.lt(0) ? new Prisma.Decimal(0) : baseDue).add(lateDue)
    block.totalDue = totalDue.toFixed(2)

    const allLedgerStatuses = block.ledgerRows.map((r) => r.status)
    const allWaived = allLedgerStatuses.every((s) => s === "WAIVED")
    const allPaid = allLedgerStatuses.every((s) => s === "PAID" || s === "WAIVED")
    const someProgress = basePaid.gt(0)
    const overdue =
      block.dueDate != null && new Date(block.dueDate) < now && totalDue.gt(0)

    if (allWaived || (allPaid && lateDue.lte(0))) {
      block.status = "PAID"
    } else if (totalDue.lte(0)) {
      block.status = "PAID"
    } else if (someProgress) {
      block.status = "PARTIAL"
    } else if (overdue) {
      block.status = "OVERDUE"
    } else {
      block.status = "PENDING"
    }
  }

  return Array.from(byKey.values())
}

const MONTH_LABELS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/**
 * Admin view: one row per (student × month) across the whole school, optionally
 * scoped by class/section/status. Returns server-side aggregated totals so the
 * UI no longer relies on summing the paginated page (which truncated to 100 rows).
 */
export async function getSchoolMonthlyBlocks(
  schoolId: string,
  opts: {
    sessionId?: string
    class?: string
    section?: string
    status?: "PAID" | "PARTIAL" | "PENDING" | "OVERDUE"
    search?: string
    page?: number
    pageSize?: number
  } = {},
): Promise<AdminMonthlyBlocksResult> {
  return cached(
    cacheKeys.feesMonthlyBlocks(schoolId, `school:${serializeParams({ ...opts })}`),
    { ttl: 60, tags: [cacheTags.fees(schoolId)] },
    () => computeSchoolMonthlyBlocks(schoolId, opts),
  )
}

async function computeSchoolMonthlyBlocks(
  schoolId: string,
  opts: {
    sessionId?: string
    class?: string
    section?: string
    status?: "PAID" | "PARTIAL" | "PENDING" | "OVERDUE"
    search?: string
    page?: number
    pageSize?: number
  } = {},
): Promise<AdminMonthlyBlocksResult> {
  const page = Math.max(1, opts.page ?? 1)
  const pageSize = Math.min(100, Math.max(5, opts.pageSize ?? 25))

  // Resolve session (current if not given)
  const session = opts.sessionId
    ? await prisma.session.findFirst({ where: { id: opts.sessionId, school_id: schoolId } })
    : (await prisma.session.findFirst({
        where: { school_id: schoolId, is_current: true },
      })) ??
      (await prisma.session.findFirst({
        where: { school_id: schoolId },
        orderBy: { start_date: "desc" },
      }))
  if (!session) {
    return {
      rows: [],
      summary: {
        totalExpected: "0.00",
        totalCollected: "0.00",
        totalOutstanding: "0.00",
        totalWaived: "0.00",
        totalExpectedAnnual: "0.00",
        totalLateExpected: "0.00",
        totalLateWaived: "0.00",
        totalLateOutstanding: "0.00",
        totalLateCollected: "0.00",
        studentsCount: 0,
        monthsCount: 0,
      },
      pagination: { page, pageSize, totalStudents: 0, totalPages: 0 },
    }
  }

  // Accrue late fees for the scope before reading
  await accrueMonthlyLateFees(schoolId, {
    sessionId: session.id,
    class: opts.class,
    section: opts.section,
    actorUserId: null,
  })

  const studentWhere = {
    school_id: schoolId,
    status: "ACTIVE" as const,
    ...(opts.class ? { class: opts.class } : {}),
    ...(opts.section ? { section: opts.section } : {}),
    ...(opts.search
      ? {
          user: {
            OR: [
              { name: { contains: opts.search, mode: "insensitive" as const } },
              { username: { contains: opts.search, mode: "insensitive" as const } },
            ],
          },
        }
      : {}),
  }

  // 1) Count total students for the filter (drives pagination).
  const totalStudents = await prisma.student.count({ where: studentWhere })
  const totalPages = totalStudents === 0 ? 0 : Math.ceil(totalStudents / pageSize)

  // 2) Fetch ONLY the page of students for the table, plus per-page ledger/late fees.
  //    The aggregate query below pulls totals across the entire filtered set so the
  //    summary cards always reflect the full school regardless of pagination.
  const [students, allLedgers, allLateFees] = await Promise.all([
    prisma.student.findMany({
      where: studentWhere,
      select: {
        id: true,
        class: true,
        section: true,
        roll_no: true,
        user: { select: { name: true, username: true } },
      },
      orderBy: [{ class: "asc" }, { section: "asc" }, { roll_no: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    // Summary cards must always reflect the WHOLE school (for this session),
    // so the ledger + late-fee fetches deliberately ignore class/section/
    // search filters. `status: "ACTIVE"` still excludes dropped students
    // from the financial totals. The paged-row generation below uses the
    // separate `students` query, which IS filtered.
    prisma.studentFeeLedger.findMany({
      where: {
        school_id: schoolId,
        session_id: session.id,
        period_month: { not: null },
        student: { status: "ACTIVE" },
      },
      select: {
        student_id: true,
        period_year: true,
        period_month: true,
        expected_amount: true,
        waiver_amount: true,
        paid_amount: true,
        status: true,
        due_date: true,
      },
    }),
    prisma.studentMonthlyLateFee.findMany({
      where: {
        school_id: schoolId,
        session_id: session.id,
        student: { status: "ACTIVE" },
      },
      select: {
        id: true,
        student_id: true,
        period_year: true,
        period_month: true,
        amount: true,
        paid: true,
        waiver_amount: true,
        waiver_reason: true,
        waived: true,
      },
    }),
  ])

  // Month axis = 12 months from session.start_date
  const start = new Date(session.start_date)
  const months: Array<{ year: number; month: number; label: string }> = []
  let y = start.getUTCFullYear()
  let m = start.getUTCMonth() + 1
  for (let i = 0; i < 12; i++) {
    months.push({ year: y, month: m, label: `${MONTH_LABELS_SHORT[m - 1]} ${y}` })
    m += 1
    if (m > 12) {
      m = 1
      y += 1
    }
  }

  type Bucket = {
    expected: Prisma.Decimal
    waiver: Prisma.Decimal
    paid: Prisma.Decimal
    dueDate: Date | null
    rowStatuses: string[]
    lateAmount: Prisma.Decimal
    latePaid: Prisma.Decimal
    lateWaiver: Prisma.Decimal
    lateWaiverReason: string | null
    lateWaived: boolean
    lateId: string | null
  }
  function emptyBucket(): Bucket {
    return {
      expected: new Prisma.Decimal(0),
      waiver: new Prisma.Decimal(0),
      paid: new Prisma.Decimal(0),
      dueDate: null,
      rowStatuses: [],
      lateAmount: new Prisma.Decimal(0),
      latePaid: new Prisma.Decimal(0),
      lateWaiver: new Prisma.Decimal(0),
      lateWaiverReason: null,
      lateWaived: false,
      lateId: null,
    }
  }
  // Map<studentId, Map<"YYYY-MM", Bucket>>
  const byStudent = new Map<string, Map<string, Bucket>>()
  function getBucket(studentId: string, year: number, month: number): Bucket {
    if (!byStudent.has(studentId)) byStudent.set(studentId, new Map())
    const inner = byStudent.get(studentId)!
    const key = `${year}-${month}`
    if (!inner.has(key)) inner.set(key, emptyBucket())
    return inner.get(key)!
  }

  for (const r of allLedgers) {
    if (r.period_month == null) continue
    const b = getBucket(r.student_id, r.period_year, r.period_month)
    b.expected = b.expected.add(r.expected_amount)
    b.waiver = b.waiver.add(r.waiver_amount)
    b.paid = b.paid.add(r.paid_amount)
    b.rowStatuses.push(r.status)
    if (!b.dueDate || (r.due_date && new Date(r.due_date) < b.dueDate)) {
      b.dueDate = new Date(r.due_date)
    }
  }
  for (const lf of allLateFees) {
    const b = getBucket(lf.student_id, lf.period_year, lf.period_month)
    b.lateAmount = new Prisma.Decimal(lf.amount)
    b.latePaid = new Prisma.Decimal(lf.paid)
    b.lateWaiver = new Prisma.Decimal(lf.waiver_amount)
    b.lateWaiverReason = lf.waiver_reason
    b.lateWaived = lf.waived
    b.lateId = lf.id
  }

  const now = new Date()
  const pagedStudentIds = new Set(students.map((s) => s.id))

  // Helper: compute a month-block snapshot for a (student, month). Used for
  // both the visible rows (paged students) and global summary aggregation
  // (every student matching the filter).
  function computeBlock(studentId: string, year: number, month: number) {
    const b = byStudent.get(studentId)?.get(`${year}-${month}`) ?? emptyBucket()
    const baseDue = (() => {
      const d = b.expected.minus(b.waiver).minus(b.paid)
      return d.lt(0) ? new Prisma.Decimal(0) : d
    })()
    const lateDue = b.lateWaived
      ? new Prisma.Decimal(0)
      : (() => {
          const d = b.lateAmount.minus(b.latePaid).minus(b.lateWaiver)
          return d.lt(0) ? new Prisma.Decimal(0) : d
        })()
    const monthTotalDue = baseDue.add(lateDue)

    let status: AdminMonthlyBlockRow["status"]
    if (b.rowStatuses.length === 0) {
      status = "EMPTY"
    } else {
      const allWaived = b.rowStatuses.every((s) => s === "WAIVED")
      const allPaid = b.rowStatuses.every((s) => s === "PAID" || s === "WAIVED")
      const someProgress = b.paid.gt(0)
      const overdue = b.dueDate != null && b.dueDate < now && monthTotalDue.gt(0)
      if (allWaived || (allPaid && lateDue.lte(0))) status = "PAID"
      else if (monthTotalDue.lte(0)) status = "PAID"
      else if (someProgress) status = "PARTIAL"
      else if (overdue) status = "OVERDUE"
      else status = "PENDING"
    }
    return { b, baseDue, lateDue, monthTotalDue, status }
  }

  // Global summary aggregates: walk every (student × month) for the full
  // filtered set (not just the visible page), so totals never lie when admins
  // navigate pages or apply a class filter. Ledger (top row) and late-fee
  // (bottom row) metrics are tracked separately — late fees never roll into
  // the ledger totals.
  let totalExpected = new Prisma.Decimal(0)
  let totalCollected = new Prisma.Decimal(0)
  let totalOutstanding = new Prisma.Decimal(0)
  let totalWaived = new Prisma.Decimal(0)
  let totalExpectedAnnual = new Prisma.Decimal(0)
  let totalLateExpected = new Prisma.Decimal(0)
  let totalLateOutstanding = new Prisma.Decimal(0)
  let totalLateCollected = new Prisma.Decimal(0)
  let totalLateWaived = new Prisma.Decimal(0)

  for (const studentId of byStudent.keys()) {
    for (const monthEntry of months) {
      const { b, baseDue, lateDue, status } = computeBlock(
        studentId,
        monthEntry.year,
        monthEntry.month,
      )
      if (status === "EMPTY") continue
      // Status filter (if applied) gates the visible rows below but NOT
      // summary totals — admins want to see the full financial picture even
      // when filtering down to "Overdue only" etc.
      const dueSoFar = b.dueDate != null && b.dueDate <= now
      if (dueSoFar) {
        totalExpected = totalExpected.add(b.expected.minus(b.waiver))
        totalOutstanding = totalOutstanding.add(baseDue)
        totalWaived = totalWaived.add(b.waiver)
      }
      totalCollected = totalCollected.add(b.paid)
      totalLateExpected = totalLateExpected.add(b.lateAmount)
      totalLateCollected = totalLateCollected.add(b.latePaid)
      totalLateOutstanding = totalLateOutstanding.add(lateDue)
      // Waived bucket = whatever's neither paid nor outstanding. For partial
      // waivers this equals `waiver_amount`; for legacy rows flagged fully
      // waived but with waiver_amount=0, this falls back to `amount - paid`.
      // Computing as the remainder guarantees Expected = Waived + Collected + Outstanding.
      const effectiveLateWaiver = b.lateWaived && b.lateWaiver.eq(0)
        ? b.lateAmount.minus(b.latePaid)
        : b.lateWaiver
      totalLateWaived = totalLateWaived.add(
        effectiveLateWaiver.lt(0) ? new Prisma.Decimal(0) : effectiveLateWaiver,
      )
      totalExpectedAnnual = totalExpectedAnnual.add(b.expected.minus(b.waiver))
    }
  }

  // Visible rows: only for the paged students. Iterate month-outer,
  // student-inner so rows land in month-major order (April for all paged
  // students first, then May, etc.).
  const rows: AdminMonthlyBlockRow[] = []
  for (const monthEntry of months) {
    for (const student of students) {
      if (!pagedStudentIds.has(student.id)) continue
      const { b, monthTotalDue, status } = computeBlock(
        student.id,
        monthEntry.year,
        monthEntry.month,
      )
      if (opts.status && opts.status !== status) continue

      rows.push({
        studentId: student.id,
        studentName: student.user.name,
        username: student.user.username,
        class: student.class,
        section: student.section,
        rollNo: student.roll_no,
        year: monthEntry.year,
        month: monthEntry.month,
        label: monthEntry.label,
        status,
        totalExpected: b.expected.toFixed(2),
        totalWaiver: b.waiver.toFixed(2),
        totalPaid: b.paid.toFixed(2),
        totalDue: monthTotalDue.toFixed(2),
        lateAmount: b.lateAmount.toFixed(2),
        latePaid: b.latePaid.toFixed(2),
        lateWaiverAmount: b.lateWaiver.toFixed(2),
        lateWaiverReason: b.lateWaiverReason,
        lateWaived: b.lateWaived,
        lateFeeId: b.lateId,
        dueDate: b.dueDate ? b.dueDate.toISOString().slice(0, 10) : null,
      })
    }
  }

  return {
    rows,
    summary: {
      totalExpected: totalExpected.toFixed(2),
      totalCollected: totalCollected.toFixed(2),
      totalOutstanding: totalOutstanding.toFixed(2),
      totalWaived: totalWaived.toFixed(2),
      totalExpectedAnnual: totalExpectedAnnual.toFixed(2),
      totalLateExpected: totalLateExpected.toFixed(2),
      totalLateWaived: totalLateWaived.toFixed(2),
      totalLateOutstanding: totalLateOutstanding.toFixed(2),
      totalLateCollected: totalLateCollected.toFixed(2),
      studentsCount: totalStudents,
      monthsCount: months.length,
    },
    pagination: { page, pageSize, totalStudents, totalPages },
  }
}
