import { prisma } from "@/lib/prisma"
import type {
  CreateBankAccountInput,
  UpdateBankAccountInput,
} from "@/schemas/school-bank-account.schema"
import { logFeeAction } from "./fee-audit.service"

const MAX_ACCOUNTS_PER_SCHOOL = 5

function mask(num: string): string {
  if (num.length <= 4) return "****"
  return `****${num.slice(-4)}`
}

export async function listBankAccounts(schoolId: string) {
  return prisma.schoolBankAccount.findMany({
    where: { school_id: schoolId },
    orderBy: [{ is_active: "desc" }, { created_at: "asc" }],
  })
}

export async function createBankAccount(
  schoolId: string,
  actorUserId: string,
  data: CreateBankAccountInput,
) {
  return prisma.$transaction(async (tx) => {
    const count = await tx.schoolBankAccount.count({ where: { school_id: schoolId } })
    if (count >= MAX_ACCOUNTS_PER_SCHOOL) {
      throw new Error("BANK_ACCOUNT_LIMIT_REACHED")
    }

    const created = await tx.schoolBankAccount.create({
      data: {
        school_id: schoolId,
        label: data.label?.trim() || null,
        account_holder: data.accountHolder.trim(),
        bank_name: data.bankName.trim(),
        account_number: data.accountNumber.trim(),
        ifsc: data.ifsc.trim().toUpperCase(),
        branch: data.branch?.trim() || null,
        account_type: data.accountType?.trim() || null,
        is_active: count === 0, // auto-activate the first one
      },
    })

    await logFeeAction({
      client: tx,
      schoolId,
      actorUserId,
      action: "CREATE_BANK_ACCOUNT",
      entityType: "BANK_ACCOUNT",
      entityId: created.id,
      newValue: {
        label: created.label,
        bank_name: created.bank_name,
        account_holder: created.account_holder,
        account_number_mask: mask(created.account_number),
        ifsc: created.ifsc,
        is_active: created.is_active,
      },
    })

    return created
  })
}

export async function updateBankAccount(
  schoolId: string,
  actorUserId: string,
  id: string,
  data: UpdateBankAccountInput,
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.schoolBankAccount.findFirst({
      where: { id, school_id: schoolId },
    })
    if (!existing) throw new Error("BANK_ACCOUNT_NOT_FOUND")

    const updated = await tx.schoolBankAccount.update({
      where: { id },
      data: {
        ...(data.label !== undefined ? { label: data.label?.trim() || null } : {}),
        ...(data.accountHolder !== undefined
          ? { account_holder: data.accountHolder.trim() }
          : {}),
        ...(data.bankName !== undefined ? { bank_name: data.bankName.trim() } : {}),
        ...(data.accountNumber !== undefined
          ? { account_number: data.accountNumber.trim() }
          : {}),
        ...(data.ifsc !== undefined ? { ifsc: data.ifsc.trim().toUpperCase() } : {}),
        ...(data.branch !== undefined ? { branch: data.branch?.trim() || null } : {}),
        ...(data.accountType !== undefined
          ? { account_type: data.accountType?.trim() || null }
          : {}),
      },
    })

    await logFeeAction({
      client: tx,
      schoolId,
      actorUserId,
      action: "UPDATE_BANK_ACCOUNT",
      entityType: "BANK_ACCOUNT",
      entityId: id,
      previousValue: {
        bank_name: existing.bank_name,
        account_number_mask: mask(existing.account_number),
        ifsc: existing.ifsc,
      },
      newValue: {
        bank_name: updated.bank_name,
        account_number_mask: mask(updated.account_number),
        ifsc: updated.ifsc,
      },
    })

    return updated
  })
}

export async function deleteBankAccount(
  schoolId: string,
  actorUserId: string,
  id: string,
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.schoolBankAccount.findFirst({
      where: { id, school_id: schoolId },
    })
    if (!existing) throw new Error("BANK_ACCOUNT_NOT_FOUND")

    await tx.schoolBankAccount.delete({ where: { id } })

    await logFeeAction({
      client: tx,
      schoolId,
      actorUserId,
      action: "DELETE_BANK_ACCOUNT",
      entityType: "BANK_ACCOUNT",
      entityId: id,
      previousValue: {
        bank_name: existing.bank_name,
        account_number_mask: mask(existing.account_number),
        was_active: existing.is_active,
      },
    })
  })
}

export async function setActiveBankAccount(
  schoolId: string,
  actorUserId: string,
  id: string,
) {
  return prisma.$transaction(async (tx) => {
    const target = await tx.schoolBankAccount.findFirst({
      where: { id, school_id: schoolId },
    })
    if (!target) throw new Error("BANK_ACCOUNT_NOT_FOUND")

    // Atomic: deactivate every account for this school then activate the chosen one.
    await tx.schoolBankAccount.updateMany({
      where: { school_id: schoolId, is_active: true },
      data: { is_active: false },
    })
    const updated = await tx.schoolBankAccount.update({
      where: { id },
      data: { is_active: true },
    })

    await logFeeAction({
      client: tx,
      schoolId,
      actorUserId,
      action: "SET_ACTIVE_BANK_ACCOUNT",
      entityType: "BANK_ACCOUNT",
      entityId: id,
      newValue: {
        bank_name: updated.bank_name,
        account_number_mask: mask(updated.account_number),
      },
    })
    return updated
  })
}
