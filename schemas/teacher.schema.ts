import { z } from "zod"

export const csvTeacherRowSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().min(1, "Email is required").email("Invalid email format"),
  joining_date: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return null
      const d = new Date(val)
      return isNaN(d.getTime()) ? null : d
    }),
})

export type ParsedTeacherRow = z.output<typeof csvTeacherRowSchema>

export interface EnrichedTeacher {
  name: string
  email: string
  joining_date: Date | null
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
