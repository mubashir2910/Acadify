import { z } from "zod"

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"] as const
export { BLOOD_GROUPS }

// Date of birth is sent as ISO string from the form; transformed to Date on the server
const optionalDateField = z.string().optional().nullable()

// Shared aadhaar validation (exactly 12 digits)
const aadhaarField = z
  .string()
  .min(12, "Aadhaar must be 12 digits")
  .max(12, "Aadhaar must be 12 digits")
  .regex(/^\d{12}$/, "Aadhaar must contain only digits")

// ─── Student: profile completion (mandatory fields for first login) ─────────
export const studentProfileCompleteSchema = z.object({
  aadhaar_number: aadhaarField,
  address: z.string().min(5, "Address is required (minimum 5 characters)"),
  father_name: z.string().min(1, "Father's name is required"),
  mother_name: z.string().min(1, "Mother's name is required"),
  // Optional fields
  house_name: z.string().optional().nullable(),
  blood_group: z.enum(BLOOD_GROUPS).optional().nullable(),
  profile_picture: z.string().url().optional().nullable(),
})

export type StudentProfileCompleteInput = z.infer<typeof studentProfileCompleteSchema>

// ─── Teacher: profile completion ────────────────────────────────────────────
export const teacherProfileCompleteSchema = z.object({
  aadhaar_number: aadhaarField,
  blood_group: z.enum(BLOOD_GROUPS).optional().nullable(),
  date_of_birth: optionalDateField,
  profile_picture: z.string().url().optional().nullable(),
})

export type TeacherProfileCompleteInput = z.infer<typeof teacherProfileCompleteSchema>

// ─── Admin: profile completion ──────────────────────────────────────────────
export const adminProfileCompleteSchema = z.object({
  date_of_birth: z.string().min(1, "Date of birth is required"),
  phone: z.string().min(7, "Phone number is required"),
  email: z.string().email("Enter a valid email address"),
  // Optional fields
  blood_group: z.enum(BLOOD_GROUPS).optional().nullable(),
  profile_picture: z.string().url().optional().nullable(),
})

export type AdminProfileCompleteInput = z.infer<typeof adminProfileCompleteSchema>

// ─── Student: profile update (edit mode) ────────────────────────────────────
export const studentProfileUpdateSchema = z.object({
  house_name: z.string().optional().nullable(),
  blood_group: z.enum(BLOOD_GROUPS).optional().nullable(),
  date_of_birth: optionalDateField,
  aadhaar_number: aadhaarField.optional(),
  address: z.string().min(5, "Address must be at least 5 characters").optional(),
  profile_picture: z.string().url().optional().nullable(),
  father_name: z.string().min(1, "Father's name is required").optional(),
  mother_name: z.string().min(1, "Mother's name is required").optional(),
})

export type StudentProfileUpdateInput = z.infer<typeof studentProfileUpdateSchema>

// ─── Teacher: profile update ────────────────────────────────────────────────
export const teacherProfileUpdateSchema = z.object({
  aadhaar_number: aadhaarField.optional(),
  blood_group: z.enum(BLOOD_GROUPS).optional().nullable(),
  date_of_birth: optionalDateField,
  profile_picture: z.string().url().optional().nullable(),
})

export type TeacherProfileUpdateInput = z.infer<typeof teacherProfileUpdateSchema>

// ─── Admin: profile update ──────────────────────────────────────────────────
export const adminProfileUpdateSchema = z.object({
  date_of_birth: optionalDateField,
  phone: z.string().min(7, "Phone number is required").optional(),
  email: z.string().email("Enter a valid email address").optional(),
  blood_group: z.enum(BLOOD_GROUPS).optional().nullable(),
  profile_picture: z.string().url().optional().nullable(),
})

export type AdminProfileUpdateInput = z.infer<typeof adminProfileUpdateSchema>
