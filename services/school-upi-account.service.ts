import { prisma } from "@/lib/prisma"
import type {
  CreateUpiAccountInput,
  UpdateUpiAccountInput,
} from "@/schemas/school-upi-account.schema"
import { logFeeAction } from "./fee-audit.service"

const MAX_UPI_PER_SCHOOL = 5

export async function listUpiAccounts(schoolId: string) {
  return prisma.schoolUpiAccount.findMany({
    where: { school_id: schoolId },
    orderBy: [{ is_active: "desc" }, { created_at: "asc" }],
  })
}

export async function createUpiAccount(
  schoolId: string,
  actorUserId: string,
  data: CreateUpiAccountInput,
) {
  return prisma.$transaction(async (tx) => {
    const count = await tx.schoolUpiAccount.count({ where: { school_id: schoolId } })
    if (count >= MAX_UPI_PER_SCHOOL) {
      throw new Error("UPI_ACCOUNT_LIMIT_REACHED")
    }

    const created = await tx.schoolUpiAccount.create({
      data: {
        school_id: schoolId,
        upi_id: data.upiId.trim(),
        label: data.label?.trim() || null,
        is_active: count === 0,
      },
    })

    await logFeeAction({
      client: tx,
      schoolId,
      actorUserId,
      action: "CREATE_UPI_ACCOUNT",
      entityType: "UPI_ACCOUNT",
      entityId: created.id,
      newValue: { upi_id: created.upi_id, label: created.label, is_active: created.is_active },
    })

    return created
  })
}

export async function updateUpiAccount(
  schoolId: string,
  actorUserId: string,
  id: string,
  data: UpdateUpiAccountInput,
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.schoolUpiAccount.findFirst({
      where: { id, school_id: schoolId },
    })
    if (!existing) throw new Error("UPI_ACCOUNT_NOT_FOUND")

    const updated = await tx.schoolUpiAccount.update({
      where: { id },
      data: {
        ...(data.upiId !== undefined ? { upi_id: data.upiId.trim() } : {}),
        ...(data.label !== undefined ? { label: data.label?.trim() || null } : {}),
      },
    })

    await logFeeAction({
      client: tx,
      schoolId,
      actorUserId,
      action: "UPDATE_UPI_ACCOUNT",
      entityType: "UPI_ACCOUNT",
      entityId: id,
      previousValue: { upi_id: existing.upi_id, label: existing.label },
      newValue: { upi_id: updated.upi_id, label: updated.label },
    })

    return updated
  })
}

export async function deleteUpiAccount(
  schoolId: string,
  actorUserId: string,
  id: string,
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.schoolUpiAccount.findFirst({
      where: { id, school_id: schoolId },
    })
    if (!existing) throw new Error("UPI_ACCOUNT_NOT_FOUND")

    await tx.schoolUpiAccount.delete({ where: { id } })

    await logFeeAction({
      client: tx,
      schoolId,
      actorUserId,
      action: "DELETE_UPI_ACCOUNT",
      entityType: "UPI_ACCOUNT",
      entityId: id,
      previousValue: { upi_id: existing.upi_id, was_active: existing.is_active },
    })
  })
}

export async function setActiveUpiAccount(
  schoolId: string,
  actorUserId: string,
  id: string,
) {
  return prisma.$transaction(async (tx) => {
    const target = await tx.schoolUpiAccount.findFirst({
      where: { id, school_id: schoolId },
    })
    if (!target) throw new Error("UPI_ACCOUNT_NOT_FOUND")

    await tx.schoolUpiAccount.updateMany({
      where: { school_id: schoolId, is_active: true },
      data: { is_active: false },
    })
    const updated = await tx.schoolUpiAccount.update({
      where: { id },
      data: { is_active: true },
    })

    await logFeeAction({
      client: tx,
      schoolId,
      actorUserId,
      action: "SET_ACTIVE_UPI_ACCOUNT",
      entityType: "UPI_ACCOUNT",
      entityId: id,
      newValue: { upi_id: updated.upi_id },
    })
    return updated
  })
}
