import { prisma } from "@/lib/prisma";
import { CreateSchoolInput } from "@/schemas/school.schema";

const TRIAL_DAYS = 60

export async function createSchool(data: CreateSchoolInput) {
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS)

    const school = await prisma.school.create({
        data: {
            schoolCode: data.schoolCode,
            schoolName: data.schoolName,
            trial_ends_at: trialEndsAt,
        },
    })
    return school
}

export async function getSchools() {
    return prisma.school.findMany({
        select: {
            id: true,
            schoolName: true,
            schoolCode: true,
            subscription_status: true,
        },
        orderBy: { created_at: "desc" },
    })
}

export async function getSchoolByCode(schoolCode: string) {
    return prisma.school.findUnique({
        where: { schoolCode },
        select: {
            id: true,
            schoolName: true,
            schoolCode: true,
            subscription_status: true,
            trial_ends_at: true,
            subscription_ends_at: true,
            session_started_on: true,
        },
    })
}

export async function updateSessionStartDate(
    schoolCode: string,
    sessionStartedOn: string
) {
    const school = await prisma.school.findUnique({ where: { schoolCode } })
    if (!school) throw new Error("SCHOOL_NOT_FOUND")

    return prisma.school.update({
        where: { schoolCode },
        data: { session_started_on: new Date(sessionStartedOn + "T00:00:00.000Z") },
    })
}

export async function updateSubscription(
    schoolCode: string,
    status: "ACTIVE" | "SUSPENDED" | "CANCELLED",
    subscriptionEndsAt?: string | null
) {
    const school = await prisma.school.findUnique({ where: { schoolCode } })
    if (!school) throw new Error("SCHOOL_NOT_FOUND")

    return prisma.school.update({
        where: { schoolCode },
        data: {
            subscription_status: status,
            subscription_ends_at: status === "ACTIVE" && subscriptionEndsAt
                ? new Date(subscriptionEndsAt)
                : null,
        },
    })
}

export async function deleteSchool(schoolCode: string) {
    const school = await prisma.school.findUnique({
        where: { schoolCode },
        select: {
            id: true,
            students: { select: { user_id: true } },
            teachers: { select: { user_id: true } },
            schoolUsers: { where: { role: "ADMIN" }, select: { user_id: true } },
        },
    })
    if (!school) return null

    // Collect user IDs of school-specific accounts (students + teachers + admins)
    const userIds = [
        ...school.students.map((s) => s.user_id),
        ...school.teachers.map((t) => t.user_id),
        ...school.schoolUsers.map((su) => su.user_id),
    ]

    // Delete school + orphaned users atomically so partial failures can't leave orphaned records
    await prisma.$transaction([
        prisma.school.delete({ where: { schoolCode } }),
        ...(userIds.length > 0
            ? [prisma.user.deleteMany({ where: { id: { in: userIds } } })]
            : []),
    ])

    return school
}