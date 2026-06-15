import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { CreateSchoolApiInput, PlatformStats, UpdateSchoolBrandingInput } from "@/schemas/school.schema";
import type { ChangeSchoolCodeInput } from "@/schemas/school-code-change.schema";
import { logFeeAction } from "@/services/fee-audit.service";
import { cached, invalidateTags } from "@/lib/cache";
import { cacheKeys, cacheTags } from "@/lib/cache-keys";

const TRIAL_DAYS = 60

export interface UserBranding {
    schoolName: string
    logoUrl: string | null
}

/**
 * Resolves the branding (name + logo) of the school the user belongs to.
 *
 * Used by the dashboard shell to co-brand the sidebar/header. Returns null for
 * SUPER_ADMIN (no single school) or on any lookup failure — the caller then
 * falls back to the default Acadify wordmark, so this can never break rendering.
 */
export async function getBrandingForUser(
    userId: string,
    role: string,
): Promise<UserBranding | null> {
    // Super admins manage every school, so there is no single school to brand with.
    if (role === "SUPER_ADMIN") return null

    try {
        // Resolve which school the user belongs to (cheap, indexed). We cache the
        // branding payload by schoolId so all users of a school share one entry and
        // a single branding edit invalidates it for everyone.
        const schoolId = await resolveUserSchoolId(userId, role)
        if (!schoolId) return null

        return await cached(
            cacheKeys.branding(schoolId),
            { ttl: 3600, tags: [cacheTags.branding(schoolId)] },
            async () => {
                const school = await prisma.school.findUnique({
                    where: { id: schoolId },
                    select: { schoolName: true, logo_url: true },
                })
                if (!school) return null
                return { schoolName: school.schoolName, logoUrl: school.logo_url }
            },
        )
    } catch {
        // Branding is non-critical: never let a failed lookup crash the dashboard.
        return null
    }
}

/** Resolves the active school_id for a user based on role. STUDENT → Student row;
 *  ADMIN/TEACHER → SchoolUser membership. Returns null if none found. */
async function resolveUserSchoolId(userId: string, role: string): Promise<string | null> {
    if (role === "STUDENT") {
        const student = await prisma.student.findFirst({
            where: { user_id: userId, status: "ACTIVE" },
            select: { school_id: true },
        })
        return student?.school_id ?? null
    }
    const schoolUser = await prisma.schoolUser.findFirst({
        where: { user_id: userId, status: "ACTIVE" },
        select: { school_id: true },
    })
    return schoolUser?.school_id ?? null
}

export async function createSchool(data: CreateSchoolApiInput) {
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS)

    try {
        const school = await prisma.$transaction(async (tx) => {
            const created = await tx.school.create({
                data: {
                    schoolCode: data.schoolCode,
                    schoolName: data.schoolName,
                    trial_ends_at: trialEndsAt,
                    currency: data.paymentConfig?.currency ?? "INR",
                    logo_url: data.logoUrl ?? null,
                    motto: data.motto?.trim() || null,
                    brand_color: data.brandColor ?? "#000000",
                },
            })

            if (data.paymentConfig) {
                const cfg = data.paymentConfig
                await tx.schoolPaymentConfig.create({
                    data: {
                        school_id: created.id,
                        payment_mode: cfg.paymentMode,
                        currency: cfg.currency ?? "INR",
                        gateway_provider: cfg.gatewayProvider ?? null,
                        gateway_key_id: cfg.gatewayKeyId ?? null,
                        // TODO: encrypt at rest — stored plaintext for Phase 1 dev only
                        gateway_key_secret_encrypted: cfg.gatewayKeySecret ?? null,
                        gateway_webhook_secret: cfg.gatewayWebhookSecret ?? null,
                        default_late_fee_enabled: cfg.defaultLateFeeEnabled ?? false,
                        default_late_fee_type: cfg.defaultLateFeeType ?? null,
                        default_late_fee_value:
                            cfg.defaultLateFeeValue != null
                                ? new Prisma.Decimal(cfg.defaultLateFeeValue.toFixed(2))
                                : null,
                        default_late_fee_grace_day_of_month: cfg.defaultLateFeeGraceDayOfMonth ?? null,
                        default_late_fee_frequency: cfg.defaultLateFeeFrequency ?? "MONTHLY",
                    },
                })
            }

            return created
        })
        await invalidateTags(cacheTags.platformStats(), cacheTags.platformSchools())
        return school
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            throw new Error("SCHOOL_CODE_EXISTS")
        }
        throw error
    }
}

