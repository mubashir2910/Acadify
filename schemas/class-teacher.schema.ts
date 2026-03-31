import { z } from "zod"

export const assignClassTeacherSchema = z.object({
  teacherId: z.string().uuid("Invalid teacher ID"),
  class: z.string().min(1, "Class is required"),
  section: z.string().min(1, "Section is required"),
})

export type AssignClassTeacherInput = z.infer<typeof assignClassTeacherSchema>

export const changeClassTeacherSchema = z.object({
  class: z.string().min(1, "Class is required"),
  section: z.string().min(1, "Section is required"),
  newTeacherId: z.string().uuid("Invalid teacher ID"),
})

export type ChangeClassTeacherInput = z.infer<typeof changeClassTeacherSchema>
