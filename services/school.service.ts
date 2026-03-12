import { prisma } from "@/lib/prisma";
import { CreateSchoolInput } from "@/schemas/school.schema";

export async function createSchool(data: CreateSchoolInput) {
    const school = await prisma.school.create({
        data: {
            schoolCode: data.schoolCode,
            schoolName: data.schoolName,
        },
    })
    return school
}

export async function getSchools() {
    return prisma.school.findMany({
        select: { id: true, schoolName: true, schoolCode: true },
        orderBy: { created_at: "desc" },
    })
}

export async function getSchoolByCode(schoolCode: string) {
    return prisma.school.findUnique({
        where: { schoolCode },
        select: { id: true, schoolName: true, schoolCode: true },
    })
}

export async function deleteSchool(schoolCode: string) {
    const school = await prisma.school.findUnique({
        where: { schoolCode },
        select: {
            id: true,
            students: { select: { user_id: true } },
            teachers: { select: { user_id: true } },
        },
    })
    if (!school) return null

    // Collect user IDs of school-specific accounts (students + teachers)
    const userIds = [
        ...school.students.map((s) => s.user_id),
        ...school.teachers.map((t) => t.user_id),
    ]

    // Delete the school — cascades to Student, SchoolUser, Teacher
    await prisma.school.delete({ where: { schoolCode } })

    // Clean up orphaned User records so usernames can be reused on re-import
    if (userIds.length > 0) {
        await prisma.user.deleteMany({ where: { id: { in: userIds } } })
    }

    return school
}