export async function changeSchoolCode(
    actorUserId: string,
    data: ChangeSchoolCodeInput,
) {
    const trimmedCurrent = data.currentSchoolCode.trim()
    const trimmedNew = data.newSchoolCode.trim()

    if (trimmedCurrent === trimmedNew) {
        throw new Error("SCHOOL_CODE_UNCHANGED")
    }

    const school = await prisma.school.findUnique({
        where: { schoolCode: trimmedCurrent },
        select: { id: true },
    })
    if (!school) throw new Error("SCHOOL_NOT_FOUND")

    try {
        const result = await prisma.$transaction(async (tx) => {
            const updated = await tx.school.update({
                where: { id: school.id },
                data: { schoolCode: trimmedNew },
                select: { id: true, schoolCode: true, schoolName: true },
            })

            await logFeeAction({
                client: tx,
                schoolId: school.id,
                actorUserId,
                action: "UPDATE_SCHOOL_BRANDING",
                entityType: "SCHOOL_BRANDING",
                entityId: school.id,
                previousValue: { schoolCode: trimmedCurrent },
                newValue: { schoolCode: updated.schoolCode },
                reason: "School code changed",
            })

            return updated
        })
        await invalidateTags(
            cacheTags.schoolByCode(trimmedCurrent),
            cacheTags.branding(school.id),
            cacheTags.platformSchools(),
        )
        return result
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            throw new Error("SCHOOL_CODE_EXISTS")
        }
        throw error
    }
}

export async function updateSchoolBranding(
    schoolCode: string,
    actorUserId: string,
    data: UpdateSchoolBrandingInput,
) {
    const school = await prisma.school.findUnique({
        where: { schoolCode },
        select: { id: true, logo_url: true, motto: true, brand_color: true },
    })
    if (!school) throw new Error("SCHOOL_NOT_FOUND")

    const next = {
        logo_url: data.logoUrl !== undefined ? data.logoUrl : school.logo_url,
        motto: data.motto !== undefined ? (data.motto?.trim() || null) : school.motto,
        brand_color: data.brandColor ?? school.brand_color,
    }

    const updated = await prisma.$transaction(async (tx) => {
        const row = await tx.school.update({
            where: { id: school.id },
            data: next,
            select: { id: true, schoolCode: true, schoolName: true, logo_url: true, motto: true, brand_color: true },
        })

        await logFeeAction({
            client: tx,
            schoolId: school.id,
            actorUserId,
            action: "UPDATE_SCHOOL_BRANDING",
            entityType: "SCHOOL_BRANDING",
            entityId: school.id,
            previousValue: {
                logo_url: school.logo_url,
                motto: school.motto,
                brand_color: school.brand_color,
            },
            newValue: {
                logo_url: row.logo_url,
                motto: row.motto,
                brand_color: row.brand_color,
            },
        })

        return row
    })

    await invalidateTags(
        cacheTags.branding(school.id),
        cacheTags.schoolByCode(schoolCode),
    )

    return updated
}

export async function getSchools() {
    return cached(
        cacheKeys.platformSchools(),
        { ttl: 120, tags: [cacheTags.platformSchools()] },
        () =>
            prisma.school.findMany({
                select: {
                    id: true,
                    schoolName: true,
                    schoolCode: true,
                    subscription_status: true,
                },
                orderBy: { created_at: "desc" },
            })
    )
}

