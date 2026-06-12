import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { expensiveReadLimiter, checkRateLimit } from "@/lib/rate-limit"

interface RouteParams {
  params: Promise<{ schoolCode: string }>
}

/**
 * Aggregated fee read for the super-admin school detail page. Returns:
 *  - branding (logo/motto/brand_color)
 *  - current payment config (mode, currency, gateway, late-fee policy)
 *  - all bank accounts, UPI IDs, QR codes (active flag included)
 *  - active fee structures
 *  - top-line counts (collected, outstanding, pending verifications)
 */
export async function GET(_req: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }
  const { schoolCode } = await params

  const school = await prisma.school.findUnique({
    where: { schoolCode },
    select: {
      id: true,
      schoolCode: true,
      schoolName: true,
      currency: true,
      logo_url: true,
      motto: true,
      brand_color: true,
      created_at: true,
    },
  })
  if (!school) return NextResponse.json({ message: "School not found" }, { status: 404 })

  const limited = await checkRateLimit(expensiveReadLimiter, `super-fees:${session.user.id}`)
  if (limited) return limited

  const [
    paymentConfig,
    bankAccounts,
    upiAccounts,
    qrCodes,
    structures,
    collectedAgg,
    pendingCount,
    ledgerAgg,
  ] = await Promise.all([
    prisma.schoolPaymentConfig.findUnique({
      where: { school_id: school.id },
      select: {
        payment_mode: true,
        currency: true,
        gateway_provider: true,
        gateway_key_id: true,
        default_late_fee_enabled: true,
        default_late_fee_type: true,
        default_late_fee_value: true,
        default_late_fee_grace_day_of_month: true,
        default_late_fee_frequency: true,
        updated_at: true,
      },
    }),
    prisma.schoolBankAccount.findMany({
      where: { school_id: school.id },
      orderBy: [{ is_active: "desc" }, { created_at: "asc" }],
    }),
    prisma.schoolUpiAccount.findMany({
      where: { school_id: school.id },
      orderBy: [{ is_active: "desc" }, { created_at: "asc" }],
    }),
    prisma.schoolQrCode.findMany({
      where: { school_id: school.id },
      orderBy: [{ is_active: "desc" }, { created_at: "asc" }],
      include: { bank_account: { select: { id: true, label: true, bank_name: true } } },
    }),
    prisma.feeStructure.findMany({
      where: { school_id: school.id },
      orderBy: [{ is_active: "desc" }, { class: "asc" }, { section: "asc" }, { version: "desc" }],
      include: {
        session: { select: { id: true, name: true, is_current: true } },
        fee_heads: {
          select: {
            id: true,
            name: true,
            amount: true,
            frequency: true,
            category: true,
            applied_months: {
              select: { period_year: true, period_month: true },
              orderBy: [{ period_year: "asc" }, { period_month: "asc" }],
            },
          },
        },
      },
    }),
    prisma.feeTransaction.aggregate({
      where: { school_id: school.id, status: "VERIFIED" },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.feeTransaction.count({
      where: { school_id: school.id, status: "PENDING_VERIFICATION" },
    }),
    prisma.studentFeeLedger.aggregate({
      where: { school_id: school.id, status: { in: ["PENDING", "PARTIAL", "OVERDUE"] } },
      _sum: { expected_amount: true, waiver_amount: true, paid_amount: true },
    }),
  ])

  const totalExpected = Number(ledgerAgg._sum.expected_amount ?? 0)
  const totalWaiver = Number(ledgerAgg._sum.waiver_amount ?? 0)
  const totalLedgerPaid = Number(ledgerAgg._sum.paid_amount ?? 0)
  const outstandingFromLedger = Math.max(0, totalExpected - totalWaiver - totalLedgerPaid)

  return NextResponse.json({
    school,
    paymentConfig,
    bankAccounts,
    upiAccounts,
    qrCodes,
    structures,
    counts: {
      collectedTotal: Number(collectedAgg._sum.amount ?? 0),
      transactionsVerified: collectedAgg._count._all,
      pendingVerifications: pendingCount,
      outstandingFromLedger,
    },
  })
}
