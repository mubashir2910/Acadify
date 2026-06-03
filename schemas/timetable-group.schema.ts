import { z } from "zod"

// ─── Input Schemas ────────────────────────────────────────────────────────────

const classSectionSchema = z.object({
  class: z.string().min(1, "Class is required").max(50, "Class too long"),
  section: z.string().min(1, "Section is required").max(20, "Section too long"),
})

export const createGroupSchema = z.object({
  name: z.string().min(1, "Group name is required").max(60, "Group name too long"),
  classes: z.array(classSectionSchema).default([]),
})

export const updateGroupSchema = z.object({
  name: z.string().min(1).max(60).optional(),
})

export const addClassesSchema = z.object({
  classes: z.array(classSectionSchema).min(1, "At least one class required"),
})

export const removeClassSchema = classSectionSchema

// ─── Types ────────────────────────────────────────────────────────────────────

export type ClassSectionInput = z.infer<typeof classSectionSchema>
export type CreateGroupInput = z.infer<typeof createGroupSchema>
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>
export type AddClassesInput = z.infer<typeof addClassesSchema>
export type RemoveClassInput = z.infer<typeof removeClassSchema>

// ─── Response Types ───────────────────────────────────────────────────────────

export interface TimetableGroupRow {
  id: string
  name: string
  classes: ClassSectionInput[]
  period_count: number
  entry_count: number
}
