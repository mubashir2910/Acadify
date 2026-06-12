import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import {
  getPaymentConfig,
  getPublicPaymentConfig,
  upsertPaymentConfig,
} from "@/services/school-payment-config.service"
import { paymentConfigSchema } from "@/schemas/school-payment-config.schema"
import { feeWriteLimiter, expensiveReadLimiter, checkRateLimit } from "@/lib/rate-limit"

async function resolveSchoolByCode(schoolCode: string) {
  return prisma.school.findUnique({
    where: { schoolCode },
    select: { id: true },
  })
}

async function assertSchoolAccess(
  userId: string,
  role: string,
  schoolId: string,
): Promise<boolean> {
  if (role === "SUPER_ADMIN") return true
  if (role !== "ADMIN") return false
  const su = await prisma.schoolUser.findFirst({
    where: { user_id: userId, school_id: schoolId, role: "ADMIN", status: "ACTIVE" },
    select: { id: true },
  })
  return Boolean(su)
}

export async function GET(_req: Request, ctx: { params: Promise<{ schoolCode: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  const limited = await checkRateLimit(expensiveReadLimiter, `read:${session.user.id}`)
  if (limited) return limited

  const { schoolCode } = await ctx.params
  const school = await resolveSchoolByCode(schoolCode)
  if (!school) return NextResponse.json({ message: "School not found" }, { status: 404 })

  const role = session.user.role ?? ""

  // SUPER_ADMIN and ADMIN-of-school see the full config (minus secret values).
  // STUDENT only gets the public-safe view (no gateway secrets, no late-fee defaults).
  if (role === "SUPER_ADMIN" || (role === "ADMIN" && (await assertSchoolAccess(session.user.id, role, school.id)))) {
    const cfg = await getPaymentConfig(school.id)
    if (!cfg) return NextResponse.json({ paymentMode: null }, { status: 200 })
    // Redact secret before returning
    return NextResponse.json({
      ...cfg,
      gateway_key_secret_encrypted: cfg.gateway_key_secret_encrypted ? "***" : null,
      gateway_webhook_secret: cfg.gateway_webhook_secret ? "***" : null,
    })
  }

  if (role === "STUDENT") {
    // Verify student belongs to this school
    const student = await prisma.student.findFirst({
      where: { user_id: session.user.id, school_id: school.id, status: "ACTIVE" },
      select: { id: true },
    })
    if (!student) return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    const cfg = await getPublicPaymentConfig(school.id)
    return NextResponse.json(cfg ?? { paymentMode: null })
  }

  return NextResponse.json({ message: "Forbidden" }, { status: 403 })
}

export async function PUT(req: Request, ctx: { params: Promise<{ schoolCode: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  const limited = await checkRateLimit(feeWriteLimiter, `fee-write:${session.user.id}`)
  if (limited) return limited

  const { schoolCode } = await ctx.params
  const school = await resolveSchoolByCode(schoolCode)
  if (!school) return NextResponse.json({ message: "School not found" }, { status: 404 })

  const role = session.user.role ?? ""
  const allowed =
    role === "SUPER_ADMIN" ||
    (role === "ADMIN" && (await assertSchoolAccess(session.user.id, role, school.id)))
  if (!allowed) return NextResponse.json({ message: "Forbidden" }, { status: 403 })

  try {
    const body = await req.json()
    const validated = paymentConfigSchema.parse(body)
    const updated = await upsertPaymentConfig(school.id, session.user.id, validated)
    return NextResponse.json({
      ...updated,
      gateway_key_secret_encrypted: updated.gateway_key_secret_encrypted ? "***" : null,
      gateway_webhook_secret: updated.gateway_webhook_secret ? "***" : null,
    })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0].message }, { status: 422 })
    }
    console.error("[PUT /api/schools/[schoolCode]/payment-config]", error)
    return NextResponse.json({ message: "Failed to save payment config" }, { status: 500 })
  }
}
