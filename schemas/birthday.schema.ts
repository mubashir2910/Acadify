import { z } from "zod"

export const birthdayEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  profile_picture: z.string().nullable(),
  role: z.enum(["ADMIN", "TEACHER", "STUDENT"]),
  class: z.string().nullable(),
  section: z.string().nullable(),
})

export type BirthdayEntry = z.infer<typeof birthdayEntrySchema>
