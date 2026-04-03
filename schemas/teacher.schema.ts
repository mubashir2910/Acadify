import { z } from "zod"
import { parseDDMMYYYY } from "@/lib/date-parser"

export const csvTeacherRowSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().min(1, "Email is required").email("Invalid email format"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  joining_date: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return null
      const d = new Date(val)
      return isNaN(d.getTime()) ? null : d
    }),
  date_of_birth: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((val, ctx) => {
      if (!val) return null
      try {
        return parseDDMMYYYY(val)
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "date_of_birth must be in DD-MM-YYYY or YYYY-MM-DD format",
        })
        return z.NEVER
      }
    }),
  blood_group: z.string().optional().or(z.literal("")).transform((val) => val || null),
})

export type ParsedTeacherRow = z.output<typeof csvTeacherRowSchema>

export interface EnrichedTeacher {
  name: string
  email: string
  phone: string
  joining_date: Date | null
  date_of_birth: Date | null
  blood_group: string | null
  teacherUniqueId: string // used as employee_id and username
  temporaryPassword: string
  passwordHash: string
}

export interface ImportSummary {
  total: number
  imported: number
  failed: number
}

export interface ImportTeachersResult {
  success: boolean
  summary: ImportSummary
  errors: string[]
  pdf?: string
}

// ─── Single teacher creation (admin quick-add) ────────────────────────────────

export const createTeacherSchema = z.object({
  name:          z.string().min(1, "Name is required"),
  email:         z.string().min(1, "Email is required").email("Invalid email"),
  phone:         z.string().min(10, "Phone must be at least 10 digits"),
  joining_date:  z.string().optional().or(z.literal("")), // YYYY-MM-DD
  date_of_birth: z.string().optional().or(z.literal("")), // DD-MM-YYYY
})

export type CreateTeacherInput = z.infer<typeof createTeacherSchema>

export interface CreateTeacherResult {
  employeeId: string
  temporaryPassword: string
  name: string
}
