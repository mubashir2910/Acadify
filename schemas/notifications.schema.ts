import { z } from "zod"
import { cloudinaryUrlSchema } from "@/lib/attachment"

export const notificationAudienceEnum = z.enum(["ALL", "STUDENT", "TEACHER"])
export type NotificationAudience = z.infer<typeof notificationAudienceEnum>

export const attachmentTypeEnum = z.enum(["image", "pdf", "doc"])
export type AttachmentType = z.infer<typeof attachmentTypeEnum>

export const createNotificationSchema = z
  .object({
    // .trim() runs before min/max so a whitespace-only title/message is rejected
    // (and the stored value is already trimmed).
    title: z
      .string()
      .trim()
      .min(1, "Title is required")
      .max(150, "Title must be 150 characters or less"),
    message: z
      .string()
      .trim()
      .min(1, "Message is required")
      .max(5000, "Message must be 5000 characters or less"),
    target_audience: notificationAudienceEnum,
    // null means "all classes/sections"
    target_class: z.string().min(1).max(50).nullable(),
    target_section: z.string().min(1).max(50).nullable(),
    // Optional single attachment (PDF / image / Office doc)
    attachmentUrl: cloudinaryUrlSchema.nullable().optional(),
    attachmentType: attachmentTypeEnum.nullable().optional(),
    attachmentName: z.string().max(255).nullable().optional(),
  })
  // An attachment URL and its type must be provided together (or not at all).
  .refine((d) => (d.attachmentUrl ? !!d.attachmentType : !d.attachmentType), {
    message: "Attachment type is required with an attachment",
    path: ["attachmentType"],
  })
export type CreateNotificationInput = z.infer<typeof createNotificationSchema>

export const notificationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})
export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>

// ─── Response types ────────────────────────────────────────────────────────────

export interface NotificationItem {
  id: string
  title: string
  message: string
  target_audience: NotificationAudience
  target_class: string | null
  target_section: string | null
  created_at: string
  // null when the creator's account has been deleted
  created_by_name: string | null
  created_by_id: string | null
  is_read: boolean
  attachment_url: string | null
  attachment_type: string | null
  attachment_name: string | null
}

export interface NotificationListResponse {
  notifications: NotificationItem[]
  total: number
  page: number
  limit: number
}

export interface UnreadCountResponse {
  count: number
}
