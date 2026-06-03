import { prisma } from "@/lib/prisma"
import type {
  CreateQrCodeInput,
  UpdateQrCodeInput,
} from "@/schemas/school-qr-code.schema"
import { logFeeAction } from "./fee-audit.service"

const MAX_QR_PER_SCHOOL = 5

export async function listQrCodes(schoolId: string) {
  return prisma.schoolQrCode.findMany({
    where: { school_id: schoolId },
    orderBy: [{ is_active: "desc" }, { created_at: "asc" }],
    include: { bank_account: { select: { id: true, label: true, bank_name: true } } },
  })
}

async function assertBankAccountBelongsToSchool(
  schoolId: string,
  bankAccountId: string | null | undefined,
) {
  if (!bankAccountId) return
  const linked = await prisma.schoolBankAccount.findFirst({
    where: { id: bankAccountId, school_id: schoolId },
    select: { id: true },
  })
  if (!linked) throw new Error("BANK_ACCOUNT_NOT_FOUND")
}

export async function createQrCode(
  schoolId: string,
  actorUserId: string,
  data: CreateQrCodeInput,
) {
  await assertBankAccountBelongsToSchool(schoolId, data.bankAccountId ?? null)

  return prisma.$transaction(async (tx) => {
    const count = await tx.schoolQrCode.count({ where: { school_id: schoolId } })
    if (count >= MAX_QR_PER_SCHOOL) {
      throw new Error("QR_CODE_LIMIT_REACHED")
    }

    const created = await tx.schoolQrCode.create({
      data: {
        school_id: schoolId,
        image_url: data.imageUrl,
        caption: data.caption.trim(),
        label: data.label?.trim() || null,
        bank_account_id: data.bankAccountId ?? null,
        is_active: count === 0,
      },
    })

    await logFeeAction({
      client: tx,
      schoolId,
      actorUserId,
      action: "CREATE_QR_CODE",
      entityType: "QR_CODE",
      entityId: created.id,
      newValue: {
        caption: created.caption,
        label: created.label,
        image_url: created.image_url,
        bank_account_id: created.bank_account_id,
        is_active: created.is_active,
      },
    })

    return created
  })
}

export async function updateQrCode(
  schoolId: string,
  actorUserId: string,
  id: string,
  data: UpdateQrCodeInput,
) {
  if (data.bankAccountId !== undefined) {
    await assertBankAccountBelongsToSchool(schoolId, data.bankAccountId)
  }

  return prisma.$transaction(async (tx) => {
    const existing = await tx.schoolQrCode.findFirst({
      where: { id, school_id: schoolId },
    })
    if (!existing) throw new Error("QR_CODE_NOT_FOUND")

    const updated = await tx.schoolQrCode.update({
      where: { id },
      data: {
        ...(data.imageUrl !== undefined ? { image_url: data.imageUrl } : {}),
        ...(data.caption !== undefined ? { caption: data.caption.trim() } : {}),
        ...(data.label !== undefined ? { label: data.label?.trim() || null } : {}),
        ...(data.bankAccountId !== undefined
          ? { bank_account_id: data.bankAccountId ?? null }
          : {}),
      },
    })

    await logFeeAction({
      client: tx,
      schoolId,
      actorUserId,
      action: "UPDATE_QR_CODE",
      entityType: "QR_CODE",
      entityId: id,
      previousValue: {
        caption: existing.caption,
        image_url: existing.image_url,
        bank_account_id: existing.bank_account_id,
      },
      newValue: {
        caption: updated.caption,
        image_url: updated.image_url,
        bank_account_id: updated.bank_account_id,
      },
    })

    return updated
  })
}

export async function deleteQrCode(
  schoolId: string,
  actorUserId: string,
  id: string,
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.schoolQrCode.findFirst({
      where: { id, school_id: schoolId },
    })
    if (!existing) throw new Error("QR_CODE_NOT_FOUND")

    await tx.schoolQrCode.delete({ where: { id } })

    await logFeeAction({
      client: tx,
      schoolId,
      actorUserId,
      action: "DELETE_QR_CODE",
      entityType: "QR_CODE",
      entityId: id,
      previousValue: {
        caption: existing.caption,
        image_url: existing.image_url,
        was_active: existing.is_active,
      },
    })
  })
}

export async function setActiveQrCode(
  schoolId: string,
  actorUserId: string,
  id: string,
) {
  return prisma.$transaction(async (tx) => {
    const target = await tx.schoolQrCode.findFirst({
      where: { id, school_id: schoolId },
    })
    if (!target) throw new Error("QR_CODE_NOT_FOUND")

    await tx.schoolQrCode.updateMany({
      where: { school_id: schoolId, is_active: true },
      data: { is_active: false },
    })
    const updated = await tx.schoolQrCode.update({
      where: { id },
      data: { is_active: true },
    })

    await logFeeAction({
      client: tx,
      schoolId,
      actorUserId,
      action: "SET_ACTIVE_QR_CODE",
      entityType: "QR_CODE",
      entityId: id,
      newValue: { caption: updated.caption, image_url: updated.image_url },
    })
    return updated
  })
}
