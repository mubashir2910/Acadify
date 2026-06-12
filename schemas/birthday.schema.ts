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

// Same shape as a today-birthday plus when-info, used for the "Upcoming this week" list.
export const upcomingBirthdayEntrySchema = birthdayEntrySchema.extend({
  birthday_date: z.string(), // YYYY-MM-DD of the upcoming occurrence (within this Mon–Sun week)
  day_label: z.string(),     // e.g. "Tuesday", "Friday"
  days_until: z.number().int().min(1).max(6),
})

export type UpcomingBirthdayEntry = z.infer<typeof upcomingBirthdayEntrySchema>
