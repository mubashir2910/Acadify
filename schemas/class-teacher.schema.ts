import { z } from "zod"

// Either a teacherId (existing teacher) or adminUserId (admin getting teaching
// duties for the first time). Exactly one must be provided.
const targetRefinement = (
  data: { teacherId?: string; adminUserId?: string },
  ctx: z.RefinementCtx,
) => {
  const hasTeacher = Boolean(data.teacherId)
  const hasAdmin = Boolean(data.adminUserId)
  if (hasTeacher === hasAdmin) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Provide either teacherId or adminUserId (not both)",
      path: ["teacherId"],
    })
  }
}

export const assignClassTeacherSchema = z
  .object({
    teacherId: z.string().uuid("Invalid teacher ID").optional(),
    adminUserId: z.string().uuid("Invalid admin user ID").optional(),
    class: z.string().min(1, "Class is required"),
    section: z.string().min(1, "Section is required"),
  })
  .superRefine(targetRefinement)

export type AssignClassTeacherInput = z.infer<typeof assignClassTeacherSchema>

export const changeClassTeacherSchema = z
  .object({
    class: z.string().min(1, "Class is required"),
    section: z.string().min(1, "Section is required"),
    teacherId: z.string().uuid("Invalid teacher ID").optional(),
    adminUserId: z.string().uuid("Invalid admin user ID").optional(),
  })
  .superRefine(targetRefinement)

export type ChangeClassTeacherInput = z.infer<typeof changeClassTeacherSchema>
