import { z } from "zod"

// ─── Input Schemas ────────────────────────────────────────────────────────────

const classSectionSchema = z.object({
  class: z.string().trim().min(1, "Class is required").max(50, "Class too long"),
  section: z.string().trim().min(1, "Section is required").max(20, "Section too long"),
})

export const createGroupSchema = z.object({
  name: z.string().trim().min(1, "Group name is required").max(60, "Group name too long"),
  classes: z.array(classSectionSchema).default([]),
})

export const updateGroupSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  /** Classes to add to the group in this edit. */
  addClasses: z.array(classSectionSchema).optional(),
  /** Classes to remove from the group in this edit (must have zero entries). */
  removeClasses: z.array(classSectionSchema).optional(),
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

export interface TimetableGroupClassRow {
  class: string
  section: string
  entry_count: number
}

export interface TimetableGroupRow {
  id: string
  name: string
  classes: TimetableGroupClassRow[]
  period_count: number
  entry_count: number
}
