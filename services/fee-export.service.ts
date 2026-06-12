import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

// Excel/Google Sheets treat a cell starting with =/+/-/@/\t/\r as a formula.
// A malicious student name like `=cmd|'/c calc'!A1` would otherwise execute
// when the admin opens the CSV. Prefixing with `'` makes the spreadsheet
// render the cell as literal text. (OWASP CSV-injection mitigation.)
const FORMULA_PREFIX = /^[=+\-@\t\r]/

function csvEscape(value: unknown): string {
  if (value == null) return ""
  let s = String(value)
  if (FORMULA_PREFIX.test(s)) {
    s = "'" + s
  }
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

// UTF-8 BOM so Excel renders non-ASCII names (Devanagari, accented Latin, etc.)
// correctly instead of mojibake.
const UTF8_BOM = "﻿"

function buildCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [headers.map(csvEscape).join(",")]
  for (const row of rows) {
    lines.push(row.map(csvEscape).join(","))
  }
  return UTF8_BOM + lines.join("\n")
}

export type ExportFilter = {
  sessionId?: string
  class?: string
  section?: string
  month?: number
  year?: number
}

export async function exportUnpaidStudents(schoolId: string, filter: ExportFilter = {}) {
  const where: Prisma.StudentFeeLedgerWhereInput = {
    school_id: schoolId,
    status: { in: ["PENDING", "PARTIAL", "OVERDUE"] },
    ...(filter.sessionId ? { session_id: filter.sessionId } : {}),
    ...(filter.month ? { period_month: filter.month } : {}),
    ...(filter.year ? { period_year: filter.year } : {}),
    student: {
      ...(filter.class ? { class: filter.class } : {}),
      ...(filter.section ? { section: filter.section } : {}),
    },
  }

  const rows = await prisma.studentFeeLedger.findMany({
    where,
    orderBy: [{ due_date: "asc" }],
    include: {
      student: {
        select: {
          admission_no: true,
          roll_no: true,
          class: true,
          section: true,
          guardian_name: true,
          guardian_phone: true,
          user: { select: { name: true, username: true } },
        },
      },
    },
  })

  const csvRows = rows.map((r) => {
    const expected = Number(r.expected_amount)
    const waiver = Number(r.waiver_amount)
    const paid = Number(r.paid_amount)
    const due = expected - waiver - paid
    return [
      r.student.user.username,
      r.student.user.name,
      r.student.class,
      r.student.section,
      r.student.roll_no,
      r.student.admission_no ?? "",
      r.student.guardian_name,
      r.student.guardian_phone,
      r.head_name_snapshot,
      r.period_label,
      r.due_date.toISOString().slice(0, 10),
      expected.toFixed(2),
      waiver.toFixed(2),
      paid.toFixed(2),
      due.toFixed(2),
      r.status,
    ]
  })

  return buildCsv(
    [
      "Student ID",
      "Student Name",
      "Class",
      "Section",
      "Roll No",
      "Admission No",
      "Guardian",
      "Guardian Phone",
      "Fee Head",
      "Period",
      "Due Date",
      "Expected",
      "Waiver",
      "Paid",
      "Outstanding",
      "Status",
    ],
    csvRows,
  )
}

export async function exportMonthlyCollections(schoolId: string, filter: ExportFilter = {}) {
  const where: Prisma.FeeTransactionWhereInput = {
    school_id: schoolId,
    status: "VERIFIED",
    ...(filter.year || filter.month
      ? {
          paid_at: {
            gte: new Date(
              Date.UTC(filter.year ?? new Date().getUTCFullYear(), (filter.month ?? 1) - 1, 1),
            ),
            lt: new Date(
              Date.UTC(
                filter.year ?? new Date().getUTCFullYear(),
                filter.month ?? 12,
                1,
              ),
            ),
          },
        }
      : {}),
    student: {
      ...(filter.class ? { class: filter.class } : {}),
      ...(filter.section ? { section: filter.section } : {}),
    },
  }

  const transactions = await prisma.feeTransaction.findMany({
    where,
    orderBy: { paid_at: "asc" },
    include: {
      student: {
        select: {
          class: true,
          section: true,
          roll_no: true,
          user: { select: { name: true, username: true } },
        },
      },
      verifiedBy: { select: { name: true } },
    },
  })

  const csvRows = transactions.map((t) => [
    t.receipt_no,
    t.paid_at.toISOString().slice(0, 10),
    t.student.user.username,
    t.student.user.name,
    t.student.class,
    t.student.section,
    t.student.roll_no,
    Number(t.amount).toFixed(2),
    t.method,
    t.external_txn_ref ?? "",
    t.verifiedBy?.name ?? "",
  ])

  return buildCsv(
    [
      "Receipt No",
      "Paid Date",
      "Student ID",
      "Student Name",
      "Class",
      "Section",
      "Roll No",
      "Amount",
      "Method",
      "Reference",
      "Verified By",
    ],
    csvRows,
  )
}