export async function getSchoolByCode(schoolCode: string) {
    return cached(
        cacheKeys.schoolByCode(schoolCode),
        { ttl: 3600, tags: [cacheTags.schoolByCode(schoolCode)] },
        () =>
            prisma.school.findUnique({
                where: { schoolCode },
                select: {
                    id: true,
                    schoolName: true,
                    schoolCode: true,
                    subscription_status: true,
                    trial_ends_at: true,
                    subscription_ends_at: true,
                    session_started_on: true,
                    logo_url: true,
                    motto: true,
                    brand_color: true,
                },
            })
    )
}

export async function updateSessionStartDate(
    schoolCode: string,
    sessionStartedOn: string
) {
    const school = await prisma.school.findUnique({ where: { schoolCode } })
    if (!school) throw new Error("SCHOOL_NOT_FOUND")

    const updated = await prisma.school.update({
        where: { schoolCode },
        data: { session_started_on: new Date(sessionStartedOn + "T00:00:00.000Z") },
    })

    // session_started_on feeds both the school profile and attendance-rate math.
    await invalidateTags(
        cacheTags.schoolByCode(schoolCode),
        cacheTags.schoolStats(school.id),
        cacheTags.attendance(school.id),
    )

    return updated
}

export async function updateSubscription(
    schoolCode: string,
    status: "ACTIVE" | "SUSPENDED" | "CANCELLED",
    subscriptionEndsAt: string | null | undefined,
    actorUserId: string,
    reason?: string | null,
) {
    const school = await prisma.school.findUnique({ where: { schoolCode } })
    if (!school) throw new Error("SCHOOL_NOT_FOUND")

    const newEndsAt =
        status === "ACTIVE" && subscriptionEndsAt
            ? new Date(subscriptionEndsAt)
            : null

    // Atomically apply the change AND record an immutable history entry so
    // super-admins can later audit who flipped the status and when.
    const [updated] = await prisma.$transaction([
        prisma.school.update({
            where: { schoolCode },
            data: {
                subscription_status: status,
                subscription_ends_at: newEndsAt,
            },
        }),
        prisma.schoolSubscriptionHistory.create({
            data: {
                school_id: school.id,
                previous_status: school.subscription_status,
                new_status: status,
                previous_ends_at: school.subscription_ends_at,
                new_ends_at: newEndsAt,
                changed_by: actorUserId,
                reason: reason?.trim() || null,
            },
        }),
    ])

    await invalidateTags(
        cacheTags.subscription(school.id),
        cacheTags.schoolByCode(schoolCode),
        cacheTags.platformSchools(),
        cacheTags.platformStats(),
    )

    return updated
}

export async function getSubscriptionHistory(schoolCode: string) {
    const school = await prisma.school.findUnique({
        where: { schoolCode },
        select: { id: true },
    })
    if (!school) throw new Error("SCHOOL_NOT_FOUND")

    return cached(
        cacheKeys.subscriptionHistory(school.id),
        { ttl: 600, tags: [cacheTags.subscription(school.id)] },
        () =>
            prisma.schoolSubscriptionHistory.findMany({
                where: { school_id: school.id },
                orderBy: { created_at: "desc" },
                include: {
                    changedBy: { select: { id: true, name: true, role: true } },
                },
            })
    )
}

export async function getSchoolStats(schoolCode: string) {
    const school = await prisma.school.findUnique({
        where: { schoolCode },
        select: {
            id: true,
            created_at: true,
            session_started_on: true,
        },
    })
    if (!school) throw new Error("SCHOOL_NOT_FOUND")

    return cached(
        cacheKeys.schoolStats(school.id),
        { ttl: 600, tags: [cacheTags.schoolStats(school.id)] },
        () => computeSchoolStats(school),
    )
}

