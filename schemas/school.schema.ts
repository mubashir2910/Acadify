import { z} from "zod";

export const createSchoolSchema = z.object({
    schoolCode: z.string().min(2, "School Code must be atleast 2 character long").max(5, "School Code must not exceed 5 character long"),
    schoolName: z.string().min(2, "School Name must be atleast 2 character long").max(50, "School Name must not exceed 50 character long"),
})

export type CreateSchoolInput = z.infer<typeof createSchoolSchema>;

export type PlatformStats = {
    totalSchools: number
    totalStudents: number
    totalTeachers: number
    totalAdmins: number
    subscriptionBreakdown: {
        ACTIVE: number
        TRIAL: number
        SUSPENDED: number
        CANCELLED: number
    }
    schoolsGrowth: Array<{ month: string; count: number }>
    userDistribution: Array<{ name: string; value: number }>
}