export async function exportPendingVerifications(schoolId: string) {
  const rows = await prisma.feeTransaction.findMany({
    where: { school_id: schoolId, status: "PENDING_VERIFICATION" },
    orderBy: { created_at: "asc" },
    include: {
      student: {
        select: {
          class: true,
          section: true,
          roll_no: true,
          user: { select: { name: true, username: true } },
        },
      },
    },
  })

  const csvRows = rows.map((t) => [
    t.receipt_no,
    t.created_at.toISOString(),
    t.student.user.username,
    t.student.user.name,
    t.student.class,
    t.student.section,
    Number(t.amount).toFixed(2),
    t.method,
    t.external_txn_ref ?? "",
    t.proof_url ?? "",
  ])

  return buildCsv(
    [
      "Receipt No",
      "Submitted At",
      "Student ID",
      "Student Name",
      "Class",
      "Section",
      "Amount",
      "Method",
      "Reference",
      "Proof URL",
    ],
    csvRows,
  )
}

export async function exportClassFeeReport(schoolId: string, filter: ExportFilter = {}) {
  if (!filter.class) throw new Error("CLASS_FILTER_REQUIRED")

  const ledgers = await prisma.studentFeeLedger.findMany({
    where: {
      school_id: schoolId,
      ...(filter.sessionId ? { session_id: filter.sessionId } : {}),
      student: {
        class: filter.class,
        ...(filter.section ? { section: filter.section } : {}),
      },
    },
    include: {
      student: {
        select: {
          roll_no: true,
          class: true,
          section: true,
          user: { select: { name: true, username: true } },
        },
      },
    },
  })

  // Aggregate ledger totals per student
  const byStudent = new Map<
    string,
    {
      name: string
      class: string
      section: string
      rollNo: string
      studentId: string
      expected: number
      waiver: number
      paid: number
      due: number
    }
  >()

  for (const r of ledgers) {
    const expected = Number(r.expected_amount)
    const waiver = Number(r.waiver_amount)
    const paid = Number(r.paid_amount)
    const due = expected - waiver - paid

    const key = r.student.user.username
    const prev = byStudent.get(key)
    if (prev) {
      prev.expected += expected
      prev.waiver += waiver
      prev.paid += paid
      prev.due += due
    } else {
      byStudent.set(key, {
        name: r.student.user.name,
        class: r.student.class,
        section: r.student.section,
        rollNo: r.student.roll_no,
        studentId: r.student_id,
        expected,
        waiver,
        paid,
        due,
      })
    }
  }

  // Sum outstanding monthly late fees per student for the same scope
  const studentIds = Array.from(byStudent.values()).map((s) => s.studentId)
  const lateFees = studentIds.length
    ? await prisma.studentMonthlyLateFee.findMany({
        where: {
          school_id: schoolId,
          student_id: { in: studentIds },
          ...(filter.sessionId ? { session_id: filter.sessionId } : {}),
        },
      })
    : []
  const lateOutstandingByStudent = new Map<string, number>()
  const lateWaivedByStudent = new Map<string, number>()
  for (const lf of lateFees) {
    const amount = Number(lf.amount)
    const paid = Number(lf.paid)
    const waiverAmt = Number(lf.waiver_amount)
    // Outstanding = amount - paid - waiver_amount, clamped at 0. Subtracting
    // waiver_amount is what fixes the bug where partially-waived late fees
    // (e.g. amount=100, paid=0, waiver=50) were over-reporting outstanding
    // as 100 instead of the correct 50. Fully waived rows (`lf.waived=true`)
    // count their full remaining amount as waived for the second column.
    const outstanding = lf.waived
      ? 0
      : Math.max(0, amount - paid - waiverAmt)
    lateOutstandingByStudent.set(
      lf.student_id,
      (lateOutstandingByStudent.get(lf.student_id) ?? 0) + outstanding,
    )

    // Late fee waived total — `waiver_amount` for partial waives, the full
    // unpaid portion for legacy rows flagged fully waived with no amount.
    const effectiveWaived = lf.waived && waiverAmt === 0
      ? Math.max(0, amount - paid)
      : waiverAmt
    lateWaivedByStudent.set(
      lf.student_id,
      (lateWaivedByStudent.get(lf.student_id) ?? 0) + effectiveWaived,
    )
  }

  const csvRows = Array.from(byStudent.entries()).map(([username, s]) => {
    const lateOutstanding = lateOutstandingByStudent.get(s.studentId) ?? 0
    const lateWaived = lateWaivedByStudent.get(s.studentId) ?? 0
    return [
      username,
      s.name,
      s.class,
      s.section,
      s.rollNo,
      s.expected.toFixed(2),
      s.waiver.toFixed(2),
      s.paid.toFixed(2),
      lateWaived.toFixed(2),
      lateOutstanding.toFixed(2),
      (s.due + lateOutstanding).toFixed(2),
    ]
  })

  return buildCsv(
    [
      "Student ID",
      "Student Name",
      "Class",
      "Section",
      "Roll No",
      "Expected",
      "Waiver",
      "Paid",
      "Late Fee Waived",
      "Late Fee Outstanding",
      "Total Outstanding",
    ],
    csvRows,
  )
}