async function computeSchoolStats(school: {
    id: string
    created_at: Date
    session_started_on: Date | null
}) {
    const [
        studentTotal,
        studentActive,
        teacherTotal,
        teacherActive,
        adminCount,
        pendingFeeTransactions,
    ] = await Promise.all([
        prisma.student.count({ where: { school_id: school.id } }),
        prisma.student.count({ where: { school_id: school.id, status: "ACTIVE" } }),
        prisma.teacher.count({ where: { school_id: school.id } }),
        prisma.teacher.count({ where: { school_id: school.id, status: "ACTIVE" } }),
        prisma.schoolUser.count({
            where: { school_id: school.id, role: "ADMIN", status: "ACTIVE" },
        }),
        prisma.feeTransaction.count({
            where: { school_id: school.id, status: "PENDING_VERIFICATION" },
        }),
    ])

    const daysSinceCreated = Math.max(
        1,
        Math.floor((Date.now() - school.created_at.getTime()) / 86_400_000),
    )

    return {
        students: { total: studentTotal, active: studentActive },
        teachers: { total: teacherTotal, active: teacherActive },
        admins: adminCount,
        pendingFeeVerifications: pendingFeeTransactions,
        daysSinceCreated,
        sessionStartedOn: school.session_started_on,
    }
}

export async function getPlatformStats(): Promise<PlatformStats> {
    return cached(
        cacheKeys.platformStats(),
        { ttl: 600, tags: [cacheTags.platformStats()] },
        computePlatformStats,
    )
}

async function computePlatformStats(): Promise<PlatformStats> {
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setUTCMonth(sixMonthsAgo.getUTCMonth() - 5)
    sixMonthsAgo.setUTCDate(1)
    sixMonthsAgo.setUTCHours(0, 0, 0, 0)

    // Build 6-month label array (current month + 5 prior)
    const months: string[] = []
    for (let i = 5; i >= 0; i--) {
        const d = new Date()
        d.setUTCMonth(d.getUTCMonth() - i)
        months.push(
            d.toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" })
        )
    }

    const [[totalSchools, totalStudents, totalTeachers, totalAdmins], schoolsRaw] =
        await Promise.all([
            prisma.$transaction([
                prisma.school.count(),
                prisma.student.count(),
                prisma.teacher.count(),
                prisma.schoolUser.count({ where: { role: "ADMIN" } }),
            ]),
            prisma.school.findMany({
                select: { subscription_status: true, created_at: true },
            }),
        ])

    // Subscription breakdown
    const subscriptionBreakdown = { ACTIVE: 0, TRIAL: 0, SUSPENDED: 0, CANCELLED: 0 }
    for (const s of schoolsRaw) {
        const key = s.subscription_status as keyof typeof subscriptionBreakdown
        if (key in subscriptionBreakdown) subscriptionBreakdown[key]++
    }

    // Schools growth (last 6 months)
    const growthMap = new Map<string, number>(months.map((m) => [m, 0]))
    for (const s of schoolsRaw) {
        const label = new Date(s.created_at).toLocaleString("en-US", {
            month: "short",
            year: "numeric",
            timeZone: "UTC",
        })
        if (growthMap.has(label)) {
            growthMap.set(label, (growthMap.get(label) ?? 0) + 1)
        }
    }
    const schoolsGrowth = months.map((month) => ({ month, count: growthMap.get(month) ?? 0 }))

    return {
        totalSchools,
        totalStudents,
        totalTeachers,
        totalAdmins,
        subscriptionBreakdown,
        schoolsGrowth,
        userDistribution: [
            { name: "Students", value: totalStudents },
            { name: "Teachers", value: totalTeachers },
            { name: "Admins", value: totalAdmins },
        ],
    }
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

    await invalidateTags(
        cacheTags.platformStats(),
        cacheTags.platformSchools(),
        cacheTags.schoolByCode(schoolCode),
        cacheTags.schoolStats(school.id),
        cacheTags.branding(school.id),
        cacheTags.subscription(school.id),
    )

    return school
}