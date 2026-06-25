import { z } from "zod"
import { parseDDMMYYYY } from "@/lib/date-parser"

// Schema for one row parsed from the CSV
export const csvStudentRowSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  email: z
    .string()
    .max(254)
    .email("Invalid email format")
    .optional()
    .or(z.literal("")),
  admission_no: z.string().max(30).optional().or(z.literal("")),
  roll_no: z.string().min(1, "Roll number is required").max(20, "Roll number is too long"),
  class: z.string().min(1, "Class is required").max(30, "Class is too long"),
  section: z.string().min(1, "Section is required").max(30, "Section is too long"),
  phone: z.string().max(20).optional().or(z.literal("")),
  guardian_name: z.string().min(1, "Guardian name is required").max(100, "Guardian name is too long"),
  guardian_phone: z.string().min(1, "Guardian phone is required").max(20, "Guardian phone is too long"),
  date_of_birth: z
    .string()
    .min(1, "Date of birth is required")
    .transform((val, ctx) => {
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
})

export type CsvStudentRow = z.infer<typeof csvStudentRowSchema>

// In-memory only — carries generated credentials, never sent to client
export interface EnrichedStudent {
  name: string
  email: string | null
  phone: string | null
  admission_no: string | null
  roll_no: string
  class: string
  section: string
  guardian_name: string
  guardian_phone: string
  date_of_birth: Date
  studentUniqueId: string    // stored as users.username; shown as Student ID
  temporaryPassword: string  // plain text — in-memory only, for PDF
  passwordHash: string       // stored in users.password_hash
}

export interface ImportSummary {
  total: number
  imported: number
  failed: number
}

export interface ClassSectionPdf {
  filename: string
  pdf: string // base64-encoded PDF
}

export interface ImportSuccessResponse {
  success: true
  summary: ImportSummary
  errors: []
  pdf: string // combined base64-encoded PDF
  classSectionPdfs: ClassSectionPdf[]
}

export interface ImportErrorResponse {
  success: false
  summary: ImportSummary
  errors: string[]
}

// ─── Single student creation (admin quick-add) ────────────────────────────────

export const createStudentSchema = z.object({
  name:           z.string().min(1, "Name is required").max(100, "Name is too long"),
  class:          z.string().min(1, "Class is required").max(30, "Class is too long"),
  section:        z.string().min(1, "Section is required").max(30, "Section is too long"),
  roll_no:        z.string().min(1, "Roll number is required").max(20, "Roll number is too long"),
  guardian_name:  z.string().min(1, "Guardian name is required").max(100, "Guardian name is too long"),
  guardian_phone: z.string().min(1, "Guardian phone is required").max(20, "Guardian phone is too long"),
  email:          z.string().max(254).email("Invalid email").optional().or(z.literal("")),
  phone:          z.string().max(20).optional().or(z.literal("")),
  admission_no:   z.string().max(30).optional().or(z.literal("")),
  date_of_birth:  z.string().optional().or(z.literal("")), // DD-MM-YYYY
})

export type CreateStudentInput = z.infer<typeof createStudentSchema>

export interface CreateStudentResult {
  username: string
  temporaryPassword: string
  name: string
  class: string
  section: string
  roll_no: string
}
