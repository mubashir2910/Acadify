import { prisma } from "@/lib/prisma"
import type { PaymentConfigInput } from "@/schemas/school-payment-config.schema"
import { logFeeAction } from "./fee-audit.service"

export async function getPaymentConfig(schoolId: string) {
  return prisma.schoolPaymentConfig.findUnique({
    where: { school_id: schoolId },
  })
}

/**
 * Public-safe view of the payment config (excludes gateway secret) — what students
 * see when initiating a payment. Bank/UPI/QR come from the per-school active records
 * in SchoolBankAccount/SchoolUpiAccount/SchoolQrCode.
 */
export async function getPublicPaymentConfig(schoolId: string) {
  const [cfg, activeBank, activeUpi, activeQr] = await Promise.all([
    prisma.schoolPaymentConfig.findUnique({
      where: { school_id: schoolId },
      select: {
        payment_mode: true,
        currency: true,
        gateway_provider: true,
        gateway_key_id: true,
      },
    }),
    prisma.schoolBankAccount.findFirst({
      where: { school_id: schoolId, is_active: true },
      select: {
        id: true,
        label: true,
        account_holder: true,
        bank_name: true,
        account_number: true,
        ifsc: true,
        branch: true,
        account_type: true,
      },
    }),
    prisma.schoolUpiAccount.findFirst({
      where: { school_id: schoolId, is_active: true },
      select: { id: true, label: true, upi_id: true },
    }),
    prisma.schoolQrCode.findFirst({
      where: { school_id: schoolId, is_active: true },
      select: {
        id: true,
        label: true,
        caption: true,
        image_url: true,
        bank_account_id: true,
      },
    }),
  ])

  if (!cfg) return null
  return {
    payment_mode: cfg.payment_mode,
    currency: cfg.currency,
    gateway_provider: cfg.gateway_provider,
    gateway_key_id: cfg.gateway_key_id,
    active_bank_account: activeBank,
    active_upi_account: activeUpi,
    active_qr_code: activeQr,
  }
}

export async function upsertPaymentConfig(
  schoolId: string,
  actorUserId: string,
  data: PaymentConfigInput,
) {
  return prisma.$transaction(async (tx) => {
    const previous = await tx.schoolPaymentConfig.findUnique({
      where: { school_id: schoolId },
    })

    const updated = await tx.schoolPaymentConfig.upsert({
      where: { school_id: schoolId },
      create: {
        school_id: schoolId,
        payment_mode: data.paymentMode,
        currency: data.currency ?? "INR",
        gateway_provider: data.gatewayProvider ?? null,
        gateway_key_id: data.gatewayKeyId ?? null,
        gateway_key_secret_encrypted: data.gatewayKeySecret ?? null,
        gateway_webhook_secret: data.gatewayWebhookSecret ?? null,
        default_late_fee_enabled: data.defaultLateFeeEnabled ?? false,
        default_late_fee_type: data.defaultLateFeeType ?? null,
        default_late_fee_value: data.defaultLateFeeValue ?? null,
        default_late_fee_grace_day_of_month: data.defaultLateFeeGraceDayOfMonth ?? null,
        default_late_fee_frequency: data.defaultLateFeeFrequency ?? "MONTHLY",
      },
      update: {
        payment_mode: data.paymentMode,
        currency: data.currency ?? "INR",
        gateway_provider: data.gatewayProvider ?? null,
        gateway_key_id: data.gatewayKeyId ?? null,
        gateway_key_secret_encrypted: data.gatewayKeySecret ?? null,
        gateway_webhook_secret: data.gatewayWebhookSecret ?? null,
        default_late_fee_enabled: data.defaultLateFeeEnabled ?? false,
        default_late_fee_type: data.defaultLateFeeType ?? null,
        default_late_fee_value: data.defaultLateFeeValue ?? null,
        default_late_fee_grace_day_of_month: data.defaultLateFeeGraceDayOfMonth ?? null,
        default_late_fee_frequency: data.defaultLateFeeFrequency ?? "MONTHLY",
      },
    })

    await tx.school.update({
      where: { id: schoolId },
      data: { currency: data.currency ?? "INR" },
    })

    await logFeeAction({
      client: tx,
      schoolId,
      actorUserId,
      action: "UPSERT_PAYMENT_CONFIG",
      entityType: "PAYMENT_CONFIG",
      entityId: updated.id,
      previousValue: previous ? redactSecrets(previous) : null,
      newValue: redactSecrets(updated),
    })

    return updated
  })
}

function redactSecrets<T extends { gateway_key_secret_encrypted?: string | null; gateway_webhook_secret?: string | null }>(cfg: T) {
  return {
    ...cfg,
    gateway_key_secret_encrypted: cfg.gateway_key_secret_encrypted ? "***" : null,
    gateway_webhook_secret: cfg.gateway_webhook_secret ? "***" : null,
  }
}
