import { z } from "zod";
import { paymentConfigSchema } from "./school-payment-config.schema";

export const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/

const brandingFieldsSchema = z.object({
    logoUrl: z.string().url().max(500).optional().nullable(),
    motto: z.string().trim().max(200).optional().nullable(),
    brandColor: z
        .string()
        .regex(HEX_COLOR_REGEX, "Brand color must be a 6-digit hex like #16A34A")
        .optional(),
})

export const createSchoolSchema = z.object({
    schoolCode: z.string().min(2, "School Code must be atleast 2 character long").max(5, "School Code must not exceed 5 character long"),
    schoolName: z.string().min(2, "School Name must be atleast 2 character long").max(50, "School Name must not exceed 50 character long"),
}).merge(brandingFieldsSchema)

export type CreateSchoolInput = z.infer<typeof createSchoolSchema>;

// Server-side schema accepts an optional payment config block. Decoupled from
// the bare form schema so RHF Resolver types stay simple.
export const createSchoolApiSchema = createSchoolSchema.extend({
    paymentConfig: paymentConfigSchema.optional(),
})

export type CreateSchoolApiInput = z.infer<typeof createSchoolApiSchema>;

export const updateSchoolBrandingSchema = brandingFieldsSchema
export type UpdateSchoolBrandingInput = z.infer<typeof updateSchoolBrandingSchema>

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
