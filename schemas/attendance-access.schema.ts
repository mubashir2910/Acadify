import { z } from "zod"

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")

export const giveAttendanceAccessSchema = z.object({
  teacherId: z.string().uuid("Invalid teacher ID"),
  class:     z.string().min(1, "Class is required"),
  section:   z.string().min(1, "Section is required"),
  startDate: dateStringSchema,
  endDate:   dateStringSchema,
}).refine(
  (d) => d.startDate <= d.endDate,
  { message: "End date must be on or after start date", path: ["endDate"] }
)

export type GiveAttendanceAccessInput = z.infer<typeof giveAttendanceAccessSchema>

export interface AttendanceAccessGrant {
  id:        string
  class:     string
  section:   string
  startDate: string
  endDate:   string
  status:    "Active" | "Upcoming" | "Expired"
  teacher: {
    id:          string
    employee_id: string
    user:        { name: string }
  }
  grantedBy: { name: string }
}
